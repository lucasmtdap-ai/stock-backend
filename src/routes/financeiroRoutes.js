import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// LISTAR MOVIMENTOS + RESUMO
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM financeiro ORDER BY id DESC"
    );

    const movimentos = result.rows.map((m) => ({
      ...m,
      valor: Number(m.valor || 0)
    }));

    let entradas = 0;
    let saidas = 0;

    movimentos.forEach((m) => {
      if (m.tipo === "entrada") {
        entradas += Number(m.valor || 0);
      } else {
        saidas += Number(m.valor || 0);
      }
    });

    const entradasPorPagamento = {
      dinheiro: 0,
      pix: 0,
      debito: 0,
      credito: 0
    };

    movimentos.forEach((m) => {
      if (m.tipo !== "entrada") return;

      const categoria = String(m.categoria || "").toLowerCase();

      if (categoria === "vendas/dinheiro") entradasPorPagamento.dinheiro += Number(m.valor || 0);
      if (categoria === "vendas/pix") entradasPorPagamento.pix += Number(m.valor || 0);
      if (categoria === "vendas/debito") entradasPorPagamento.debito += Number(m.valor || 0);
      if (categoria === "vendas/credito") entradasPorPagamento.credito += Number(m.valor || 0);
    });

    res.json({
      movimentos,
      resumo: {
        entradas: Number(entradas.toFixed(2)),
        saidas: Number(saidas.toFixed(2)),
        saldo: Number((entradas - saidas).toFixed(2)),
        entradasPorPagamento: {
          dinheiro: Number(entradasPorPagamento.dinheiro.toFixed(2)),
          pix: Number(entradasPorPagamento.pix.toFixed(2)),
          debito: Number(entradasPorPagamento.debito.toFixed(2)),
          credito: Number(entradasPorPagamento.credito.toFixed(2))
        }
      }
    });
  } catch (err) {
    console.error("Erro financeiro:", err);
    res.status(500).json({ error: "Erro ao buscar financeiro" });
  }
});

// CADASTRAR MOVIMENTO MANUAL
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

// EXCLUIR MOVIMENTO
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
