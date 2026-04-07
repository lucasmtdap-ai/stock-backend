import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// LISTAR MOVIMENTAÇÕES
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        m.id,
        m.produto_id,
        p.nome AS produto_nome,
        m.tipo,
        m.quantidade,
        m.motivo,
        m.created_at
      FROM movimentacoes m
      JOIN produtos p ON p.id = m.produto_id
      ORDER BY m.id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar movimentações:", err);
    res.status(500).json({ error: "Erro ao buscar movimentações" });
  }
});

// REGISTRAR MOVIMENTAÇÃO
router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    const { produtoId, tipo, quantidade, motivo } = req.body;

    if (!produtoId || !tipo || !quantidade || Number(quantidade) <= 0) {
      client.release();
      return res.status(400).json({ error: "Produto, tipo e quantidade são obrigatórios" });
    }

    if (tipo !== "entrada" && tipo !== "saida") {
      client.release();
      return res.status(400).json({ error: "Tipo deve ser entrada ou saida" });
    }

    await client.query("BEGIN");

    const produtoResult = await client.query(
      "SELECT id, nome, estoque FROM produtos WHERE id = $1 FOR UPDATE",
      [Number(produtoId)]
    );

    if (produtoResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const produto = produtoResult.rows[0];
    const estoqueAtual = Number(produto.estoque || 0);
    const qtd = Number(quantidade);

    let novoEstoque = estoqueAtual;

    if (tipo === "entrada") {
      novoEstoque = estoqueAtual + qtd;
    }

    if (tipo === "saida") {
      if (estoqueAtual < qtd) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ error: "Estoque insuficiente para saída" });
      }

      novoEstoque = estoqueAtual - qtd;
    }

    await client.query(
      "UPDATE produtos SET estoque = $1 WHERE id = $2",
      [novoEstoque, produto.id]
    );

    const movimentoResult = await client.query(
      `
      INSERT INTO movimentacoes (produto_id, tipo, quantidade, motivo)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [produto.id, tipo, qtd, motivo || ""]
    );

    await client.query("COMMIT");
    client.release();

    res.status(201).json(movimentoResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Erro ao registrar movimentação:", err);
    res.status(500).json({ error: "Erro ao registrar movimentação" });
  }
});

export default router;
