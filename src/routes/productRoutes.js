import express from "express";
import { pool } from "../config/db.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// LISTAR PRODUTOS DO USUÁRIO LOGADO
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, usuario_id, nome, preco, custo, estoque, categoria
      FROM produtos
      WHERE usuario_id = $1
      ORDER BY id DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// CADASTRAR PRODUTO PARA O USUÁRIO LOGADO
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { nome, preco, custo, estoque, categoria } = req.body;

    if (!nome || preco === undefined || preco === null || preco === "") {
      return res.status(400).json({
        error: "Nome e preço são obrigatórios"
      });
    }

    const categoriaFinal =
      categoria && String(categoria).trim() !== ""
        ? String(categoria).trim()
        : "Sem categoria";

    const result = await pool.query(
      `
      INSERT INTO produtos (usuario_id, nome, preco, custo, estoque, categoria)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, usuario_id, nome, preco, custo, estoque, categoria
      `,
      [
        req.user.id,
        String(nome).trim(),
        Number(preco),
        Number(custo || 0),
        Number(estoque || 0),
        categoriaFinal
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar produto:", err);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// EDITAR PRODUTO SOMENTE DO USUÁRIO LOGADO
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, preco, custo, estoque, categoria } = req.body;

    if (!nome || preco === undefined || preco === null || preco === "") {
      return res.status(400).json({
        error: "Nome e preço são obrigatórios"
      });
    }

    const categoriaFinal =
      categoria && String(categoria).trim() !== ""
        ? String(categoria).trim()
        : "Sem categoria";

    const result = await pool.query(
      `
      UPDATE produtos
      SET nome = $1,
          preco = $2,
          custo = $3,
          estoque = $4,
          categoria = $5
      WHERE id = $6
        AND usuario_id = $7
      RETURNING id, usuario_id, nome, preco, custo, estoque, categoria
      `,
      [
        String(nome).trim(),
        Number(preco),
        Number(custo || 0),
        Number(estoque || 0),
        categoriaFinal,
        Number(id),
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao editar produto:", err);
    res.status(500).json({ error: "Erro ao editar produto" });
  }
});

// EXCLUIR PRODUTO SOMENTE DO USUÁRIO LOGADO
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM produtos
      WHERE id = $1
        AND usuario_id = $2
      RETURNING id
      `,
      [Number(id), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json({ message: "Produto excluído com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir produto:", err);
    res.status(500).json({ error: "Erro ao excluir produto" });
  }
});

export default router;
