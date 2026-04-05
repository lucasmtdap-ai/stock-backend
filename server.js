const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "db.json");
const SECRET = "rosa-saas-secret";

app.use(cors());
app.use(express.json());

function initDB() {
  if (!fs.existsSync(DB)) {
    fs.writeFileSync(
      DB,
      JSON.stringify({ users: [], products: [] }, null, 2)
    );
  }
}

function readDB() {
  initDB();
  return JSON.parse(fs.readFileSync(DB, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

function gerarId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
}

// rota raiz
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Backend StockPro online"
  });
});

// healthcheck
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running"
  });
});

// =========================
// AUTH (fica pronto para depois)
// =========================

app.post("/register", (req, res) => {
  const { nome, email, senha } = req.body;
  const db = readDB();

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
  }

  if (db.users.length >= 2) {
    return res.status(403).json({ error: "Limite de usuários atingido" });
  }

  if (db.users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "Email já existe" });
  }

  const user = {
    id: gerarId(),
    nome,
    email,
    senha
  };

  db.users.push(user);
  saveDB(db);

  const token = jwt.sign(
    { id: user.id, nome: user.nome, email: user.email },
    SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email
    }
  });
});

app.post("/login", (req, res) => {
  const { email, senha } = req.body;
  const db = readDB();

  const user = db.users.find(
    (u) => u.email === email && u.senha === senha
  );

  if (!user) {
    return res.status(401).json({ error: "Login inválido" });
  }

  const token = jwt.sign(
    { id: user.id, nome: user.nome, email: user.email },
    SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email
    }
  });
});

// =========================
// PRODUTOS - COMPATÍVEL COM SEU FRONTEND ATUAL
// =========================

// listar produtos
app.get("/produtos", (req, res) => {
  const db = readDB();
  res.json(db.products);
});

// buscar produto por id
app.get("/produtos/:id", (req, res) => {
  const db = readDB();
  const produto = db.products.find((p) => p.id === req.params.id);

  if (!produto) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }

  res.json(produto);
});

// criar produto
app.post("/produtos", (req, res) => {
  const db = readDB();
  const { nome, preco, categoria, estoque } = req.body;

  if (!nome || preco === undefined || preco === null || preco === "") {
    return res.status(400).json({ error: "Nome e preço são obrigatórios" });
  }

  const novo = {
    id: gerarId(),
    nome: String(nome).trim(),
    preco: Number(preco),
    categoria: categoria ? String(categoria).trim() : "",
    estoque: Number(estoque || 0)
  };

  db.products.push(novo);
  saveDB(db);

  res.status(201).json(novo);
});

// editar produto
app.put("/produtos/:id", (req, res) => {
  const db = readDB();
  const index = db.products.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }

  const atual = db.products[index];
  const body = req.body;

  const atualizado = {
    ...atual,
    nome: body.nome !== undefined ? String(body.nome).trim() : atual.nome,
    preco: body.preco !== undefined ? Number(body.preco) : atual.preco,
    categoria: body.categoria !== undefined ? String(body.categoria).trim() : atual.categoria,
    estoque: body.estoque !== undefined ? Number(body.estoque) : atual.estoque
  };

  if (!atualizado.nome || atualizado.preco === "" || Number.isNaN(atualizado.preco)) {
    return res.status(400).json({ error: "Dados inválidos" });
  }

  db.products[index] = atualizado;
  saveDB(db);

  res.json(atualizado);
});

// excluir produto
app.delete("/produtos/:id", (req, res) => {
  const db = readDB();
  const existe = db.products.some((p) => p.id === req.params.id);

  if (!existe) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }

  db.products = db.products.filter((p) => p.id !== req.params.id);
  saveDB(db);

  res.json({ ok: true, message: "Produto excluído com sucesso" });
});

app.listen(PORT, () => {
  initDB();
  console.log(`Servidor rodando na porta ${PORT}`);
});const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "db.json");
const SECRET = "rosa-saas-secret";

app.use(cors());
app.use(express.json());

function initDB() {
  if (!fs.existsSync(DB)) {
    fs.writeFileSync(
      DB,
      JSON.stringify({ users: [], products: [] }, null, 2)
    );
  }
}

function readDB() {
  initDB();
  return JSON.parse(fs.readFileSync(DB, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

function gerarId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
}

// rota raiz
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Backend StockPro online"
  });
});

// healthcheck
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running"
  });
});

// =========================
// AUTH (fica pronto para depois)
// =========================

app.post("/register", (req, res) => {
  const { nome, email, senha } = req.body;
  const db = readDB();

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
  }

  if (db.users.length >= 2) {
    return res.status(403).json({ error: "Limite de usuários atingido" });
  }

  if (db.users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "Email já existe" });
  }

  const user = {
    id: gerarId(),
    nome,
    email,
    senha
  };

  db.users.push(user);
  saveDB(db);

  const token = jwt.sign(
    { id: user.id, nome: user.nome, email: user.email },
    SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email
    }
  });
});

app.post("/login", (req, res) => {
  const { email, senha } = req.body;
  const db = readDB();

  const user = db.users.find(
    (u) => u.email === email && u.senha === senha
  );

  if (!user) {
    return res.status(401).json({ error: "Login inválido" });
  }

  const token = jwt.sign(
    { id: user.id, nome: user.nome, email: user.email },
    SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email
    }
  });
});

// =========================
// PRODUTOS - COMPATÍVEL COM SEU FRONTEND ATUAL
// =========================

// listar produtos
app.get("/produtos", (req, res) => {
  const db = readDB();
  res.json(db.products);
});

// buscar produto por id
app.get("/produtos/:id", (req, res) => {
  const db = readDB();
  const produto = db.products.find((p) => p.id === req.params.id);

  if (!produto) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }

  res.json(produto);
});

// criar produto
app.post("/produtos", (req, res) => {
  const db = readDB();
  const { nome, preco, categoria, estoque } = req.body;

  if (!nome || preco === undefined || preco === null || preco === "") {
    return res.status(400).json({ error: "Nome e preço são obrigatórios" });
  }

  const novo = {
    id: gerarId(),
    nome: String(nome).trim(),
    preco: Number(preco),
    categoria: categoria ? String(categoria).trim() : "",
    estoque: Number(estoque || 0)
  };

  db.products.push(novo);
  saveDB(db);

  res.status(201).json(novo);
});

// editar produto
app.put("/produtos/:id", (req, res) => {
  const db = readDB();
  const index = db.products.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }

  const atual = db.products[index];
  const body = req.body;

  const atualizado = {
    ...atual,
    nome: body.nome !== undefined ? String(body.nome).trim() : atual.nome,
    preco: body.preco !== undefined ? Number(body.preco) : atual.preco,
    categoria: body.categoria !== undefined ? String(body.categoria).trim() : atual.categoria,
    estoque: body.estoque !== undefined ? Number(body.estoque) : atual.estoque
  };

  if (!atualizado.nome || atualizado.preco === "" || Number.isNaN(atualizado.preco)) {
    return res.status(400).json({ error: "Dados inválidos" });
  }

  db.products[index] = atualizado;
  saveDB(db);

  res.json(atualizado);
});

// excluir produto
app.delete("/produtos/:id", (req, res) => {
  const db = readDB();
  const existe = db.products.some((p) => p.id === req.params.id);

  if (!existe) {
    return res.status(404).json({ error: "Produto não encontrado" });
  }

  db.products = db.products.filter((p) => p.id !== req.params.id);
  saveDB(db);

  res.json({ ok: true, message: "Produto excluído com sucesso" });
});

app.listen(PORT, () => {
  initDB();
  console.log(`Servidor rodando na porta ${PORT}`);
});
