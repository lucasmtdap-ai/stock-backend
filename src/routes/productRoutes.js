import express from "express";
import { readDB, writeDB } from "../utils/db.js";

const router = express.Router();

router.get("/", (req, res) => {
  const db = readDB();
  res.json(db.produtos);
});

router.post("/", (req, res) => {
  const db = readDB();

  const novo = {
    id: Date.now(),
    ...req.body
  };

  db.produtos.push(novo);
  writeDB(db);

  res.json(novo);
});

router.put("/:id", (req, res) => {
  const db = readDB();

  const index = db.produtos.findIndex(p => p.id == req.params.id);

  db.produtos[index] = {
    ...db.produtos[index],
    ...req.body
  };

  writeDB(db);

  res.json(db.produtos[index]);
});

router.delete("/:id", (req, res) => {
  const db = readDB();

  db.produtos = db.produtos.filter(p => p.id != req.params.id);

  writeDB(db);

  res.json({ message: "Deletado" });
});

export default router;
