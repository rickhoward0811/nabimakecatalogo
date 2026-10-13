
const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { pool } = require("../db");
const { exigirAdmin } = require("../middleware/auth");

const router = express.Router();

const limiteLogin = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    erro: "Muitas tentativas de login. Tente novamente em alguns minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/admin/login
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

// Todas as rotas seguintes exigem autenticação de administrador.
router.use(exigirAdmin);

// GET /api/admin/verify
router.get("/verify", (req, res) => {
  res.json({ valid: true, user: { role: "admin" } });
});

// GET /api/admin/cupons
router.get("/cupons", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, codigo, tipo, valor, ativo, validade,
             limite_usos, usos, criado_em
      FROM cupons
      ORDER BY criado_em DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar cupons:", err);
    res.status(500).json({ erro: "Erro ao listar cupons." });
  }
});

// POST /api/admin/cupons
router.post("/cupons", async (req, res) => {
  const codigo = String(req.body.codigo || "").trim().toUpperCase();
  const { tipo } = req.body;
  const valor = Number(req.body.valor);
  const validade = req.body.validade || null;

  const limiteUsos =
    req.body.limite_usos === "" ||
    req.body.limite_usos === null ||
    req.body.limite_usos === undefined
      ? null
      : Number(req.body.limite_usos);

  if (!/^[A-Z0-9_-]{3,50}$/.test(codigo)) {
    return res.status(400).json({
      erro: "Use de 3 a 50 caracteres: letras, números, _ ou -.",
    });
  }

  if (
    !["porcentagem", "fixo"].includes(tipo) ||
    !Number.isFinite(valor) ||
    valor <= 0 ||
    (tipo === "porcentagem" && valor > 100)
  ) {
    return res.status(400).json({
      erro: "Informe um tipo e um valor de desconto válidos.",
    });
  }

  if (
    limiteUsos !== null &&
    (!Number.isInteger(limiteUsos) || limiteUsos <= 0)
  ) {
    return res.status(400).json({
      erro: "O limite de usos deve ser um número inteiro positivo.",
    });
  }

  if (validade && !Number.isFinite(Date.parse(validade))) {
    return res.status(400).json({
      erro: "Informe uma data de validade válida.",
    });
  }

  if (validade && Date.parse(validade) <= Date.now()) {
    return res.status(400).json({
      erro: "A validade deve ser uma data futura.",
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO cupons
        (codigo, tipo, valor, validade, limite_usos)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [codigo, tipo, valor, validade, limiteUsos],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        erro: "Já existe um cupom com esse código.",
      });
    }

    console.error("Erro ao criar cupom:", err);
    res.status(500).json({ erro: "Erro ao criar cupom." });
  }
});

// PATCH /api/admin/cupons/:id/ativo
router.patch("/cupons/:id/ativo", async (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;

  if (typeof ativo !== "boolean") {
    return res.status(400).json({
      erro: "Informe se o cupom deve ficar ativo ou inativo.",
    });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE cupons
       SET ativo = $1
       WHERE id = $2
       RETURNING id, codigo, tipo, valor, ativo, validade,
                 limite_usos, usos, criado_em`,
      [ativo, id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Cupom não encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Erro ao atualizar cupom:", err);
    res.status(500).json({ erro: "Erro ao atualizar cupom." });
  }
});

// DELETE /api/admin/cupons/:id
router.delete("/cupons/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `DELETE FROM cupons
       WHERE id = $1
       RETURNING id, codigo`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Cupom não encontrado." });
    }

    res.json({
      mensagem: "Cupom excluído com sucesso.",
      cupom: rows[0],
    });
  } catch (err) {
    console.error("Erro ao excluir cupom:", err);
    res.status(500).json({ erro: "Erro ao excluir cupom." });
  }
});

// GET /api/admin/produtos
router.get("/produtos", async (req, res) => {
  try {
    const { rows: produtos } = await pool.query(`
      SELECT p.id, p.nome, p.preco, p.descricao, p.imagem_url,
             p.ativo, p.estoque, p.ordem, p.categoria_id,
             c.nome AS categoria
      FROM produtos p
      JOIN categorias c ON c.id = p.categoria_id
      ORDER BY p.criado_em DESC
    `);

    const { rows: variacoes } = await pool.query(`
      SELECT id, produto_id, cor, imagem_url, ativo
      FROM variacoes_produto
      ORDER BY ordem ASC, cor ASC
    `);

    const produtosComVariacoes = produtos.map((produto) => ({
      ...produto,
      variacoes: variacoes.filter((v) => v.produto_id === produto.id),
    }));

    res.json(produtosComVariacoes);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    res.status(500).json({ erro: "Erro ao buscar produtos." });
  }
});

// POST /api/admin/produtos
router.post("/produtos", async (req, res) => {
  const {
    nome,
    categoria_id,
    preco,
    descricao,
    imagem_url,
    ativo,
    ordem,
  } = req.body;

  const estoque =
    req.body.estoque === undefined ? 0 : req.body.estoque;

  if (!nome || !categoria_id || preco === undefined) {
    return res.status(400).json({
      erro: "nome, categoria_id e preco são obrigatórios.",
    });
  }

  if (
    estoque === "" ||
    !Number.isInteger(Number(estoque)) ||
    Number(estoque) < 0
  ) {
    return res.status(400).json({
      erro: "O estoque deve ser um número inteiro não negativo.",
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO produtos
        (nome, categoria_id, preco, descricao, imagem_url, ativo, ordem, estoque)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, true), COALESCE($7, 0), $8)
       RETURNING *`,
      [
        nome,
        categoria_id,
        preco,
        descricao || null,
        imagem_url || null,
        ativo,
        ordem,
        Number(estoque),
      ],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Erro ao criar produto:", err);
    res.status(500).json({ erro: "Erro ao criar produto." });
  }
});

// PUT /api/admin/produtos/:id
router.put("/produtos/:id", async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    categoria_id,
    preco,
    descricao,
    imagem_url,
    ativo,
    ordem,
  } = req.body;

  const estoque = req.body.estoque;

  if (
    estoque !== undefined &&
    (estoque === "" ||
      !Number.isInteger(Number(estoque)) ||
      Number(estoque) < 0)
  ) {
    return res.status(400).json({
      erro: "O estoque deve ser um número inteiro não negativo.",
    });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE produtos SET
         nome = COALESCE($1, nome),
         categoria_id = COALESCE($2, categoria_id),
         preco = COALESCE($3, preco),
         descricao = COALESCE($4, descricao),
         imagem_url = COALESCE($5, imagem_url),
         ativo = COALESCE($6, ativo),
         ordem = COALESCE($7, ordem),
         estoque = COALESCE($8, estoque)
       WHERE id = $9
       RETURNING *`,
      [
        nome,
        categoria_id,
        preco,
        descricao,
        imagem_url,
        ativo,
        ordem,
        estoque === undefined ? null : Number(estoque),
        id,
      ],
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    res.status(500).json({ erro: "Erro ao atualizar produto." });
  }
});

// DELETE /api/admin/produtos/:id
router.delete("/produtos/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await pool.query(
      "DELETE FROM produtos WHERE id = $1",
      [id],
    );

    if (rowCount === 0) {
      return res.status(404).json({ erro: "Produto não encontrado." });
    }

    res.status(204).send();
  } catch (err) {
    console.error("Erro ao remover produto:", err);
    res.status(500).json({ erro: "Erro ao remover produto." });
  }
});

module.exports = router;
