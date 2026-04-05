import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const client = await pool.connect();

  try {
    const { nome, email, senha, loja } = req.body;

    if (!nome || !email || !senha || !loja) {
      return res.status(400).json({
        error: "Nome, email, senha e loja são obrigatórios"
      });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [emailNormalizado]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "Email já cadastrado"
      });
    }

    await client.query("BEGIN");

    const storeResult = await client.query(
      "INSERT INTO stores (name) VALUES ($1) RETURNING id, name",
      [String(loja).trim()]
    );

    const store = storeResult.rows[0];

    const senhaHash = await bcrypt.hash(String(senha), 10);

    const userResult = await client.query(
      `INSERT INTO users (store_id, nome, email, senha_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, store_id, nome, email`,
      [store.id, String(nome).trim(), emailNormalizado, senhaHash]
    );

    await client.query("COMMIT");

    const user = userResult.rows[0];

    const token = jwt.sign(
      {
        userId: user.id,
        storeId: user.store_id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        storeId: user.store_id,
        loja: store.name
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({
      error: "Erro ao cadastrar usuário"
    });
  } finally {
    client.release();
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        error: "Email e senha são obrigatórios"
      });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    const result = await pool.query(
      `SELECT u.id, u.store_id, u.nome, u.email, u.senha_hash, s.name AS loja
       FROM users u
       JOIN stores s ON s.id = u.store_id
       WHERE u.email = $1`,
      [emailNormalizado]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Login inválido"
      });
    }

    const user = result.rows[0];
    const senhaCorreta = await bcrypt.compare(String(senha), user.senha_hash);

    if (!senhaCorreta) {
      return res.status(401).json({
        error: "Login inválido"
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        storeId: user.store_id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        storeId: user.store_id,
        loja: user.loja
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao fazer login"
    });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.store_id, s.name AS loja
       FROM users u
       JOIN stores s ON s.id = u.store_id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Usuário não encontrado"
      });
    }

    const user = result.rows[0];

    return res.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        storeId: user.store_id,
        loja: user.loja
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao buscar usuário"
    });
  }
});

export default router;
