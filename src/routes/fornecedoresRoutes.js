import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// LISTAR FORNECEDORES
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM fornecedores ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar fornecedores:", err);
    res.status(500).json({ error: "Erro ao buscar fornecedores" });
  }
});

// CADASTRAR FORNECEDOR
router.post("/", async (req, res) => {
  try {
    const { nome, telefone, email, empresa } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      `
      INSERT INTO fornecedores (nome, telefone, email, empresa)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [nome, telefone || "", email || "", empresa || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar fornecedor:", err);
    res.status(500).json({ error: "Erro ao cadastrar fornecedor" });
  }
});

// EDITAR
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email, empresa } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      `
      UPDATE fornecedores
      SET nome=$1, telefone=$2, email=$3, empresa=$4
      WHERE id=$5
      RETURNING *
      `,
      [nome, telefone || "", email || "", empresa || "", Number(id)]
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

// EXCLUIR
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM fornecedores WHERE id=$1 RETURNING id",
      [Number(req.params.id)]
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
