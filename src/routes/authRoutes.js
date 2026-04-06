import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { nome, loja, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
    }

    const existe = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      "INSERT INTO usuarios (nome, loja, email, senha, plano) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, loja, email, plano",
      [nome, loja || "", email, senhaHash, "basico"]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro no cadastro:", err);
    res.status(500).json({ error: "Erro ao cadastrar usuário" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const result = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const usuario = result.rows[0];

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(400).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email
      },
      process.env.JWT_SECRET || "segredo_dev",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        loja: usuario.loja,
        email: usuario.email,
        plano: usuario.plano || "basico"
      }
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

router.get("/upgrade", async (req, res) => {
  try {
    await pool.query(`
      UPDATE usuarios
      SET plano = 'premium'
    `);

    res.json({ ok: true, message: "Todos usuários viraram premium" });
  } catch (err) {
    console.error("Erro ao atualizar plano:", err);
    res.status(500).json({ error: "Erro ao atualizar plano" });
  }
});

export default router;
