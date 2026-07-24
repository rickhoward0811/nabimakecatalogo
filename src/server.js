require("dotenv").config();
const express = require("express");
const cors = require("cors");

const produtosRouter = require("./routes/produtos");
const categoriasRouter = require("./routes/categorias");
const adminRouter = require("./routes/admin");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);

// Rotas públicas (usadas pelo catálogo)
app.use("/api/produtos", produtosRouter);
app.use("/api/categorias", categoriasRouter);

// Rotas de admin (login + CRUD, protegidas por senha única + token)
app.use("/api/admin", adminRouter);

// Healthcheck simples (útil para o Railway confirmar que o serviço está de pé)
app.get("/", (req, res) => {
  res.json({ status: "ok", servico: "nabimake-backend" });
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`API da NABIMAKE rodando na porta ${PORT}`);
});