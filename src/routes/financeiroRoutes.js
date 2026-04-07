import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// LISTAR MOVIMENTOS + RESUMO
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM financeiro ORDER BY id DESC"
    );

    const movimentos = result.rows;

    let entradas = 0;
    let saidas = 0;

    movimentos.forEach((m) => {
      if (m.tipo === "entrada") {
        entradas += Number(m.valor);
      } else {
        saidas += Number(m.valor);
      }
    });

    res.json({
      movimentos,
      resumo: {
        entradas,
        saidas,
        saldo: entradas - saidas
      }
    });
  } catch (err) {
    console.error("Erro financeiro:", err);
    res.status(500).json({ error: "Erro ao buscar financeiro" });
  }
});

// CADASTRAR MOVIMENTO
router.post("/", async (req, res) => {
  try {
    const { tipo, descricao, valor, categoria } = req.body;

    if (!tipo || !descricao || !valor) {
      return res.status(400).json({ error: "Campos obrigatórios" });
    }

    const result = await pool.query(
      `
      INSERT INTO financeiro (tipo, descricao, valor, categoria)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [tipo, descricao, Number(valor), categoria || "Geral"]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao cadastrar financeiro:", err);
    res.status(500).json({ error: "Erro ao cadastrar" });
  }
});

// EXCLUIR
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM financeiro WHERE id=$1", [
      Number(req.params.id)
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir:", err);
    res.status(500).json({ error: "Erro ao excluir" });
  }
});

export default router;
