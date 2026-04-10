import express from "express";
import { pool } from "../config/db.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// LISTAR CLIENTES DO USUÁRIO LOGADO
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, usuario_id, nome, telefone, email, created_at
      FROM clientes
      WHERE usuario_id = $1
      ORDER BY id DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar clientes:", err);
    res.status(500).json({ error: "Erro ao buscar clientes" });
  }
});

// CADASTRAR CLIENTE PARA O USUÁRIO LOGADO
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { nome, telefone, email } = req.body;

    if (!nome || String(nome).trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      `
      INSERT INTO clientes (usuario_id, nome, telefone, email)
      VALUES ($1, $2, $3, $4)
      RETURNING id, usuario_id, nome, telefone, email, created_at
      `,
      [
        req.user.id,
        String(nome).trim(),
        String(telefone || "").trim(),
        String(email || "").trim().toLowerCase()
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar cliente:", err);
    res.status(500).json({ error: "Erro ao cadastrar cliente" });
  }
});

// EDITAR CLIENTE SOMENTE DO USUÁRIO LOGADO
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email } = req.body;

    if (!nome || String(nome).trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      `
      UPDATE clientes
      SET nome = $1,
          telefone = $2,
          email = $3
      WHERE id = $4
        AND usuario_id = $5
      RETURNING id, usuario_id, nome, telefone, email, created_at
      `,
      [
        String(nome).trim(),
        String(telefone || "").trim(),
        String(email || "").trim().toLowerCase(),
        Number(id),
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao editar cliente:", err);
    res.status(500).json({ error: "Erro ao editar cliente" });
  }
});

// EXCLUIR CLIENTE SOMENTE DO USUÁRIO LOGADO
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM clientes
      WHERE id = $1
        AND usuario_id = $2
      RETURNING id
      `,
      [Number(id), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json({ ok: true, message: "Cliente excluído com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir cliente:", err);
    res.status(500).json({ error: "Erro ao excluir cliente" });
  }
});

export default router;
