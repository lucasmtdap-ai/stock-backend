import express from "express";
import { pool } from "../config/db.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// LISTAR FINANCEIRO DO USUÁRIO LOGADO
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM financeiro
      WHERE usuario_id = $1
      ORDER BY id DESC
      `,
      [req.user.id]
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

      if (categoria === "vendas/dinheiro") {
        entradasPorPagamento.dinheiro += Number(m.valor || 0);
      }

      if (categoria === "vendas/pix") {
        entradasPorPagamento.pix += Number(m.valor || 0);
      }

      if (categoria === "vendas/debito") {
        entradasPorPagamento.debito += Number(m.valor || 0);
      }

      if (categoria === "vendas/credito") {
        entradasPorPagamento.credito += Number(m.valor || 0);
      }
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

// CADASTRAR MOVIMENTO MANUAL PARA O USUÁRIO LOGADO
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { tipo, descricao, valor, categoria } = req.body;

    if (!tipo || !descricao || valor === undefined || valor === null || valor === "") {
      return res.status(400).json({ error: "Campos obrigatórios" });
    }

    if (!["entrada", "saida"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo inválido" });
    }

    const result = await pool.query(
      `
      INSERT INTO financeiro (usuario_id, tipo, descricao, valor, categoria)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        req.user.id,
        String(tipo).trim(),
        String(descricao).trim(),
        Number(valor),
        String(categoria || "Geral").trim()
      ]
    );

    res.status(201).json({
      ...result.rows[0],
      valor: Number(result.rows[0].valor || 0)
    });
  } catch (err) {
    console.error("Erro ao cadastrar financeiro:", err);
    res.status(500).json({ error: "Erro ao cadastrar movimento" });
  }
});

// EXCLUIR MOVIMENTO SOMENTE DO USUÁRIO LOGADO
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM financeiro
      WHERE id = $1
        AND usuario_id = $2
      RETURNING id
      `,
      [Number(req.params.id), req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Movimento não encontrado" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro ao excluir movimento:", err);
    res.status(500).json({ error: "Erro ao excluir movimento" });
  }
});

export default router;
