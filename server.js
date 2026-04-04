const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "db.json");
const JWT_SECRET = process.env.JWT_SECRET || "rosa-boutique-secret-key";

app.use(cors());
app.use(express.json());

function ensureDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      products: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
  }
}

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      products: Array.isArray(parsed.products) ? parsed.products : []
    };
  } catch (error) {
    console.error("Erro ao ler db.json:", error);
    return { users: [], products: [] };
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

function generateId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeNumber(value, defaultValue = 0) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const number = Number(value);
  return Number.isNaN(number) ? defaultValue : number;
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      nome: user.nome
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Token não enviado." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: "Token inválido." });
  }
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "Rosa Boutique SaaS Backend",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Servidor funcionando" });
});

app.post("/register", (req, res) => {
  const { nome, email, senha } = req.body;
  const cleanName = normalizeText(nome);
  const cleanEmail = normalizeText(email).toLowerCase();
  const cleanPassword = normalizeText(senha);

  if (!cleanName || !cleanEmail || !cleanPassword) {
    return res.status(400).json({
      ok: false,
      error: "Nome, email e senha são obrigatórios."
    });
  }

  const db = readDb();

  if (db.users.length >= 2) {
    return res.status(403).json({
      ok: false,
      error: "Limite de 2 usuários atingido."
    });
  }

  const emailExists = db.users.some((u) => u.email === cleanEmail);
  if (emailExists) {
    return res.status(400).json({
      ok: false,
      error: "Esse email já está cadastrado."
    });
  }

  const newUser = {
    id: generateId(),
    nome: cleanName,
    email: cleanEmail,
    senha: cleanPassword,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);

  const token = createToken(newUser);

  res.status(201).json({
    ok: true,
    token,
    user: {
      id: newUser.id,
      nome: newUser.nome,
      email: newUser.email
    }
  });
});

app.post("/login", (req, res) => {
  const { email, senha } = req.body;
  const cleanEmail = normalizeText(email).toLowerCase();
  const cleanPassword = normalizeText(senha);

  if (!cleanEmail || !cleanPassword) {
    return res.status(400).json({
      ok: false,
      error: "Email e senha são obrigatórios."
    });
  }

  const db = readDb();
  const user = db.users.find(
    (u) => u.email === cleanEmail && u.senha === cleanPassword
  );

  if (!user) {
    return res.status(401).json({
      ok: false,
      error: "Email ou senha inválidos."
    });
  }

  const token = createToken(user);

  res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email
    }
  });
});

app.get("/me", authMiddleware, (req, res) => {
  res.json({
    ok: true,
    user: req.user
  });
});

app.get("/produtos", authMiddleware, (req, res) => {
  const db = readDb();
  const products = db.products.filter((p) => p.userId === req.user.id);
  res.json(products);
});

app.get("/produtos/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const product = db.products.find(
    (p) => p.id === id && p.userId === req.user.id
  );

  if (!product) {
    return res.status(404).json({
      ok: false,
      error: "Produto não encontrado."
    });
  }

  res.json(product);
});

app.post("/produtos", authMiddleware, (req, res) => {
  const { nome, preco, categoria, estoque } = req.body;

  const cleanName = normalizeText(nome);
  const cleanCategory = normalizeText(categoria);
  const cleanPrice = normalizeNumber(preco, null);
  const cleanStock = normalizeNumber(estoque, 0);

  if (!cleanName) {
    return res.status(400).json({
      ok: false,
      error: "O nome do produto é obrigatório."
    });
  }

  if (cleanPrice === null) {
    return res.status(400).json({
      ok: false,
      error: "O preço do produto é obrigatório."
    });
  }

  const db = readDb();

  const newProduct = {
    id: generateId(),
    userId: req.user.id,
    nome: cleanName,
    preco: cleanPrice,
    categoria: cleanCategory,
    estoque: cleanStock,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.products.push(newProduct);
  writeDb(db);

  res.status(201).json(newProduct);
});

app.put("/produtos/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { nome, preco, categoria, estoque } = req.body;

  const db = readDb();
  const index = db.products.findIndex(
    (p) => p.id === id && p.userId === req.user.id
  );

  if (index === -1) {
    return res.status(404).json({
      ok: false,
      error: "Produto não encontrado."
    });
  }

  const current = db.products[index];

  const updated = {
    ...current,
    nome: nome !== undefined ? normalizeText(nome) : current.nome,
    preco: preco !== undefined ? normalizeNumber(preco, current.preco) : current.preco,
    categoria: categoria !== undefined ? normalizeText(categoria) : current.categoria,
    estoque: estoque !== undefined ? normalizeNumber(estoque, current.estoque) : current.estoque,
    updatedAt: new Date().toISOString()
  };

  if (!updated.nome) {
    return res.status(400).json({
      ok: false,
      error: "O nome do produto é obrigatório."
    });
  }

  db.products[index] = updated;
  writeDb(db);

  res.json(updated);
});

app.delete("/produtos/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const exists = db.products.some(
    (p) => p.id === id && p.userId === req.user.id
  );

  if (!exists) {
    return res.status(404).json({
      ok: false,
      error: "Produto não encontrado."
    });
  }

  db.products = db.products.filter(
    (p) => !(p.id === id && p.userId === req.user.id)
  );

  writeDb(db);

  res.json({
    ok: true,
    message: "Produto excluído com sucesso."
  });
});

app.listen(PORT, () => {
  ensureDb();
  console.log(`Servidor rodando na porta ${PORT}`);
});
