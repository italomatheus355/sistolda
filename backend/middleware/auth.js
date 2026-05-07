// Middleware de autenticação simples baseada em username (rede interna).
// Pode ser evoluído para JWT futuramente.
const { db } = require("../database/connection");

function requireUser(req, res, next) {
  const username = req.header("x-user") || req.query.user;
  if (!username) return res.status(401).json({ error: "Usuário não informado" });
  const user = db.prepare("SELECT id,username,role FROM users WHERE username = ?").get(username);
  if (!user) return res.status(401).json({ error: "Usuário inválido" });
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Não autenticado" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Acesso negado" });
    next();
  };
}

module.exports = { requireUser, requireRole };
