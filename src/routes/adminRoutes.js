import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";
import { pool } from "../config/db.js";

const router = express.Router();

router.get("/usuarios", authMiddleware, adminMiddleware, async (req, res) => {
  const result = await pool.query(`
    SELECT id, nome, email, plano, role, status, created_at
    FROM usuarios
    ORDER BY id DESC
  `);

  res.json(result.rows);
});

export default router;
