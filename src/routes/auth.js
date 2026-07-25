const jwt = require('jsonwebtoken');

// Chave secreta (use variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'nabimake_super_secret_key_2024';

// Middleware de autenticação
const authenticate = (req, res, next) => {
  try {
    // Pegar token do header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Acesso negado. Token não fornecido.' 
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Sessão expirada. Faça login novamente.' 
      });
    }
    return res.status(401).json({ 
      error: 'Token inválido.' 
    });
  }
};

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
  // Verificar se o usuário é admin (pode vir do banco)
  // Por enquanto, apenas verifica se está autenticado
  if (!req.userId) {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas administradores.' 
    });
  }
  next();
};

module.exports = { authenticate, isAdmin, JWT_SECRET };