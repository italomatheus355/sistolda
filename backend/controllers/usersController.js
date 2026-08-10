const bcrypt = require("bcryptjs");
const { db } = require("../database/connection");
const { logAuditoria } = require("../services/auditService");

const ROLES = ["admin", "seg_org", "tolda"];

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, username: u.username, role: u.role,
    bloqueado: !!u.bloqueado, created_at: u.created_at,
    ultimo_acesso: u.ultimo_acesso || null,
  };
}

exports.list = (_req, res) => {
  const rows = db.prepare("SELECT id, username, role, bloqueado, created_at, ultimo_acesso FROM users ORDER BY username").all();
  res.json(rows.map(publicUser));
};

exports.create = (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) return res.status(400).json({ error: "Campos obrigatórios: usuário, senha e perfil." });
  if (!ROLES.includes(role)) return res.status(400).json({ error: "Perfil inválido." });
  if (String(password).length < 4) return res.status(400).json({ error: "Senha deve ter ao menos 4 caracteres." });
  const dup = db.prepare("SELECT 1 FROM users WHERE lower(username) = lower(?)").get(username);
  if (dup) return res.status(409).json({ error: "Usuário já cadastrado." });
  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare("INSERT INTO users (username, password, role) VALUES (?,?,?)").run(String(username).trim(), hash, role);
  logAuditoria(req, { modulo: "usuarios", acao: "criar", descricao: `Criou usuário ${username} (${role}).` });
  res.status(201).json({ id: r.lastInsertRowid, ok: true });
};

exports.update = (req, res) => {
  const id = Number(req.params.id);
  const { role, bloqueado } = req.body || {};
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!u) return res.status(404).json({ error: "Usuário não encontrado." });
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: "Perfil inválido." });
  db.prepare("UPDATE users SET role = COALESCE(?, role), bloqueado = COALESCE(?, bloqueado) WHERE id = ?")
    .run(role || null, bloqueado == null ? null : (bloqueado ? 1 : 0), id);
  logAuditoria(req, { modulo: "usuarios", acao: "editar", descricao: `Editou ${u.username}: ${JSON.stringify({ role, bloqueado })}.` });
  res.json({ ok: true });
};

exports.resetPassword = (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body || {};
  if (!password || String(password).length < 4) return res.status(400).json({ error: "Senha curta." });
  const u = db.prepare("SELECT username FROM users WHERE id = ?").get(id);
  if (!u) return res.status(404).json({ error: "Usuário não encontrado." });
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), id);
  logAuditoria(req, { modulo: "usuarios", acao: "redefinir-senha", descricao: `Redefiniu senha de ${u.username}.` });
  res.json({ ok: true });
};

exports.remove = (req, res) => {
  const id = Number(req.params.id);
  if (req.user?.id === id) return res.status(400).json({ error: "Não é possível remover o próprio usuário." });
  const u = db.prepare("SELECT username FROM users WHERE id = ?").get(id);
  if (!u) return res.status(404).json({ error: "Usuário não encontrado." });
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  logAuditoria(req, { modulo: "usuarios", acao: "remover", descricao: `Removeu usuário ${u.username}.` });
  res.json({ ok: true });
};
