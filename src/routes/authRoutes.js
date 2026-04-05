import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  const { email, senha, loja } = req.body;

  const hash = await bcrypt.hash(senha, 10);

  const lojaRes = await pool.query(
    "INSERT INTO lojas(nome) VALUES($1) RETURNING id",
    [loja]
  );

  const loja_id = lojaRes.rows[0].id;

  const userRes = await pool.query(
    "INSERT INTO usuarios(email, senha, loja_id) VALUES($1,$2,$3) RETURNING *",
    [email, hash, loja_id]
  );

  res.json(userRes.rows[0]);
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  const user = await pool.query(
    "SELECT * FROM usuarios WHERE email=$1",
    [email]
  );

  if (!user.rows.length) {
    return res.status(400).json({ error: "Usuário não encontrado" });
  }

  const valid = await bcrypt.compare(senha, user.rows[0].senha);

  if (!valid) {
    return res.status(400).json({ error: "Senha inválida" });
  }

  const token = jwt.sign(
    {
      id: user.rows[0].id,
      loja_id: user.rows[0].loja_id
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

export default router;
