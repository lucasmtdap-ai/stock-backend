const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function iniciarBanco() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        preco NUMERIC(10,2) NOT NULL
      )
    `);
    console.log("Banco conectado e tabela produtos pronta.");
  } catch (erro) {
    console.error("Erro ao iniciar banco:", erro);
  }
}

app.get("/", (req, res) => {
  res.send("API rodando com banco 🚀");
});

app.get("/produtos", async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT * FROM produtos ORDER BY id DESC"
    );
    res.json(resultado.rows);
  } catch (erro) {
    console.error("Erro ao buscar produtos:", erro);
    res.status(500).json({ erro: "Erro ao buscar produtos" });
  }
});

app.post("/produtos", async (req, res) => {
  try {
    const { nome, preco } = req.body;

    if (!nome || preco === undefined) {
      return res.status(400).json({ erro: "Nome e preço são obrigatórios" });
    }

    const resultado = await pool.query(
      "INSERT INTO produtos (nome, preco) VALUES ($1, $2) RETURNING *",
      [nome, preco]
    );

    res.json({
      mensagem: "Produto salvo com sucesso",
      produto: resultado.rows[0],
    });
  } catch (erro) {
    console.error("Erro ao salvar produto:", erro);
    res.status(500).json({ erro: "Erro ao salvar produto" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  await iniciarBanco();
});
