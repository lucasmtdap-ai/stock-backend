import { pool } from "../config/db.js";

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      preco NUMERIC NOT NULL DEFAULT 0,
      custo NUMERIC NOT NULL DEFAULT 0,
      estoque INTEGER NOT NULL DEFAULT 0
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
}
