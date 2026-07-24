const jwt = require("jsonwebtoken");

// Protege as rotas de admin. Espera um header:
// Authorization: Bearer <token>
// O token é emitido em POST /api/admin/login após conferir a senha única.
function exigirAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const [tipo, token] = header.split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ erro: "Não autenticado." });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ erro: "Sessão inválida ou expirada." });
  }
}

module.exports = { exigirAdmin };