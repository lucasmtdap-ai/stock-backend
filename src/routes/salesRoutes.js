import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// LISTAR VENDAS COM FILTRO + RESUMO
router.get("/", async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    let query = `
      SELECT
        v.id,
        v.produto_id,
        v.cliente_id,
        p.nome AS produto_nome,
        c.nome AS cliente_nome,
        v.quantidade,
        v.valor_unitario,
        v.valor_total,
        v.created_at
      FROM vendas v
      JOIN produtos p ON p.id = v.produto_id
      LEFT JOIN clientes c ON c.id = v.cliente_id
    `;

    const values = [];

    if (inicio && fim) {
      query += ` WHERE v.created_at BETWEEN $1 AND $2`;
      values.push(inicio, fim);
    }

    query += ` ORDER BY v.id DESC`;

    const result = await pool.query(query, values);

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

// REGISTRAR VENDA
router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    const { produtoId, clienteId, quantidade } = req.body;

    if (!produtoId || !quantidade || Number(quantidade) <= 0) {
      client.release();
      return res.status(400).json({
        error: "Produto e quantidade são obrigatórios"
      });
    }

    await client.query("BEGIN");

    const produtoResult = await client.query(
      "SELECT id, nome, preco, estoque FROM produtos WHERE id = $1 FOR UPDATE",
      [Number(produtoId)]
    );

    if (produtoResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const produto = produtoResult.rows[0];
    const qtd = Number(quantidade);
    const estoqueAtual = Number(produto.estoque || 0);

    if (estoqueAtual < qtd) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({ error: "Estoque insuficiente" });
    }

    let clienteIdFinal = null;

    if (clienteId) {
      const clienteResult = await client.query(
        "SELECT id FROM clientes WHERE id = $1",
        [Number(clienteId)]
      );

      if (clienteResult.rows.length === 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(404).json({ error: "Cliente não encontrado" });
      }

      clienteIdFinal = Number(clienteId);
    }

    const novoEstoque = estoqueAtual - qtd;
    const valorUnitario = Number(produto.preco || 0);
    const valorTotal = valorUnitario * qtd;

    await client.query(
      "UPDATE produtos SET estoque = $1 WHERE id = $2",
      [novoEstoque, produto.id]
    );

    const vendaResult = await client.query(
      `
      INSERT INTO vendas (produto_id, cliente_id, quantidade, valor_unitario, valor_total)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [produto.id, clienteIdFinal, qtd, valorUnitario, valorTotal]
    );

    await client.query("COMMIT");
    client.release();

    res.status(201).json(vendaResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Erro ao registrar venda:", err);
    res.status(500).json({ error: "Erro ao registrar venda" });
  }
});

export default router;
