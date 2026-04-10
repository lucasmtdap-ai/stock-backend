import express from "express";
import { pool } from "../config/db.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// LISTAR CATEGORIAS DO USUÁRIO LOGADO
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, usuario_id, nome, descricao, created_at
      FROM categorias
      WHERE usuario_id = $1
      ORDER BY id DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar categorias:", err);
    res.status(500).json({ error: "Erro ao buscar categorias" });
  }
});

// CADASTRAR CATEGORIA PARA O USUÁRIO LOGADO
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { nome, descricao } = req.body;

    if (!nome || String(nome).trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      `
      INSERT INTO categorias (usuario_id, nome, descricao)
      VALUES ($1, $2, $3)
      RETURNING id, usuario_id, nome, descricao, created_at
      `,
      [
        req.user.id,
        String(nome).trim(),
        String(descricao || "").trim()
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar categoria:", err);
    res.status(500).json({ error: "Erro ao cadastrar categoria" });
  }
});

// EDITAR CATEGORIA SOMENTE DO USUÁRIO LOGADO
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao } = req.body;

    if (!nome || String(nome).trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      `
      UPDATE categorias
      SET nome = $1,
          descricao = $2
      WHERE id = $3
        AND usuario_id = $4
      RETURNING id, usuario_id, nome, descricao, created_at
      `,
      [
        String(nome).trim(),
        String(descricao || "").trim(),
        Number(id),
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao editar categoria:", err);
    res.status(500).json({ error: "Erro ao editar categoria" });
  }
});

// EXCLUIR CATEGORIA SOMENTE DO USUÁRIO LOGADO
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM categorias
      WHERE id = $1
        AND usuario_id = $2
      RETURNING id
      `,
      [Number(req.params.id), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir categoria:", err);
    res.status(500).json({ error: "Erro ao excluir categoria" });
  }
});

export default router;
