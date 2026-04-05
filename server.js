const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "produtos.json");

app.use(cors());
app.use(express.json());

function garantirArquivo() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, "[]", "utf8");
  }
}

function lerProdutos() {
  garantirArquivo();

  try {
    const conteudo = fs.readFileSync(DB_FILE, "utf8");
    const dados = JSON.parse(conteudo);
    return Array.isArray(dados) ? dados : [];
  } catch (error) {
    console.error("Erro ao ler produtos.json:", error);
    return [];
  }
}

function salvarProdutos(produtos) {
  fs.writeFileSync(DB_FILE, JSON.stringify(produtos, null, 2), "utf8");
}

function gerarId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function texto(valor) {
  return String(valor || "").trim();
}

function numero(valor, padrao = 0) {
  if (valor === undefined || valor === null || valor === "") {
    return padrao;
  }

  const n = Number(valor);
  return Number.isNaN(n) ? padrao : n;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "Backend Rosa Boutique",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "Servidor funcionando"
  });
});

app.get("/produtos", (req, res) => {
  const produtos = lerProdutos();
  res.json(produtos);
});

app.get("/produtos/:id", (req, res) => {
  const { id } = req.params;
  const produtos = lerProdutos();
  const produto = produtos.find((p) => p.id === id);

  if (!produto) {
    return res.status(404).json({
      ok: false,
      error: "Produto não encontrado."
    });
  }

  res.json(produto);
});

app.post("/produtos", (req, res) => {
  const { nome, preco, categoria, estoque } = req.body;

  const nomeLimpo = texto(nome);
  const precoLimpo = numero(preco, null);
  const categoriaLimpa = texto(categoria);
  const estoqueLimpo = numero(estoque, 0);

  if (!nomeLimpo) {
    return res.status(400).json({
      ok: false,
      error: "Nome do produto é obrigatório."
    });
  }

  if (precoLimpo === null) {
    return res.status(400).json({
      ok: false,
      error: "Preço do produto é obrigatório."
    });
  }

  const produtos = lerProdutos();

  const novoProduto = {
    id: gerarId(),
    nome: nomeLimpo,
    preco: precoLimpo,
    categoria: categoriaLimpa,
    estoque: estoqueLimpo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  produtos.push(novoProduto);
  salvarProdutos(produtos);

  res.status(201).json(novoProduto);
});

app.put("/produtos/:id", (req, res) => {
  const { id } = req.params;
  const { nome, preco, categoria, estoque } = req.body;

  const produtos = lerProdutos();
  const index = produtos.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({
      ok: false,
      error: "Produto não encontrado."
    });
  }

  const atual = produtos[index];

  const atualizado = {
    ...atual,
    nome: nome !== undefined ? texto(nome) : atual.nome,
    preco: preco !== undefined ? numero(preco, atual.preco) : atual.preco,
    categoria: categoria !== undefined ? texto(categoria) : atual.categoria,
    estoque: estoque !== undefined ? numero(estoque, atual.estoque) : atual.estoque,
    updatedAt: new Date().toISOString()
  };

  if (!atualizado.nome) {
    return res.status(400).json({
      ok: false,
      error: "Nome do produto é obrigatório."
    });
  }

  produtos[index] = atualizado;
  salvarProdutos(produtos);

  res.json(atualizado);
});

app.delete("/produtos/:id", (req, res) => {
  const { id } = req.params;

  const produtos = lerProdutos();
  const existe = produtos.some((p) => p.id === id);

  if (!existe) {
    return res.status(404).json({
      ok: false,
      error: "Produto não encontrado."
    });
  }

  const filtrados = produtos.filter((p) => p.id !== id);
  salvarProdutos(filtrados);

  res.json({
    ok: true,
    message: "Produto excluído com sucesso."
  });
});

app.listen(PORT, () => {
  garantirArquivo();
  console.log(`Servidor rodando na porta ${PORT}`);
});
