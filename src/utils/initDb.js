import { pool } from "../config/db.js";

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      preco NUMERIC NOT NULL DEFAULT 0,
      custo NUMERIC NOT NULL DEFAULT 0,
      estoque INTEGER NOT NULL DEFAULT 0,
      categoria TEXT DEFAULT 'Sem categoria'
    );
  `);

  await pool.query(`
    ALTER TABLE produtos
    ADD COLUMN IF NOT EXISTS custo NUMERIC NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE produtos
    ADD COLUMN IF NOT EXISTS estoque INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE produtos
    ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Sem categoria';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendas (
      id SERIAL PRIMARY KEY,
      produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      quantidade INTEGER NOT NULL DEFAULT 1,
      valor_unitario NUMERIC NOT NULL DEFAULT 0,
      valor_total NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}
