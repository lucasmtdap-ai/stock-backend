import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        store_id TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT,
        price NUMERIC,
        stock INTEGER,
        store_id TEXT
      );
    `);

    console.log("✅ Banco inicializado");
  } catch (error) {
    console.error("❌ Erro ao iniciar DB:", error);
  }
}

export default pool;
