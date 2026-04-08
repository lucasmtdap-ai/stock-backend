import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// DEFINIR VOCÊ COMO ADMIN
router.get("/set-admin", async (req, res) => {
  try {
    await pool.query(`
      UPDATE usuarios
      SET role = 'admin'
      WHERE email = 'lucasmtdap@gmail.com'
    `);

    res.json({ ok: true, message: "Admin ativado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao definir admin" });
  }
});

export default router;
