const express = require("express");
const app = express();

app.use(express.json());

const produtos = [];

app.get("/", (req, res) => {
  res.send("API rodando 🚀");
});

app.post("/produtos", (req, res) => {
  const produto = req.body;
  produtos.push(produto);
  res.json({ mensagem: "Produto salvo com sucesso" });
});

app.get("/produtos", (req, res) => {
  res.json(produtos);
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});