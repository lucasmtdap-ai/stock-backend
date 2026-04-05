import express from "express";
import { pool } from "../config/db.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

// LISTAR PRODUTOS DA LOJA
router.get("/", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM produtos WHERE loja_id = $1",
    [req.user.loja_id]
  );

  res.json(result.rows);
});

// CRIAR PRODUTO
router.post("/", auth, async (req, res) => {
  const { nome, preco, quantidade } = req.body;

  const result = await pool.query(
    "INSERT INTO produtos(nome, preco, quantidade, loja_id) VALUES($1,$2,$3,$4) RETURNING *",
    [nome, preco, quantidade, req.user.loja_id]
  );

  res.json(result.rows[0]);
});

export default router;
