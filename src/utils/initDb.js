import { pool } from "../config/db.js";

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lojas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      loja_id INTEGER REFERENCES lojas(id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      preco NUMERIC,
      quantidade INTEGER,
      loja_id INTEGER REFERENCES lojas(id)
    );
  `);

  console.log("Banco pronto 🚀");
}
