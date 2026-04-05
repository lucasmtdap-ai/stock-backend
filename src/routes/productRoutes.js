import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// LISTAR PRODUTOS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM produtos ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// CRIAR PRODUTO
router.post("/", async (req, res) => {
  try {
    const { nome, preco, categoria, estoque } = req.body;

    const result = await pool.query(
      "INSERT INTO produtos (nome, preco, categoria, estoque) VALUES ($1, $2, $3, $4) RETURNING *",
      [nome, preco, categoria, estoque]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar produto:", err);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

export default router;
