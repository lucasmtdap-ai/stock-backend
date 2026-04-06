import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nome, preco, custo, estoque, categoria FROM produtos ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nome, preco, custo, estoque, categoria } = req.body;

    if (!nome || preco === undefined || preco === null || preco === "") {
      return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    const result = await pool.query(
      "INSERT INTO produtos (nome, preco, custo, estoque, categoria) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, preco, custo, estoque, categoria",
      [
        nome,
        Number(preco),
        Number(custo || 0),
        Number(estoque || 0),
        categoria || "Sem categoria"
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar produto:", err);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, preco, custo, estoque, categoria } = req.body;

    if (!nome || preco === undefined || preco === null || preco === "") {
      return res.status(400).json({ error: "Nome e preço são obrigatórios" });
    }

    const result = await pool.query(
      "UPDATE produtos SET nome = $1, preco = $2, custo = $3, estoque = $4, categoria = $5 WHERE id = $6 RETURNING id, nome, preco, custo, estoque, categoria",
      [
        nome,
        Number(preco),
        Number(custo || 0),
        Number(estoque || 0),
        categoria || "Sem categoria",
        Number(id)
      ]
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
