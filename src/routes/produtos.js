const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// GET /api/produtos — lista os produtos ativos, com categoria e variações de cor
router.get("/", async (req, res) => {
  try {
    const { rows: produtos } = await pool.query(
      `SELECT p.id, p.nome, p.preco, p.descricao, p.imagem_url,
              p.categoria_id, c.nome AS categoria
       FROM produtos p
       JOIN categorias c ON c.id = p.categoria_id
       WHERE p.ativo = true
       ORDER BY c.ordem ASC, p.ordem ASC, p.nome ASC`
    );

    const { rows: variacoes } = await pool.query(
      `SELECT id, produto_id, cor, imagem_url
       FROM variacoes_produto
       WHERE ativo = true
       ORDER BY ordem ASC, cor ASC`
    );

    const produtosComVariacoes = produtos.map((produto) => ({
      ...produto,
      variacoes: variacoes.filter((v) => v.produto_id === produto.id),
    }));

    res.json(produtosComVariacoes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar produtos." });
  }
});

module.exports = router;