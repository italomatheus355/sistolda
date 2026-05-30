const bcrypt = require("bcryptjs");
const { db } = require("../database/connection");
const { signToken } = require("../middleware/auth");
const { logAuditoria } = require("../services/auditService");

exports.login = (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Informe usuário e senha." });
  const user = db.prepare("SELECT * FROM users WHERE lower(username) = lower(?)").get(String(username).trim());
  if (!user) return res.status(401).json({ error: "Credenciais inválidas." });
  if (user.bloqueado) return res.status(403).json({ error: "Usuário bloqueado. Procure o administrador." });
  const ok = String(user.password).startsWith("$2")
    ? bcrypt.compareSync(password, user.password)
    : user.password === password;
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas." });

  db.prepare("UPDATE users SET ultimo_acesso = datetime('now') WHERE id = ?").run(user.id);
  const token = signToken(user);
  logAuditoria(req, {
    modulo: "auth", acao: "login", usuario: user.username, perfil: user.role,
    descricao: `Usuário ${user.username} (${user.role}) entrou no sistema.`,
  });
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
};

exports.refresh = (req, res) => {
  const token = signToken(req.user);
  res.json({ token, user: { id: req.user.id, username: req.user.username, role: req.user.role } });
};

exports.me = (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username, role: req.user.role } });
};

exports.logout = (req, res) => {
  logAuditoria(req, {
    modulo: "auth", acao: "logout", usuario: req.user.username, perfil: req.user.role,
    descricao: `Usuário ${req.user.username} encerrou a sessão.`,
  });
  res.json({ ok: true });
};
