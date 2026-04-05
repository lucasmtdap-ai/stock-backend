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

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Sem token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

function gerarId() {
  return Date.now().toString();
}

app.post("/register", (req, res) => {
  const { nome, email, senha } = req.body;
  const db = readDB();

  if (db.users.length >= 2)
    return res.status(403).json({ error: "Limite de usuários atingido" });

  if (db.users.find((u) => u.email === email))
    return res.status(400).json({ error: "Email já existe" });

  const user = { id: gerarId(), nome, email, senha };
  db.users.push(user);
  saveDB(db);

  const token = jwt.sign(user, SECRET);

  res.json({ token, user });
});

app.post("/login", (req, res) => {
  const { email, senha } = req.body;
  const db = readDB();

  const user = db.users.find(
    (u) => u.email === email && u.senha === senha
  );

  if (!user)
    return res.status(401).json({ error: "Login inválido" });

  const token = jwt.sign(user, SECRET);

  res.json({ token, user });
});

app.get("/produtos", auth, (req, res) => {
  const db = readDB();
  res.json(db.products.filter((p) => p.userId === req.user.id));
});

app.post("/produtos", auth, (req, res) => {
  const db = readDB();

  const novo = {
    id: gerarId(),
    userId: req.user.id,
    nome: req.body.nome,
    preco: Number(req.body.preco),
    categoria: req.body.categoria || "",
    estoque: Number(req.body.estoque || 0)
  };

  db.products.push(novo);
  saveDB(db);

  res.json(novo);
});

app.put("/produtos/:id", auth, (req, res) => {
  const db = readDB();
  const index = db.products.findIndex(
    (p) => p.id === req.params.id && p.userId === req.user.id
  );

  if (index === -1) return res.status(404).json({ error: "Não encontrado" });

  db.products[index] = {
    ...db.products[index],
    ...req.body
  };

  saveDB(db);
  res.json(db.products[index]);
});

app.delete("/produtos/:id", auth, (req, res) => {
  const db = readDB();

  db.products = db.products.filter(
    (p) => !(p.id === req.params.id && p.userId === req.user.id)
  );

  saveDB(db);

  res.json({ ok: true });
});

app.listen(PORT, () => {
  initDB();
  console.log("Servidor rodando");
});
