const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// GET /api/produtos — lista só os produtos ativos, com nome da categoria
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.nome, p.preco, p.descricao, p.imagem_url,
              p.categoria_id, c.nome AS categoria
       FROM produtos p
       JOIN categorias c ON c.id = p.categoria_id
       WHERE p.ativo = true
       ORDER BY c.ordem ASC, p.ordem ASC, p.nome ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar produtos." });
  }
});

module.exports = router;