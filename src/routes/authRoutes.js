import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { nome, loja, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        error: "Nome, email e senha são obrigatórios"
      });
    }

    const nomeLimpo = String(nome).trim();
    const lojaLimpa = String(loja || "").trim();
    const emailLimpo = String(email).trim().toLowerCase();
    const senhaLimpa = String(senha);

    const existe = await pool.query(
      "SELECT id FROM usuarios WHERE LOWER(email) = $1",
      [emailLimpo]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        error: "Email já cadastrado"
      });
    }

    const senhaHash = await bcrypt.hash(senhaLimpa, 10);

    const result = await pool.query(
      `
      INSERT INTO usuarios (nome, loja, email, senha, plano, role, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nome, loja, email, plano, role, status, created_at
      `,
      [nomeLimpo, lojaLimpa, emailLimpo, senhaHash, "basico", "user", "ativo"]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro no cadastro:", err);

    if (err.code === "23505") {
      return res.status(400).json({
        error: "Email já cadastrado"
      });
    }

    return res.status(500).json({
      error: err.message || "Erro ao cadastrar usuário"
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const emailLimpo = String(email || "").trim().toLowerCase();

    const result = await pool.query(
      "SELECT * FROM usuarios WHERE LOWER(email) = $1",
      [emailLimpo]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const usuario = result.rows[0];

    const senhaCorreta = await bcrypt.compare(String(senha || ""), usuario.senha);

    if (!senhaCorreta) {
      return res.status(400).json({ error: "Senha incorreta" });
    }

    if ((usuario.status || "ativo") === "pausado") {
      return res.status(403).json({
        error: "Sua conta está pausada. Entre em contato com o administrador."
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        role: usuario.role || "user"
      },
      process.env.JWT_SECRET || "segredo_dev",
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        loja: usuario.loja,
        email: usuario.email,
        plano: usuario.plano || "basico",
        role: usuario.role || "user",
        status: usuario.status || "ativo",
        created_at: usuario.created_at || null
      }
    });
  } catch (err) {
    console.error("Erro no login:", err);
    return res.status(500).json({
      error: err.message || "Erro ao fazer login"
    });
  }
});

router.get("/upgrade", async (req, res) => {
  try {
    await pool.query(`
      UPDATE usuarios
      SET plano = 'premium'
    `);

    return res.json({
      ok: true,
      message: "Todos usuários viraram premium"
    });
  } catch (err) {
    console.error("Erro ao atualizar plano:", err);
    return res.status(500).json({
      error: err.message || "Erro ao atualizar plano"
    });
  }
});

export default router;
