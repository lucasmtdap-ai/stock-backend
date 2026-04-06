export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      preco NUMERIC,
      custo NUMERIC DEFAULT 0
    );
  `);

  // GARANTE QUE A COLUNA EXISTA
  await pool.query(`
    ALTER TABLE produtos
    ADD COLUMN IF NOT EXISTS custo NUMERIC DEFAULT 0;
  `);
}
