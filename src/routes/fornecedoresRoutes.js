import express from "express";
import { pool } from "../config/db.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// LISTAR FORNECEDORES DO USUÁRIO LOGADO
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, usuario_id, nome, telefone, email, empresa, created_at
      FROM fornecedores
      WHERE usuario_id = $1
      ORDER BY id DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar fornecedores:", err);
    res.status(500).json({ error: "Erro ao buscar fornecedores" });
  }
});

// CADASTRAR FORNECEDOR PARA O USUÁRIO LOGADO
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { nome, telefone, email, empresa } = req.body;

    if (!nome || String(nome).trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      `
      INSERT INTO fornecedores (usuario_id, nome, telefone, email, empresa)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, usuario_id, nome, telefone, email, empresa, created_at
      `,
      [
        req.user.id,
        String(nome).trim(),
        String(telefone || "").trim(),
        String(email || "").trim().toLowerCase(),
        String(empresa || "").trim()
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar fornecedor:", err);
    res.status(500).json({ error: "Erro ao cadastrar fornecedor" });
  }
});

// EDITAR FORNECEDOR SOMENTE DO USUÁRIO LOGADO
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email, empresa } = req.body;

    if (!nome || String(nome).trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      `
      UPDATE fornecedores
      SET nome = $1,
          telefone = $2,
          email = $3,
          empresa = $4
      WHERE id = $5
        AND usuario_id = $6
      RETURNING id, usuario_id, nome, telefone, email, empresa, created_at
      `,
      [
        String(nome).trim(),
        String(telefone || "").trim(),
        String(email || "").trim().toLowerCase(),
        String(empresa || "").trim(),
        Number(id),
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Fornecedor não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao editar fornecedor:", err);
    res.status(500).json({ error: "Erro ao editar fornecedor" });
  }
});

// EXCLUIR FORNECEDOR SOMENTE DO USUÁRIO LOGADO
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM fornecedores
      WHERE id = $1
        AND usuario_id = $2
      RETURNING id
      `,
      [Number(req.params.id), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Fornecedor não encontrado" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir fornecedor:", err);
    res.status(500).json({ error: "Erro ao excluir fornecedor" });
  }
});

export default router;
