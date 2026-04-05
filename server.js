const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "db.json");
const SECRET = process.env.JWT_SECRET || "rosa-boutique-secret-key";

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

function generateId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email
  };
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Sem token" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Token mal formatado" });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "Rosa Boutique Backend",
    status: "online"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running"
  });
});

app.post("/register", (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    const db = readDB();

    if (!nome || !email || !senha) {
      return res.status(400).json({
        error: "Nome, email e senha são obrigatórios"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = db.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      return res.status(400).json({
        error: "Este email já está cadastrado"
      });
    }

    const user = {
      id: generateId(),
      nome: String(nome).trim(),
      email: normalizedEmail,
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

    return res.status(201).json({
      message: "Usuário criado com sucesso",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("Erro em /register:", error);
    return res.status(500).json({
      error: "Erro interno no servidor"
    });
  }
});

app.post("/login", (req, res) => {
  try {
    const { email, senha } = req.body;
    const db = readDB();

    if (!email || !senha) {
      return res.status(400).json({
        error: "Email e senha são obrigatórios"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = db.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail && u.senha === String(senha)
    );

    if (!user) {
      return res.status(401).json({
        error: "Email ou senha inválidos"
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
      message: "Login realizado com sucesso",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("Erro em /login:", error);
    return res.status(500).json({
      error: "Erro interno no servidor"
    });
  }
});

app.get("/me", auth, (req, res) => {
  try {
    const db = readDB();
    const user = db.users.find((u) => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado"
      });
    }

    return res.json({
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("Erro em /me:", error);
    return res.status(500).json({
      error: "Erro interno no servidor"
    });
  }
});

app.get("/produtos", auth, (req, res) => {
  try {
    const db = readDB();

    const produtos = db.products.filter(
      (p) => p.userId === req.user.id
    );

    return res.json(produtos);
  } catch (error) {
    console.error("Erro em GET /produtos:", error);
    return res.status(500).json({
      error: "Erro ao buscar produtos"
    });
  }
});

app.get("/produtos/:id", auth, (req, res) => {
  try {
    const db = readDB();

    const produto = db.products.find(
      (p) => p.id === req.params.id && p.userId === req.user.id
    );

    if (!produto) {
      return res.status(404).json({
        error: "Produto não encontrado"
      });
    }

    return res.json(produto);
  } catch (error) {
    console.error("Erro em GET /produtos/:id:", error);
    return res.status(500).json({
      error: "Erro ao buscar produto"
    });
  }
});

app.post("/produtos", auth, (req, res) => {
  try {
    const db = readDB();
    const { nome, preco, categoria, estoque } = req.body;

    if (!nome || preco === undefined || preco === null || preco === "") {
      return res.status(400).json({
        error: "Nome e preço são obrigatórios"
      });
    }

    const parsedPreco = Number(preco);
    const parsedEstoque = Number(estoque || 0);

    if (Number.isNaN(parsedPreco)) {
      return res.status(400).json({
        error: "Preço inválido"
      });
    }

    if (Number.isNaN(parsedEstoque)) {
      return res.status(400).json({
        error: "Estoque inválido"
      });
    }

    const novoProduto = {
      id: generateId(),
      userId: req.user.id,
      nome: String(nome).trim(),
      preco: parsedPreco,
      categoria: categoria ? String(categoria).trim() : "",
      estoque: parsedEstoque,
      createdAt: new Date().toISOString()
    };

    db.products.push(novoProduto);
    saveDB(db);

    return res.status(201).json(novoProduto);
  } catch (error) {
    console.error("Erro em POST /produtos:", error);
    return res.status(500).json({
      error: "Erro ao criar produto"
    });
  }
});

app.put("/produtos/:id", auth, (req, res) => {
  try {
    const db = readDB();
    const index = db.products.findIndex(
      (p) => p.id === req.params.id && p.userId === req.user.id
    );

    if (index === -1) {
      return res.status(404).json({
        error: "Produto não encontrado"
      });
    }

    const atual = db.products[index];
    const body = req.body;

    const updatedProduct = {
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
          : atual.estoque,
      updatedAt: new Date().toISOString()
    };

    if (!updatedProduct.nome) {
      return res.status(400).json({
        error: "Nome é obrigatório"
      });
    }

    if (Number.isNaN(updatedProduct.preco)) {
      return res.status(400).json({
        error: "Preço inválido"
      });
    }

    if (Number.isNaN(updatedProduct.estoque)) {
      return res.status(400).json({
        error: "Estoque inválido"
      });
    }

    db.products[index] = updatedProduct;
    saveDB(db);

    return res.json(updatedProduct);
  } catch (error) {
    console.error("Erro em PUT /produtos/:id:", error);
    return res.status(500).json({
      error: "Erro ao atualizar produto"
    });
  }
});

app.delete("/produtos/:id", auth, (req, res) => {
  try {
    const db = readDB();

    const exists = db.products.some(
      (p) => p.id === req.params.id && p.userId === req.user.id
    );

    if (!exists) {
      return res.status(404).json({
        error: "Produto não encontrado"
      });
    }

    db.products = db.products.filter(
      (p) => !(p.id === req.params.id && p.userId === req.user.id)
    );

    saveDB(db);

    return res.json({
      ok: true,
      message: "Produto excluído com sucesso"
    });
  } catch (error) {
    console.error("Erro em DELETE /produtos/:id:", error);
    return res.status(500).json({
      error: "Erro ao excluir produto"
    });
  }
});

app.listen(PORT, () => {
  initDB();
  console.log(`Servidor rodando na porta ${PORT}`);
});
