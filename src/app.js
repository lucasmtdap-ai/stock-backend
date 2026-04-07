import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import clientesRoutes from "./routes/clientesRoutes.js";
import financeiroRoutes from "./routes/financeiroRoutes.js";
import fornecedoresRoutes from "./routes/fornecedoresRoutes.js";
import marcasRoutes from "./routes/marcasRoutes.js";
import { initDb } from "./utils/initDb.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "https://estoque-frontend-premium.onrender.com",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "Rosa Boutique Backend",
    status: "online"
  });
});

app.use("/auth", authRoutes);
app.use("/produtos", productRoutes);
app.use("/vendas", salesRoutes);
app.use("/clientes", clientesRoutes);
app.use("/financeiro", financeiroRoutes);
app.use("/fornecedores", fornecedoresRoutes);
app.use("/marcas", marcasRoutes);

await initDb();

export default app;
