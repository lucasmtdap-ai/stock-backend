import express from "express";
import { readDB, writeDB } from "../utils/db.js";

const router = express.Router();

router.post("/register", (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  const userExists = db.users.find(u => u.email === email);
  if (userExists) return res.status(400).json({ error: "Usuário já existe" });

  const newUser = {
    id: Date.now(),
    email,
    password
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({ message: "Usuário criado" });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  const user = db.users.find(u => u.email === email && u.password === password);

  if (!user) return res.status(401).json({ error: "Login inválido" });

  res.json({ userId: user.id });
});

export default router;
