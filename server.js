const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

// conexão com banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// criar tabela automaticamente
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      preco NUMERIC
    )
  `);
}

initDB();

// GET
app.get("/produtos", async (req, res) => {
  const result = await pool.query("SELECT * FROM produtos");
  res.json(result.rows);
});

// POST
app.post("/produtos", async (req, res) => {
  const { nome, preco } = req.body;

  await pool.query(
    "INSERT INTO produtos (nome, preco) VALUES ($1, $2)",
    [nome, preco]
  );

  res.json({ mensagem: "Produto salvo no banco!" });
});

app.listen(3000, () => {
  console.log("Servidor rodando 🚀");
});
