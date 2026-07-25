require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const produtosRouter = require("./routes/produtos");
const categoriasRouter = require("./routes/categorias");
const adminRouter = require("./routes/admin");

const app = express();

// Headers de segurança HTTP (protege contra clickjacking, sniffing, etc.)
app.use(helmet());

app.use(express.json());

// CORS: só libera os domínios explicitamente permitidos.
// Em produção, defina FRONTEND_URL com a URL real da Vercel (ex: https://nabimake.vercel.app).
// Durante o desenvolvimento local, o localhost:5173 do Vite já vem liberado.
const origensPermitidas = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: origensPermitidas,
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