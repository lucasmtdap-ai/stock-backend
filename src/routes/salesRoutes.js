import express from "express";
import { pool } from "../config/db.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// LISTAR VENDAS DO USUÁRIO LOGADO
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

// REGISTRAR VENDA
router.post("/", authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      produto_id,
      cliente_id,
      quantidade,
      valor_unitario,
      valor_total
    } = req.body;

    if (!produto_id || !quantidade || Number(quantidade) <= 0) {
      client.release();
      return res.status(400).json({ error: "Produto e quantidade são obrigatórios" });
    }

    await client.query("BEGIN");

    // verifica produto do usuário
    const produtoResult = await client.query(
      `
      SELECT id, nome, preco, estoque
      FROM produtos
      WHERE id = $1
        AND usuario_id = $2
      FOR UPDATE
      `,
      [Number(produto_id), req.user.id]
    );

    if (produtoResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const produto = produtoResult.rows[0];
    const estoqueAtual = Number(produto.estoque || 0);
    const qtd = Number(quantidade);

    if (estoqueAtual < qtd) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({ error: "Estoque insuficiente" });
    }

    let clienteIdFinal = null;

    if (cliente_id) {
      const clienteResult = await client.query(
        `
        SELECT id, nome
        FROM clientes
        WHERE id = $1
          AND usuario_id = $2
        `,
        [Number(cliente_id), req.user.id]
      );

      if (clienteResult.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({ error: "Cliente não encontrado" });
      }

      clienteIdFinal = Number(cliente_id);
    }

    const valorUnitarioFinal = Number(
      valor_unitario !== undefined && valor_unitario !== null && valor_unitario !== ""
        ? valor_unitario
        : produto.preco || 0
    );

    const valorTotalFinal = Number(
      valor_total !== undefined && valor_total !== null && valor_total !== ""
        ? valor_total
        : (valorUnitarioFinal * qtd)
    );

    // salva venda
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
        Number(produto_id),
        clienteIdFinal,
        qtd,
        valorUnitarioFinal,
        Number(valorTotalFinal.toFixed(2))
      ]
    );

    const venda = vendaResult.rows[0];

    // baixa estoque
    const novoEstoque = estoqueAtual - qtd;

    await client.query(
      `
      UPDATE produtos
      SET estoque = $1
      WHERE id = $2
        AND usuario_id = $3
      `,
      [novoEstoque, Number(produto_id), req.user.id]
    );

    // registra movimentação
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
      [
        req.user.id,
        Number(produto_id),
        qtd,
        `Venda #${venda.id}`
      ]
    );

    // registra financeiro
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
        `Venda do produto ${produto.nome}`,
        Number(valorTotalFinal.toFixed(2)),
        "Vendas"
      ]
    );

    await client.query("COMMIT");
    client.release();

    res.status(201).json(venda);
  } catch (err) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Erro ao registrar venda:", err);
    res.status(500).json({ error: "Erro ao registrar venda" });
  }
});

export default router;
