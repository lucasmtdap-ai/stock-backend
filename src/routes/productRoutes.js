import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// LISTAR PRODUTOS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nome, preco FROM produtos ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// CADASTRAR PRODUTO
router.post("/", async (req, res) => {
  try {
    const { nome, preco } = req.body;

    if (!nome || preco === undefined || preco === null || preco === "") {
      return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    const result = await pool.query(
      "INSERT INTO produtos (nome, preco) VALUES ($1, $2) RETURNING id, nome, preco",
      [nome, Number(preco)]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar produto:", err);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

// EDITAR PRODUTO
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, preco } = req.body;

    if (!nome || preco === undefined || preco === null || preco === "") {
      return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    const result = await pool.query(
      "UPDATE produtos SET nome = $1, preco = $2 WHERE id = $3 RETURNING id, nome, preco",
      [nome, Number(preco), Number(id)]
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

// EXCLUIR PRODUTO
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM produtos WHERE id = $1 RETURNING id",
      [Number(id)]
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
