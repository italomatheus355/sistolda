// SISTOLDA — Serviço central de auditoria
const { db } = require("../database/connection");

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return (req.ip || req.connection?.remoteAddress || "").replace("::ffff:", "");
}

function logAuditoria(req, entry) {
  try {
    const user = req?.user || {};
    db.prepare(`
      INSERT INTO logs_auditoria
        (modulo, acao, nip, nome, descricao, usuario, perfil, ip, estacao, user_agent, timestamp)
      VALUES (?,?,?,?,?,?,?,?,?,?, datetime('now','localtime'))
    `).run(
      entry.modulo || null,
      entry.acao || null,
      entry.nip || null,
      entry.nome || null,
      entry.descricao || null,
      entry.usuario || user.username || null,
      entry.perfil || user.role || null,
      clientIp(req),
      req?.header?.("x-estacao") || null,
      req?.header?.("user-agent") || null,
    );
  } catch (e) {
    console.error("[auditoria] falha:", e.message);
  }
}

function listAuditoria({ limit = 500, modulo, usuario, nip, dataIni, dataFim } = {}) {
  const w = [], p = [];
  if (modulo)  { w.push("modulo = ?");   p.push(modulo); }
  if (usuario) { w.push("usuario = ?");  p.push(usuario); }
  if (nip)     { w.push("nip = ?");      p.push(nip); }
  if (dataIni) { w.push("timestamp >= ?"); p.push(dataIni); }
  if (dataFim) { w.push("timestamp <= ?"); p.push(dataFim); }
  const sql = `SELECT * FROM logs_auditoria
               ${w.length ? "WHERE " + w.join(" AND ") : ""}
               ORDER BY id DESC LIMIT ?`;
  return db.prepare(sql).all(...p, Number(limit));
}

module.exports = { logAuditoria, listAuditoria, clientIp };
