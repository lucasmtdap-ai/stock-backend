import express from "express";
import pool from "../config/db.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nome, preco, categoria, estoque, created_at, updated_at
       FROM products
       WHERE store_id = $1
       ORDER BY id DESC`,
      [req.user.storeId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao buscar produtos"
    });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { nome, preco, categoria, estoque } = req.body;

    if (!nome || preco === undefined || preco === null || preco === "") {
      return res.status(400).json({
        error: "Nome e preço são obrigatórios"
      });
    }

    const result = await pool.query(
      `INSERT INTO products (store_id, nome, preco, categoria, estoque)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, preco, categoria, estoque, created_at, updated_at`,
      [
        req.user.storeId,
        String(nome).trim(),
        Number(preco),
        categoria ? String(categoria).trim() : "",
        Number(estoque || 0)
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao criar produto"
    });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const { nome, preco, categoria, estoque } = req.body;

    const result = await pool.query(
      `UPDATE products
       SET nome = $1,
           preco = $2,
           categoria = $3,
           estoque = $4,
           updated_at = NOW()
       WHERE id = $5 AND store_id = $6
       RETURNING id, nome, preco, categoria, estoque, created_at, updated_at`,
      [
        String(nome).trim(),
        Number(preco),
        categoria ? String(categoria).trim() : "",
        Number(estoque || 0),
        Number(req.params.id),
        req.user.storeId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Produto não encontrado"
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao atualizar produto"
    });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM products
       WHERE id = $1 AND store_id = $2
       RETURNING id`,
      [Number(req.params.id), req.user.storeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Produto não encontrado"
      });
    }

    return res.json({
      ok: true,
      message: "Produto excluído com sucesso"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Erro ao excluir produto"
    });
  }
});

export default router;
