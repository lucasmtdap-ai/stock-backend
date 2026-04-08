import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// BUSCAR CONFIGURAÇÕES
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM configuracoes ORDER BY id DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      return res.json({
        nome_loja: "",
        telefone: "",
        email: "",
        rodape: ""
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao buscar configurações:", err);
    res.status(500).json({ error: "Erro ao buscar configurações" });
  }
});

// SALVAR CONFIGURAÇÕES
router.post("/", async (req, res) => {
  try {
    const { nome_loja, telefone, email, rodape } = req.body;

    const ultimo = await pool.query(
      "SELECT id FROM configuracoes ORDER BY id DESC LIMIT 1"
    );

    if (ultimo.rows.length === 0) {
      const result = await pool.query(
        `
        INSERT INTO configuracoes (nome_loja, telefone, email, rodape)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [nome_loja || "", telefone || "", email || "", rodape || ""]
      );

      return res.json(result.rows[0]);
    }

    const id = ultimo.rows[0].id;

    const result = await pool.query(
      `
      UPDATE configuracoes
      SET nome_loja = $1,
          telefone = $2,
          email = $3,
          rodape = $4
      WHERE id = $5
      RETURNING *
      `,
      [nome_loja || "", telefone || "", email || "", rodape || "", id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao salvar configurações:", err);
    res.status(500).json({ error: "Erro ao salvar configurações" });
  }
});

export default router;
