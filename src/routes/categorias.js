const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// GET /api/categorias — lista todas as categorias, ordenadas
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nome, ordem FROM categorias ORDER BY ordem ASC, nome ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar categorias." });
  }
});

module.exports = router;