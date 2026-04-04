const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ARQUIVO = path.join(__dirname, "produtos.json");

app.use(cors());
app.use(express.json());

function garantirArquivo() {
  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(ARQUIVO, "[]", "utf8");
  }
}

function lerProdutos() {
  garantirArquivo();
  try {
    const dados = fs.readFileSync(ARQUIVO, "utf8");
    const produtos = JSON.parse(dados);
    return Array.isArray(produtos) ? produtos : [];
  } catch (error) {
    console.error("Erro ao ler produtos.json:", error);
    return [];
  }
}

function salvarProdutos(produtos) {
  fs.writeFileSync(ARQUIVO, JSON.stringify(produtos, null, 2), "utf8");
}

function gerarId() {
  return Date.now().toString();
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    nome: "Backend Rosa Boutique",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
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
    return res.status(404).json({ erro: "Produto não encontrado." });
  }

  res.json(produto);
});

app.post("/produtos", (req, res) => {
  const { nome, preco, categoria, estoque } = req.body;

  if (!nome || preco === undefined || preco === null || preco === "") {
    return res.status(400).json({
      erro: "Nome e preço são obrigatórios."
    });
  }

  const produtos = lerProdutos();

  const novoProduto = {
    id: gerarId(),
    nome: String(nome).trim(),
    preco: Number(preco),
    categoria: categoria ? String(categoria).trim() : "",
    estoque: estoque !== undefined && estoque !== null && estoque !== ""
      ? Number(estoque)
      : 0,
    criadoEm: new Date().toISOString()
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
    return res.status(404).json({ erro: "Produto não encontrado." });
  }

  const produtoAtual = produtos[index];

  produtos[index] = {
    ...produtoAtual,
    nome: nome !== undefined ? String(nome).trim() : produtoAtual.nome,
    preco: preco !== undefined ? Number(preco) : produtoAtual.preco,
    categoria:
      categoria !== undefined ? String(categoria).trim() : produtoAtual.categoria,
    estoque: estoque !== undefined ? Number(estoque) : produtoAtual.estoque,
    atualizadoEm: new Date().toISOString()
  };

  salvarProdutos(produtos);
  res.json(produtos[index]);
});

app.delete("/produtos/:id", (req, res) => {
  const { id } = req.params;

  const produtos = lerProdutos();
  const filtrados = produtos.filter((p) => p.id !== id);

  if (filtrados.length === produtos.length) {
    return res.status(404).json({ erro: "Produto não encontrado." });
  }

  salvarProdutos(filtrados);

  res.json({
    ok: true,
    mensagem: "Produto excluído com sucesso."
  });
});

app.listen(PORT, () => {
  garantirArquivo();
  console.log(`Servidor rodando na porta ${PORT}`);
});
