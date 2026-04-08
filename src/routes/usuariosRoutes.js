import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// LISTAR USUÁRIOS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM usuarios
      ORDER BY id DESC
    `);

    const usuarios = result.rows.map((u) => ({
      id: u.id,
      nome: u.nome || "",
      loja: u.loja || "",
      email: u.email || "",
      plano: u.plano || "basico",
      created_at: u.created_at || null
    }));

    res.json(usuarios);
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// ALTERAR PLANO
router.put("/:id/plano", async (req, res) => {
  try {
    const { id } = req.params;
    const { plano } = req.body;

    if (!plano || (plano !== "basico" && plano !== "premium")) {
      return res.status(400).json({ error: "Plano inválido" });
    }

    const result = await pool.query(
      `
      UPDATE usuarios
      SET plano = $1
      WHERE id = $2
      RETURNING *
      `,
      [plano, Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const u = result.rows[0];

    res.json({
      id: u.id,
      nome: u.nome || "",
      loja: u.loja || "",
      email: u.email || "",
      plano: u.plano || "basico",
      created_at: u.created_at || null
    });
  } catch (err) {
    console.error("Erro ao alterar plano do usuário:", err);
    res.status(500).json({ error: "Erro ao alterar plano do usuário" });
  }
});

// EXCLUIR USUÁRIO
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM usuarios WHERE id = $1 RETURNING id",
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir usuário:", err);
    res.status(500).json({ error: "Erro ao excluir usuário" });
  }
});

export default router;
