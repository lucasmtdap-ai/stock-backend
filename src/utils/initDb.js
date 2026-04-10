import { pool } from "../config/db.js";

export async function initDB() {
  // CLIENTES
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      email TEXT UNIQUE,
      telefone TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // CATEGORIAS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categorias (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL
    );
  `);

  // MARCAS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marcas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL
    );
  `);

  // FORNECEDORES
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fornecedores (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      contato TEXT
    );
  `);

  // PRODUTOS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      preco NUMERIC NOT NULL,
      estoque INTEGER DEFAULT 0,
      categoria_id INTEGER REFERENCES categorias(id),
      marca_id INTEGER REFERENCES marcas(id),
      fornecedor_id INTEGER REFERENCES fornecedores(id),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // USUÁRIOS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      email TEXT UNIQUE,
      senha TEXT,
      plano TEXT DEFAULT 'basico',
      status TEXT DEFAULT 'ativo',
      funcao TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // VENDAS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendas (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER REFERENCES clientes(id),
      total NUMERIC NOT NULL,
      forma_pagamento TEXT,
      desconto NUMERIC DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ITENS DA VENDA
  await pool.query(`
    CREATE TABLE IF NOT EXISTS venda_itens (
      id SERIAL PRIMARY KEY,
      venda_id INTEGER REFERENCES vendas(id) ON DELETE CASCADE,
      produto_id INTEGER REFERENCES produtos(id),
      quantidade INTEGER NOT NULL,
      valor_unitario NUMERIC NOT NULL,
      valor_total NUMERIC NOT NULL
    );
  `);

  // 🔥 CASHBACK (CORRIGIDO)
  await pool.query(`
  DROP TABLE IF EXISTS cupons_cashback;
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS cupons_cashback (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    codigo TEXT NOT NULL UNIQUE,
    percentual NUMERIC NOT NULL DEFAULT 0,
    valor NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendente',
    valido_a_partir_de TIMESTAMP NOT NULL,
    usado_em TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`);

  console.log("✅ Banco inicializado com sucesso");
}
