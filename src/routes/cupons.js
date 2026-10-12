
const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// POST /api/cupons/validar
router.post("/validar", async (req, res) => {
  const codigo = String(req.body.codigo || "")
    .trim()
    .toUpperCase();

  const subtotal = Number(req.body.subtotal);

  if (!codigo || !Number.isFinite(subtotal) || subtotal < 0) {
    return res.status(400).json({
      erro: "Informe um cupom e um subtotal válido.",
    });
  }

  try {
    const { rows } = await pool.query(
      `SELECT codigo, tipo, valor, ativo, validade,
              limite_usos, usos
       FROM cupons
       WHERE codigo = $1`,
      [codigo]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        erro: "Cupom não encontrado.",
      });
    }

    const cupom = rows[0];

    if (!cupom.ativo) {
      return res.status(400).json({
        erro: "Este cupom está desativado.",
      });
    }

    if (
      cupom.validade &&
      new Date(cupom.validade).getTime() < Date.now()
    ) {
      return res.status(400).json({
        erro: "Este cupom está vencido.",
      });
    }

    if (
      cupom.limite_usos !== null &&
      cupom.usos >= cupom.limite_usos
    ) {
      return res.status(400).json({
        erro: "Este cupom atingiu o limite de utilizações.",
      });
    }

    if (subtotal <= 0) {
      return res.status(400).json({
        erro: "O carrinho está vazio.",
      });
    }

    let desconto;

    if (cupom.tipo === "porcentagem") {
      desconto = subtotal * (Number(cupom.valor) / 100);
    } else {
      desconto = Number(cupom.valor);
    }

    desconto = Math.min(subtotal, desconto);
    desconto = Math.round(desconto * 100) / 100;

    return res.json({
      valido: true,
      codigo: cupom.codigo,
      tipo: cupom.tipo,
      valor: Number(cupom.valor),
      desconto,
    });
  } catch (err) {
    console.error("Erro ao validar cupom:", err);

    return res.status(500).json({
      erro: "Não foi possível validar o cupom.",
    });
  }
});

module.exports = router;
