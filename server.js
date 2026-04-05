const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "db.json");
const SECRET = "rosa-saas-secret";

app.use(cors());
app.use(express.json());

function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      products: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readDB() {
  initDB();
  const raw = fs.readFileSync(DB_FILE, "utf8");
  return JSON.parse(raw);
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function gerarId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
}

// middleware de auth para usar depois, se quiser proteger rotas
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Sem token" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// rota raiz
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Backend StockPro online"
  });
});

// health check
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running"
  });
});

// =========================
// AUTH
// =========================

app.post("/register", (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    const db = readDB();

    if (!nome || !email || !senha) {
      return res.status(400).json({
        error: "Nome, email e senha são obrigatórios"
      });
    }

    if (db.users.length >= 2) {
      return res.status(403).json({
        error: "Limite de usuários atingido"
      });
    }

    const jaExiste = db.users.find((u) => u.email === email);

    if (jaExiste) {
      return res.status(400).json({
        error: "Email já existe"
      });
    }

    const user = {
      id: gerarId(),
      nome: String(nome).trim(),
      email: String(email).trim(),
      senha: String(senha)
    };

    db.users.push(user);
    saveDB(db);

    const token = jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        email: user.email
      },
      SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Erro no /register:", error);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.post("/login", (req, res) => {
  try {
    const { email, senha } = req.body;
    const db = readDB();

    const user = db.users.find(
      (u) => u.email === email && u.senha === senha
    );

    if (!user) {
      return res.status(401).json({
        error: "Login inválido"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        email: user.email
      },
      SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Erro no /login:", error);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// =========================
// PRODUTOS
// COMPATÍVEL COM O FRONTEND ATUAL
// =========================

// listar produtos
app.get("/produtos", (req, res) => {
  try {
    const db = readDB();
    return res.json(db.products);
  } catch (error) {
    console.error("Erro no GET /produtos:", error);
    return res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// buscar produto por id
app.get("/produtos/:id", (req, res) => {
  try {
    const db = readDB();
    const produto = db.products.find((p) => p.id === req.params.id);

    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    return res.json(produto);
  } catch (error) {
    console.error("Erro no GET /produtos/:id:", error);
    return res.status(500).json({ error: "Erro ao buscar produto" });
  }
});

// criar produto
app.post("/produtos", (req, res) => {
  try {
    const db = readDB();
    const { nome, preco, categoria, estoque } = req.body;

    if (!nome || preco === undefined || preco === null || preco === "") {
      return res.status(400).json({
        error: "Nome e preço são obrigatórios"
      });
    }

    const novo = {
      id: gerarId(),
      nome: String(nome).trim(),
      preco: Number(preco),
      categoria: categoria ? String(categoria).trim() : "",
      estoque: Number(estoque || 0)
    };

    if (Number.isNaN(novo.preco)) {
      return res.status(400).json({
        error: "Preço inválido"
      });
    }

    if (Number.isNaN(novo.estoque)) {
      return res.status(400).json({
        error: "Estoque inválido"
      });
    }

    db.products.push(novo);
    saveDB(db);

    return res.status(201).json(novo);
  } catch (error) {
    console.error("Erro no POST /produtos:", error);
    return res.status(500).json({ error: "Erro ao criar produto" });
  }
});

// editar produto
app.put("/produtos/:id", (req, res) => {
  try {
    const db = readDB();
    const index = db.products.findIndex((p) => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        error: "Produto não encontrado"
      });
    }

    const atual = db.products[index];
    const body = req.body;

    const atualizado = {
      ...atual,
      nome: body.nome !== undefined ? String(body.nome).trim() : atual.nome,
      preco: body.preco !== undefined ? Number(body.preco) : atual.preco,
      categoria:
        body.categoria !== undefined
          ? String(body.categoria).trim()
          : atual.categoria,
      estoque:
        body.estoque !== undefined
          ? Number(body.estoque)
          : atual.estoque
    };

    if (!atualizado.nome) {
      return res.status(400).json({
        error: "Nome é obrigatório"
      });
    }

    if (Number.isNaN(atualizado.preco)) {
      return res.status(400).json({
        error: "Preço inválido"
      });
    }

    if (Number.isNaN(atualizado.estoque)) {
      return res.status(400).json({
        error: "Estoque inválido"
      });
    }

    db.products[index] = atualizado;
    saveDB(db);

    return res.json(atualizado);
  } catch (error) {
    console.error("Erro no PUT /produtos/:id:", error);
    return res.status(500).json({ error: "Erro ao atualizar produto" });
  }
});

// excluir produto
app.delete("/produtos/:id", (req, res) => {
  try {
    const db = readDB();
    const existe = db.products.some((p) => p.id === req.params.id);

    if (!existe) {
      return res.status(404).json({
        error: "Produto não encontrado"
      });
    }

    db.products = db.products.filter((p) => p.id !== req.params.id);
    saveDB(db);

    return res.json({
      ok: true,
      message: "Produto excluído com sucesso"
    });
  } catch (error) {
    console.error("Erro no DELETE /produtos/:id:", error);
    return res.status(500).json({ error: "Erro ao excluir produto" });
  }
});

app.listen(PORT, () => {
  initDB();
  console.log(`Servidor rodando na porta ${PORT}`);
});
