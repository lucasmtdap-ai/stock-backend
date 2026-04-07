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

// DETALHE DO CLIENTE + HISTÓRICO
router.get("/:id/historico", async (req, res) => {
  try {
    const { id } = req.params;

    const clienteResult = await pool.query(
      "SELECT id, nome, telefone, email, created_at FROM clientes WHERE id = $1",
      [Number(id)]
    );

    if (clienteResult.rows.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }

    const vendasResult = await pool.query(
      `
      SELECT
        v.id,
        v.produto_id,
        p.nome AS produto_nome,
        v.quantidade,
        v.valor_unitario,
        v.valor_total,
        v.created_at
      FROM vendas v
      JOIN produtos p ON p.id = v.produto_id
      WHERE v.cliente_id = $1
      ORDER BY v.id DESC
      `,
      [Number(id)]
    );

    const vendas = vendasResult.rows;
    const totalGasto = vendas.reduce(
      (acc, venda) => acc + Number(venda.valor_total || 0),
      0
    );

    res.json({
      cliente: clienteResult.rows[0],
      vendas,
      totalCompras: vendas.length,
      totalGasto
    });
  } catch (err) {
    console.error("Erro ao buscar histórico do cliente:", err);
    res.status(500).json({ error: "Erro ao buscar histórico do cliente" });
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
