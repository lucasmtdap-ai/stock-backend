import express from "express";
import { pool } from "../config/db.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// LISTAR MOVIMENTAÇÕES DO USUÁRIO LOGADO
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        m.id,
        m.usuario_id,
        m.produto_id,
        p.nome AS produto_nome,
        m.tipo,
        m.quantidade,
        m.motivo,
        m.created_at
      FROM movimentacoes m
      JOIN produtos p ON p.id = m.produto_id
      WHERE m.usuario_id = $1
      ORDER BY m.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar movimentações:", err);
    res.status(500).json({ error: "Erro ao buscar movimentações" });
  }
});

// REGISTRAR MOVIMENTAÇÃO (ENTRADA / SAÍDA)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { produto_id, tipo, quantidade, motivo } = req.body;

    if (!produto_id || !tipo || !quantidade) {
      return res.status(400).json({
        error: "Produto, tipo e quantidade são obrigatórios"
      });
    }

    if (!["entrada", "saida"].includes(tipo)) {
      return res.status(400).json({
        error: "Tipo inválido (entrada ou saida)"
      });
    }

    // pega o produto do usuário
    const produtoResult = await pool.query(
      `
      SELECT id, estoque
      FROM produtos
      WHERE id = $1
        AND usuario_id = $2
      `,
      [Number(produto_id), req.user.id]
    );

    if (produtoResult.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const produto = produtoResult.rows[0];
    const estoqueAtual = Number(produto.estoque || 0);
    const qtd = Number(quantidade);

    let novoEstoque = estoqueAtual;

    if (tipo === "entrada") {
      novoEstoque = estoqueAtual + qtd;
    } else {
      if (estoqueAtual < qtd) {
        return res.status(400).json({
          error: "Estoque insuficiente"
        });
      }
      novoEstoque = estoqueAtual - qtd;
    }

    // atualiza estoque
    await pool.query(
      `
      UPDATE produtos
      SET estoque = $1
      WHERE id = $2
        AND usuario_id = $3
      `,
      [novoEstoque, produto.id, req.user.id]
    );

    // registra movimentação
    const result = await pool.query(
      `
      INSERT INTO movimentacoes (usuario_id, produto_id, tipo, quantidade, motivo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        req.user.id,
        produto.id,
        tipo,
        qtd,
        String(motivo || "").trim()
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao registrar movimentação:", err);
    res.status(500).json({ error: "Erro ao registrar movimentação" });
  }
});

export default router;
