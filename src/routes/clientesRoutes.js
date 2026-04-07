import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// LISTAR CLIENTES
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nome, telefone, email, created_at FROM clientes ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar clientes:", err);
    res.status(500).json({ error: "Erro ao buscar clientes" });
  }
});

// CADASTRAR CLIENTE
router.post("/", async (req, res) => {
  try {
    const { nome, telefone, email } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      "INSERT INTO clientes (nome, telefone, email) VALUES ($1, $2, $3) RETURNING id, nome, telefone, email, created_at",
      [nome, telefone || "", email || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar cliente:", err);
    res.status(500).json({ error: "Erro ao cadastrar cliente" });
  }
});

// EDITAR CLIENTE
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const result = await pool.query(
      "UPDATE clientes SET nome = $1, telefone = $2, email = $3 WHERE id = $4 RETURNING id, nome, telefone, email, created_at",
      [nome, telefone || "", email || "", Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao editar cliente:", err);
    res.status(500).json({ error: "Erro ao editar cliente" });
  }
});

// EXCLUIR CLIENTE
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM clientes WHERE id = $1 RETURNING id",
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    res.json({ message: "Cliente excluído com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir cliente:", err);
    res.status(500).json({ error: "Erro ao excluir cliente" });
  }
});

export default router;
