import { pool } from "../config/db.js";

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      loja TEXT,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      plano TEXT NOT NULL DEFAULT 'basico',
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS plano TEXT NOT NULL DEFAULT 'basico';
  `);

  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
  `);

  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categorias (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

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
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      telefone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fornecedores (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      telefone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      empresa TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS marcas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS movimentacoes (
      id SERIAL PRIMARY KEY,
      produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      motivo TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendas (
      id SERIAL PRIMARY KEY,
      produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      quantidade INTEGER NOT NULL DEFAULT 1,
      valor_unitario NUMERIC NOT NULL DEFAULT 0,
      valor_total NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE vendas
    ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS financeiro (
      id SERIAL PRIMARY KEY,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor NUMERIC NOT NULL DEFAULT 0,
      categoria TEXT DEFAULT 'Geral',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      id SERIAL PRIMARY KEY,
      nome_loja TEXT DEFAULT '',
      telefone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      rodape TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const adminEmail = "Lucasmtdap@gmail.com";

  await pool.query(
    `
    UPDATE usuarios
    SET role = 'admin'
    WHERE email = $1
    `,
    [adminEmail]
  );
}
