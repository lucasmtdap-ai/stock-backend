import express from "express";
import { pool } from "../config/db.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// BUSCAR CONFIGURAÇÕES DO USUÁRIO LOGADO
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM configuracoes
      WHERE usuario_id = $1
      ORDER BY id DESC
      LIMIT 1
      `,
      [req.user.id]
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

// SALVAR CONFIGURAÇÕES DO USUÁRIO LOGADO
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { nome_loja, telefone, email, rodape } = req.body;

    const ultimo = await pool.query(
      `
      SELECT id
      FROM configuracoes
      WHERE usuario_id = $1
      ORDER BY id DESC
      LIMIT 1
      `,
      [req.user.id]
    );

    if (ultimo.rows.length === 0) {
      const result = await pool.query(
        `
        INSERT INTO configuracoes (
          usuario_id,
          nome_loja,
          telefone,
          email,
          rodape
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
          req.user.id,
          String(nome_loja || "").trim(),
          String(telefone || "").trim(),
          String(email || "").trim().toLowerCase(),
          String(rodape || "").trim()
        ]
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
        AND usuario_id = $6
      RETURNING *
      `,
      [
        String(nome_loja || "").trim(),
        String(telefone || "").trim(),
        String(email || "").trim().toLowerCase(),
        String(rodape || "").trim(),
        Number(id),
        req.user.id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao salvar configurações:", err);
    res.status(500).json({ error: "Erro ao salvar configurações" });
  }
});

export default router;
