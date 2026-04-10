import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

function gerarCodigoCashback() {
  const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CB${Date.now().toString().slice(-6)}${aleatorio}`;
}

function calcularCashback(totalFinal) {
  const total = Number(totalFinal || 0);

  if (total >= 200) {
    return {
      percentual: 15,
      valor: Number((total * 0.15).toFixed(2))
    };
  }

  if (total >= 100) {
    return {
      percentual: 10,
      valor: Number((total * 0.10).toFixed(2))
    };
  }

  return {
    percentual: 5,
    valor: Number((total * 0.05).toFixed(2))
  };
}

function amanhaIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// LISTAR VENDAS (LEGADO + NOVO PDV)
router.get("/", async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    const filtros = [];
    const valores = [];

    if (inicio && fim) {
      filtros.push(`origem.created_at BETWEEN $1 AND $2`);
      valores.push(inicio, fim);
    }

    const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

    const query = `
      SELECT *
      FROM (
        SELECT
          ('pedido-' || ped.id || '-' || pi.id) AS id,
          pi.produto_id,
          ped.cliente_id,
          pi.nome_produto AS produto_nome,
          COALESCE(c.nome, 'Sem cliente') AS cliente_nome,
          pi.quantidade,
          pi.valor_unitario,
          pi.valor_total,
          ped.forma_pagamento,
          ped.desconto_percentual,
          ped.desconto_valor,
          ped.cashback_percentual,
          ped.cashback_valor,
          ped.created_at
        FROM pedidos ped
        JOIN pedido_itens pi ON pi.pedido_id = ped.id
        LEFT JOIN clientes c ON c.id = ped.cliente_id
        WHERE ped.status = 'finalizado'

        UNION ALL

        SELECT
          ('legacy-' || v.id) AS id,
          v.produto_id,
          v.cliente_id,
          p.nome AS produto_nome,
          COALESCE(c.nome, 'Sem cliente') AS cliente_nome,
          v.quantidade,
          v.valor_unitario,
          v.valor_total,
          '' AS forma_pagamento,
          0 AS desconto_percentual,
          0 AS desconto_valor,
          0 AS cashback_percentual,
          0 AS cashback_valor,
          v.created_at
        FROM vendas v
        JOIN produtos p ON p.id = v.produto_id
        LEFT JOIN clientes c ON c.id = v.cliente_id
      ) AS origem
      ${where}
      ORDER BY origem.created_at DESC
    `;

    const result = await pool.query(query, valores);
    const vendas = result.rows;

    const totalVendas = vendas.length;
    const totalValor = vendas.reduce(
      (acc, v) => acc + Number(v.valor_total || 0),
      0
    );

    res.json({
      vendas,
      resumo: {
        totalVendas,
        totalValor
      }
    });
  } catch (err) {
    console.error("Erro ao buscar vendas:", err);
    res.status(500).json({ error: "Erro ao buscar vendas" });
  }
});

// FINALIZAR VENDA NO NOVO PDV
router.post("/pdv/finalizar", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      clienteId,
      itens,
      formaPagamento,
      descontoPrimeiraCompra
    } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      client.release();
      return res.status(400).json({ error: "Adicione pelo menos um item à venda" });
    }

    const formasValidas = [
      "dinheiro",
      "pix",
      "debito",
      "credito"
    ];

    if (!formaPagamento || !formasValidas.includes(formaPagamento)) {
      client.release();
      return res.status(400).json({ error: "Forma de pagamento inválida" });
    }

    const descontoPermitido = [0, 5, 10, 15];
    const descontoSolicitado = Number(descontoPrimeiraCompra || 0);

    if (!descontoPermitido.includes(descontoSolicitado)) {
      client.release();
      return res.status(400).json({ error: "Desconto de primeira compra inválido" });
    }

    await client.query("BEGIN");

    let clienteIdFinal = null;
    let primeiraCompra = false;

    if (clienteId) {
      const clienteResult = await client.query(
        "SELECT id, nome FROM clientes WHERE id = $1",
        [Number(clienteId)]
      );

      if (clienteResult.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({ error: "Cliente não encontrado" });
      }

      clienteIdFinal = Number(clienteId);

      const historicoPedidos = await client.query(
        "SELECT COUNT(*)::int AS total FROM pedidos WHERE cliente_id = $1 AND status = 'finalizado'",
        [clienteIdFinal]
      );

      const historicoLegacy = await client.query(
        "SELECT COUNT(*)::int AS total FROM vendas WHERE cliente_id = $1",
        [clienteIdFinal]
      );

      const totalComprasAnteriores =
        Number(historicoPedidos.rows[0]?.total || 0) +
        Number(historicoLegacy.rows[0]?.total || 0);

      primeiraCompra = totalComprasAnteriores === 0;
    }

    if (descontoSolicitado > 0 && !clienteIdFinal) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({
        error: "Para aplicar desconto de primeira compra, selecione um cliente"
      });
    }

    if (descontoSolicitado > 0 && !primeiraCompra) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({
        error: "Esse cliente já possui compras. O desconto de primeira compra não pode ser aplicado"
      });
    }

    const itensProcessados = [];
    let subtotal = 0;

    for (const item of itens) {
      const produtoId = Number(item.produtoId);
      const quantidade = Number(item.quantidade);

      if (!produtoId || !quantidade || quantidade <= 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ error: "Item inválido no carrinho" });
      }

      const produtoResult = await client.query(
        "SELECT id, nome, preco, estoque FROM produtos WHERE id = $1 FOR UPDATE",
        [produtoId]
      );

      if (produtoResult.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      const produto = produtoResult.rows[0];
      const estoqueAtual = Number(produto.estoque || 0);

      if (estoqueAtual < quantidade) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({
          error: `Estoque insuficiente para o produto ${produto.nome}`
        });
      }

      const valorUnitario = Number(produto.preco || 0);
      const valorTotal = Number((valorUnitario * quantidade).toFixed(2));

      subtotal += valorTotal;

      itensProcessados.push({
        produtoId: produto.id,
        nomeProduto: produto.nome,
        quantidade,
        valorUnitario,
        valorTotal,
        novoEstoque: estoqueAtual - quantidade
      });
    }

    subtotal = Number(subtotal.toFixed(2));

    const descontoPercentual = primeiraCompra ? descontoSolicitado : 0;
    const descontoValor = Number((subtotal * (descontoPercentual / 100)).toFixed(2));
    const totalFinal = Number((subtotal - descontoValor).toFixed(2));

    const cashback = calcularCashback(totalFinal);

    const pedidoResult = await client.query(
      `
      INSERT INTO pedidos (
        cliente_id,
        status,
        forma_pagamento,
        subtotal,
        desconto_percentual,
        desconto_valor,
        total_final,
        primeira_compra,
        cashback_percentual,
        cashback_valor,
        finalizado_em
      )
      VALUES ($1, 'finalizado', $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
      `,
      [
        clienteIdFinal,
        formaPagamento,
        subtotal,
        descontoPercentual,
        descontoValor,
        totalFinal,
        primeiraCompra,
        cashback.percentual,
        cashback.valor
      ]
    );

    const pedido = pedidoResult.rows[0];

    for (const item of itensProcessados) {
      await client.query(
        `
        INSERT INTO pedido_itens (
          pedido_id,
          produto_id,
          nome_produto,
          quantidade,
          valor_unitario,
          valor_total
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          pedido.id,
          item.produtoId,
          item.nomeProduto,
          item.quantidade,
          item.valorUnitario,
          item.valorTotal
        ]
      );

      await client.query(
        "UPDATE produtos SET estoque = $1 WHERE id = $2",
        [item.novoEstoque, item.produtoId]
      );

      await client.query(
        `
        INSERT INTO movimentacoes (produto_id, tipo, quantidade, motivo)
        VALUES ($1, 'saida', $2, $3)
        `,
        [
          item.produtoId,
          item.quantidade,
          `Venda PDV #${pedido.id}`
        ]
      );
    }

    await client.query(
      `
      INSERT INTO financeiro (tipo, descricao, valor, categoria)
      VALUES ('entrada', $1, $2, 'Vendas')
      `,
      [
        `Venda PDV #${pedido.id} - ${formaPagamento}`,
        totalFinal
      ]
    );

    let cupomGerado = null;

    if (clienteIdFinal) {
      const codigo = gerarCodigoCashback();

      const cupomResult = await client.query(
        `
        INSERT INTO cupons_cashback (
          pedido_id,
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
          pedido.id,
          clienteIdFinal,
          codigo,
          cashback.percentual,
          cashback.valor,
          amanhaIso()
        ]
      );

      cupomGerado = cupomResult.rows[0];
    }

    await client.query("COMMIT");
    client.release();

    res.status(201).json({
      pedido: {
        id: pedido.id,
        cliente_id: pedido.cliente_id,
        forma_pagamento: pedido.forma_pagamento,
        subtotal: Number(pedido.subtotal || 0),
        desconto_percentual: Number(pedido.desconto_percentual || 0),
        desconto_valor: Number(pedido.desconto_valor || 0),
        total_final: Number(pedido.total_final || 0),
        cashback_percentual: Number(pedido.cashback_percentual || 0),
        cashback_valor: Number(pedido.cashback_valor || 0),
        created_at: pedido.created_at
      },
      itens: itensProcessados.map((i) => ({
        produto_id: i.produtoId,
        nome_produto: i.nomeProduto,
        quantidade: i.quantidade,
        valor_unitario: i.valorUnitario,
        valor_total: i.valorTotal
      })),
      cupom_cashback: cupomGerado
        ? {
            codigo: cupomGerado.codigo,
            percentual: Number(cupomGerado.percentual || 0),
            valor: Number(cupomGerado.valor || 0),
            valido_a_partir_de: cupomGerado.valido_a_partir_de
          }
        : null
    });
  } catch (err) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Erro ao finalizar venda PDV:", err);
    res.status(500).json({ error: "Erro ao finalizar venda" });
  }
});

export default router;
