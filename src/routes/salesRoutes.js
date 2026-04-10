import express from "express";
import { pool } from "../config/db.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

function gerarCodigoCashback() {
  const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CB${Date.now().toString().slice(-6)}${aleatorio}`;
}

function amanhaIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function calcularCashback(totalFinal) {
  const total = Number(totalFinal || 0);

  if (total >= 199.9) return { percentual: 15, valor: Number((total * 0.15).toFixed(2)) };
  if (total >= 100) return { percentual: 10, valor: Number((total * 0.1).toFixed(2)) };
  if (total >= 50) return { percentual: 5, valor: Number((total * 0.05).toFixed(2)) };

  return { percentual: 0, valor: 0 };
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        v.id,
        v.usuario_id,
        v.produto_id,
        v.cliente_id,
        p.nome AS produto_nome,
        COALESCE(c.nome, 'Sem cliente') AS cliente_nome,
        v.quantidade,
        v.valor_unitario,
        v.valor_total,
        v.created_at
      FROM vendas v
      JOIN produtos p ON p.id = v.produto_id
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.usuario_id = $1
      ORDER BY v.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar vendas:", err);
    res.status(500).json({ error: "Erro ao buscar vendas" });
  }
});

router.post("/pdv/finalizar", authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      clienteId,
      itens,
      formaPagamento,
      codigoCashback,
      descontoPrimeiraCompra
    } = req.body;

    if (!clienteId) {
      client.release();
      return res.status(400).json({ error: "Cliente é obrigatório" });
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      client.release();
      return res.status(400).json({ error: "Carrinho vazio" });
    }

    const formasValidas = ["dinheiro", "pix", "debito", "credito"];
    if (!formasValidas.includes(String(formaPagamento || "").toLowerCase())) {
      client.release();
      return res.status(400).json({ error: "Forma de pagamento inválida" });
    }

    await client.query("BEGIN");

    const clienteResult = await client.query(
      `
      SELECT id, nome
      FROM clientes
      WHERE id = $1
        AND usuario_id = $2
      `,
      [Number(clienteId), req.user.id]
    );

    if (clienteResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    const historico = await client.query(
      `
      SELECT COUNT(*)::int AS total
      FROM vendas
      WHERE cliente_id = $1
        AND usuario_id = $2
      `,
      [Number(clienteId), req.user.id]
    );

    const primeiraCompra = Number(historico.rows[0]?.total || 0) === 0;

    let subtotal = 0;
    let ultimaVenda = null;
    const itensProcessados = [];

    for (const item of itens) {
      const produtoId = Number(item.produtoId);
      const qtd = Number(item.quantidade);

      if (!produtoId || !qtd || qtd <= 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ error: "Item inválido no carrinho" });
      }

      const produtoResult = await client.query(
        `
        SELECT id, nome, preco, estoque
        FROM produtos
        WHERE id = $1
          AND usuario_id = $2
        FOR UPDATE
        `,
        [produtoId, req.user.id]
      );

      if (produtoResult.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      const produto = produtoResult.rows[0];
      const estoqueAtual = Number(produto.estoque || 0);

      if (estoqueAtual < qtd) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ error: `Estoque insuficiente para ${produto.nome}` });
      }

      const valorUnitario = Number(produto.preco || 0);
      const valorTotal = Number((valorUnitario * qtd).toFixed(2));

      subtotal += valorTotal;

      itensProcessados.push({
        produtoId: produto.id,
        nomeProduto: produto.nome,
        quantidade: qtd,
        valorUnitario,
        valorTotal,
        novoEstoque: estoqueAtual - qtd
      });
    }

    subtotal = Number(subtotal.toFixed(2));

    const descontoPercentual = primeiraCompra ? Number(descontoPrimeiraCompra || 0) : 0;
    const descontoPrimeiraCompraValor = Number((subtotal * (descontoPercentual / 100)).toFixed(2));

    let descontoCashbackValor = 0;
    let cupomUsado = null;

    if (codigoCashback && String(codigoCashback).trim() !== "") {
      const codigo = String(codigoCashback).trim().toUpperCase();

      const cashbackResult = await client.query(
        `
        SELECT cc.*
        FROM cupons_cashback cc
        JOIN vendas v ON v.id = cc.venda_id
        WHERE UPPER(cc.codigo) = $1
          AND v.usuario_id = $2
        LIMIT 1
        FOR UPDATE
        `,
        [codigo, req.user.id]
      );

      if (cashbackResult.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({ error: "Cupom cashback não encontrado" });
      }

      const cupom = cashbackResult.rows[0];

      if (cupom.status === "usado") {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ error: "Cupom cashback já foi usado" });
      }

      if (Number(cupom.cliente_id) !== Number(clienteId)) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ error: "Esse cupom pertence a outro cliente" });
      }

      const agora = new Date();
      const validoAPartir = new Date(cupom.valido_a_partir_de);

      if (agora < validoAPartir) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ error: "Cupom ainda não está válido" });
      }

      descontoCashbackValor = Number(cupom.valor || 0);
      cupomUsado = cupom;
    }

    const descontoValor = Number((descontoPrimeiraCompraValor + descontoCashbackValor).toFixed(2));
    const totalFinal = Number((subtotal - descontoValor).toFixed(2));
    const cashbackGerado = calcularCashback(totalFinal);

    for (const item of itensProcessados) {
      const vendaResult = await client.query(
        `
        INSERT INTO vendas (
          usuario_id,
          produto_id,
          cliente_id,
          quantidade,
          valor_unitario,
          valor_total
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
          req.user.id,
          item.produtoId,
          Number(clienteId),
          item.quantidade,
          item.valorUnitario,
          item.valorTotal
        ]
      );

      ultimaVenda = vendaResult.rows[0];

      await client.query(
        `
        UPDATE produtos
        SET estoque = $1
        WHERE id = $2
          AND usuario_id = $3
        `,
        [item.novoEstoque, item.produtoId, req.user.id]
      );

      await client.query(
        `
        INSERT INTO movimentacoes (
          usuario_id,
          produto_id,
          tipo,
          quantidade,
          motivo
        )
        VALUES ($1, $2, 'saida', $3, $4)
        `,
        [req.user.id, item.produtoId, item.quantidade, `Venda #${ultimaVenda.id}`]
      );
    }

    await client.query(
      `
      INSERT INTO financeiro (
        usuario_id,
        tipo,
        descricao,
        valor,
        categoria
      )
      VALUES ($1, 'entrada', $2, $3, $4)
      `,
      [
        req.user.id,
        `Venda - ${formaPagamento}`,
        totalFinal,
        `Vendas/${formaPagamento}`
      ]
    );

    if (cupomUsado) {
      await client.query(
        `
        UPDATE cupons_cashback
        SET status = 'usado', usado_em = NOW()
        WHERE id = $1
        `,
        [cupomUsado.id]
      );
    }

    let cupomGerado = null;

    if (cashbackGerado.valor > 0 && ultimaVenda) {
      const codigo = gerarCodigoCashback();

      const cupomResult = await client.query(
        `
        INSERT INTO cupons_cashback (
          venda_id,
          cliente_id,
          codigo,
          percentual,
          valor,
          status,
          valido_a_partir_de
        )
        VALUES ($1, $2, $3, $4, $5, 'pendente', $6)
        RETURNING *
        `,
        [
          ultimaVenda.id,
          Number(clienteId),
          codigo,
          cashbackGerado.percentual,
          cashbackGerado.valor,
          amanhaIso()
        ]
      );

      cupomGerado = cupomResult.rows[0];
    }

    await client.query("COMMIT");
    client.release();

    res.status(201).json({
      pedido: {
        forma_pagamento: formaPagamento,
        subtotal,
        desconto_percentual: descontoPercentual,
        desconto_valor: descontoValor,
        total_final: totalFinal,
        cashback_percentual: cashbackGerado.percentual,
        cashback_valor: cashbackGerado.valor
      },
      cupom_cashback: cupomGerado
        ? {
            codigo: cupomGerado.codigo,
            percentual: Number(cupomGerado.percentual || 0),
            valor: Number(cupomGerado.valor || 0),
            valido_a_partir_de: cupomGerado.valido_a_partir_de
          }
        : null,
      cashback_usado: cupomUsado
        ? {
            codigo: cupomUsado.codigo,
            valor: Number(cupomUsado.valor || 0)
          }
        : null
    });
  } catch (err) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Erro ao finalizar venda:", err);
    res.status(500).json({ error: "Erro ao finalizar venda" });
  }
});

export default router;
