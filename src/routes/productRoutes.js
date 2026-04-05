// LISTAR PRODUTOS
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM produtos");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// CRIAR PRODUTO
router.post("/", async (req, res) => {
  try {
    const { nome, preco, quantidade } = req.body;

    const result = await pool.query(
      "INSERT INTO produtos(nome, preco, quantidade) VALUES($1,$2,$3) RETURNING *",
      [nome, preco, quantidade]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao cadastrar produto" });
  }
});
