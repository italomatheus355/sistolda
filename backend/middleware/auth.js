// SISTOLDA — Middleware de autenticação JWT + RBAC
const jwt = require("jsonwebtoken");
const { db } = require("../database/connection");

const JWT_SECRET = process.env.SISTOLDA_JWT_SECRET || "sistolda-hu41-secret-change-me";
const JWT_TTL    = process.env.SISTOLDA_JWT_TTL || "8h";

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_TTL },
  );
}

function decode(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function requireUser(req, res, next) {
  // Permitir health/auth/login sem token (gerenciado no router)
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Sessão não autenticada." });
  const payload = decode(token);
  if (!payload) return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
  const user = db.prepare("SELECT id, username, role, bloqueado FROM users WHERE id = ?").get(payload.sub);
  if (!user || user.bloqueado) return res.status(401).json({ error: "Usuário não autorizado." });
  req.user = user;
  req.token = token;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Não autenticado" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Permissão negada para este perfil." });
    next();
  };
}

module.exports = { requireUser, requireRole, signToken, decode, JWT_SECRET, JWT_TTL };
