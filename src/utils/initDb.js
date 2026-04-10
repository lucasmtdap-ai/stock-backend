import { pool } from "../config/db.js";

export async function initDb() {
  // USUÁRIOS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      loja TEXT,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      plano TEXT NOT NULL DEFAULT 'basico',
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'ativo',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS nome TEXT;
  `);

  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS loja TEXT;
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
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo';
  `);

  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'usuarios'
        AND column_name = 'name'
      ) THEN
        UPDATE usuarios
        SET nome = COALESCE(nome, name)
        WHERE nome IS NULL;
      END IF;
    END
    $$;
  `);

  // CATEGORIAS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categorias (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE categorias
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
  `);

  // PRODUTOS
  await pool.query(`
  CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    preco NUMERIC NOT NULL DEFAULT 0,
    custo NUMERIC NOT NULL DEFAULT 0,
    estoque INTEGER NOT NULL DEFAULT 0,
    categoria TEXT DEFAULT 'Sem categoria',
    marca TEXT DEFAULT 'Sem marca',
    fornecedor TEXT DEFAULT 'Sem fornecedor'
  );
`);

  await pool.query(`
  ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS marca TEXT DEFAULT 'Sem marca';
`);

await pool.query(`
  ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS fornecedor TEXT DEFAULT 'Sem fornecedor';
`);

  await pool.query(`
    ALTER TABLE produtos
    ADD COLUMN IF NOT EXISTS estoque INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE produtos
    ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Sem categoria';
  `);

  // CLIENTES
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      telefone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
  `);

  // FORNECEDORES
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fornecedores (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      telefone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      empresa TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE fornecedores
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
  `);

  // MARCAS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marcas (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE marcas
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
  `);

  // MOVIMENTAÇÕES
  await pool.query(`
    CREATE TABLE IF NOT EXISTS movimentacoes (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      motivo TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE movimentacoes
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
  `);

  // VENDAS LEGADO
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendas (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
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
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
  `);

  await pool.query(`
    ALTER TABLE vendas
    ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL;
  `);

  // PEDIDOS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'aberto',
      forma_pagamento TEXT DEFAULT '',
      subtotal NUMERIC NOT NULL DEFAULT 0,
      desconto_percentual NUMERIC NOT NULL DEFAULT 0,
      desconto_valor NUMERIC NOT NULL DEFAULT 0,
      total_final NUMERIC NOT NULL DEFAULT 0,
      primeira_compra BOOLEAN NOT NULL DEFAULT false,
      cashback_percentual NUMERIC NOT NULL DEFAULT 0,
      cashback_valor NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      finalizado_em TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
  `);

  // ITENS DOS PEDIDOS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedido_itens (
      id SERIAL PRIMARY KEY,
      pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      nome_produto TEXT NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 1,
      valor_unitario NUMERIC NOT NULL DEFAULT 0,
      valor_total NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // CUPONS CASHBACK
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cupons_cashback (
      id SERIAL PRIMARY KEY,
      pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
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

  // FINANCEIRO
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financeiro (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor NUMERIC NOT NULL DEFAULT 0,
      categoria TEXT DEFAULT 'Geral',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE financeiro
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
  `);

  // CONFIGURAÇÕES
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      nome_loja TEXT DEFAULT '',
      telefone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      rodape TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE configuracoes
    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
  `);

  const adminEmail = "lucasmtdap@gmail.com";

  await pool.query(
    `
    UPDATE usuarios
    SET role = 'admin', status = 'ativo'
    WHERE LOWER(email) = LOWER($1)
    `,
    [adminEmail]
  );
}
