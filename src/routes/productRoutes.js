import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// PROTEGIDA
router.get("/", authMiddleware, async (req, res) => {
  // listar produtos
});

// PROTEGIDA
router.post("/", authMiddleware, async (req, res) => {
  // criar produto
});

export default router;
