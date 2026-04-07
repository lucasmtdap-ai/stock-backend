import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// LISTAR MARCAS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM marcas ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar marcas:", err);
    res.status(500).json({ error: "Erro ao buscar marcas" });
  }
});

// CADASTRAR MARCA
router.post("/", async (req, res) => {
  try {
    const { nome, descricao } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      `
      INSERT INTO marcas (nome, descricao)
      VALUES ($1, $2)
      RETURNING *
      `,
      [nome, descricao || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar marca:", err);
    res.status(500).json({ error: "Erro ao cadastrar marca" });
  }
});

// EDITAR MARCA
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      `
      UPDATE marcas
      SET nome = $1, descricao = $2
      WHERE id = $3
      RETURNING *
      `,
      [nome, descricao || "", Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Marca não encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao editar marca:", err);
    res.status(500).json({ error: "Erro ao editar marca" });
  }
});

// EXCLUIR MARCA
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM marcas WHERE id = $1 RETURNING id",
      [Number(req.params.id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Marca não encontrada" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir marca:", err);
    res.status(500).json({ error: "Erro ao excluir marca" });
  }
});

export default router;
