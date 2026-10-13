
const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// GET /api/produtos — lista os produtos ativos
router.get("/", async (req, res) => {
  try {
    const { rows: produtos } = await pool.query(`
      SELECT
        p.id,
        p.nome,
        p.preco,
        p.descricao,
        p.imagem_url,
        p.categoria_id,
        p.estoque,
        p.ativo,
        p.ordem,
        c.nome AS categoria
      FROM produtos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.ativo = true
      ORDER BY c.ordem ASC, p.ordem ASC, p.nome ASC
    `);

    const { rows: variacoes } = await pool.query(`
      SELECT id, produto_id, cor, imagem_url
      FROM variacoes_produto
      WHERE ativo = true
      ORDER BY ordem ASC, cor ASC
    `);

    const produtosComVariacoes = produtos.map((produto) => ({
      ...produto,
      variacoes: variacoes.filter(
        (v) => v.produto_id === produto.id
      ),
    }));

    res.json(produtosComVariacoes);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ erro: "Erro ao buscar produtos." });
  }
});

// GET /api/produtos/:id — detalhes de um produto
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      erro: "Id de produto inválido.",
    });
  }

  try {
    const { rows: produtoRows } = await pool.query(
      `
        SELECT
          p.id,
          p.nome,
          p.preco,
          p.descricao,
          p.imagem_url,
          p.categoria_id,
          p.estoque,
          p.ativo,
          p.ordem,
          c.nome AS categoria
        FROM produtos p
        JOIN categorias c ON c.id = p.categoria_id
        WHERE p.id = $1
      `,
      [id]
    );

    if (produtoRows.length === 0) {
      return res.status(404).json({
        erro: "Produto não encontrado.",
      });
    }

    const { rows: variacoes } = await pool.query(
      `
        SELECT id, produto_id, cor, imagem_url, ativo, ordem
        FROM variacoes_produto
        WHERE produto_id = $1
        ORDER BY ordem ASC, cor ASC
      `,
      [id]
    );

    res.json({
      ...produtoRows[0],
      variacoes,
    });
  } catch (err) {
    console.error("Erro ao buscar produto:", err);
    res.status(500).json({
      erro: "Erro ao buscar produto.",
    });
  }
});

module.exports = router;
