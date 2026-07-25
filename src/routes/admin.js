const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { pool } = require("../db");
const { exigirAdmin } = require("../middleware/auth");

const router = express.Router();

const limiteLogin = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { erro: "Muitas tentativas de login. Tente novamente em alguns minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/admin/login — confere a senha única
router.post("/login", limiteLogin, (req, res) => {
  const { senha } = req.body;

  if (!senha || senha !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ erro: "Senha incorreta." });
  }

  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "12h",
  });

  res.json({ token, user: { role: "admin" } });
});

// A partir daqui, todas as rotas exigem o token do login
router.use(exigirAdmin);

// GET /api/admin/verify — confirma se o token salvo ainda é válido
// (usado pelo frontend pra manter o login "lembrado" ao recarregar a página)
router.get("/verify", (req, res) => {
  res.json({ valid: true, user: { role: "admin" } });
});

// GET /api/admin/produtos — lista TODOS os produtos (ativos e inativos), com variações
router.get("/produtos", async (req, res) => {
  try {
    const { rows: produtos } = await pool.query(
      `SELECT p.id, p.nome, p.preco, p.descricao, p.imagem_url, p.ativo,
              p.ordem, p.categoria_id, c.nome AS categoria
       FROM produtos p
       JOIN categorias c ON c.id = p.categoria_id
       ORDER BY p.criado_em DESC`
    );

    const { rows: variacoes } = await pool.query(
      `SELECT id, produto_id, cor, imagem_url, ativo
       FROM variacoes_produto
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

// POST /api/admin/produtos — cria um produto novo
router.post("/produtos", async (req, res) => {
  const { nome, categoria_id, preco, descricao, imagem_url, ativo, ordem } =
    req.body;

  if (!nome || !categoria_id || preco === undefined) {
    return res
      .status(400)
      .json({ erro: "nome, categoria_id e preco são obrigatórios." });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO produtos (nome, categoria_id, preco, descricao, imagem_url, ativo, ordem)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, true), COALESCE($7, 0))
       RETURNING *`,
      [nome, categoria_id, preco, descricao || null, imagem_url || null, ativo, ordem]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao criar produto." });
  }
});

// PUT /api/admin/produtos/:id — edita um produto existente
router.put("/produtos/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, categoria_id, preco, descricao, imagem_url, ativo, ordem } =
    req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE produtos SET
         nome = COALESCE($1, nome),
         categoria_id = COALESCE($2, categoria_id),
         preco = COALESCE($3, preco),
         descricao = COALESCE($4, descricao),
         imagem_url = COALESCE($5, imagem_url),
         ativo = COALESCE($6, ativo),
         ordem = COALESCE($7, ordem)
       WHERE id = $8
       RETURNING *`,
      [nome, categoria_id, preco, descricao, imagem_url, ativo, ordem, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar produto." });
  }
});

// DELETE /api/admin/produtos/:id — remove um produto
router.delete("/produtos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await pool.query(
      "DELETE FROM produtos WHERE id = $1",
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ erro: "Produto não encontrado." });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao remover produto." });
  }
});

module.exports = router;