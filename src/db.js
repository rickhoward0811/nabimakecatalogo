const { Pool } = require("pg");

// O Railway fornece a DATABASE_URL pronta nas variáveis de ambiente do serviço.
// Em produção o Railway já exige SSL, por isso o ssl condicional abaixo.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

pool.on("error", (err) => {
  console.error("Erro inesperado no pool do Postgres:", err);
});

module.exports = { pool };