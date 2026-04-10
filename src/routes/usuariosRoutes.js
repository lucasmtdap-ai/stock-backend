import express from "express";
import { pool } from "../config/db.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";

const router = express.Router();

// LISTAR TODOS USUÁRIOS (SÓ ADMIN)
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nome, loja, email, plano, role, status, created_at
      FROM usuarios
      ORDER BY id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// PAUSAR USUÁRIO
router.put("/pausar/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      UPDATE usuarios
      SET status = 'pausado'
      WHERE id = $1
      RETURNING id, nome, status
      `,
      [Number(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({
      message: "Usuário pausado",
      usuario: result.rows[0]
    });
  } catch (err) {
    console.error("Erro ao pausar usuário:", err);
    res.status(500).json({ error: "Erro ao pausar usuário" });
  }
});

// ATIVAR USUÁRIO
router.put("/ativar/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      UPDATE usuarios
      SET status = 'ativo'
      WHERE id = $1
      RETURNING id, nome, status
      `,
      [Number(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({
      message: "Usuário ativado",
      usuario: result.rows[0]
    });
  } catch (err) {
    console.error("Erro ao ativar usuário:", err);
    res.status(500).json({ error: "Erro ao ativar usuário" });
  }
});

// PROMOVER PARA ADMIN
router.put("/admin/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      UPDATE usuarios
      SET role = 'admin'
      WHERE id = $1
      RETURNING id, nome, role
      `,
      [Number(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({
      message: "Usuário promovido para admin",
      usuario: result.rows[0]
    });
  } catch (err) {
    console.error("Erro ao promover usuário:", err);
    res.status(500).json({ error: "Erro ao promover usuário" });
  }
});

export default router;
