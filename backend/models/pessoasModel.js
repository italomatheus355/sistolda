// SISTOLDA — Cadastro de pessoas (Marinha, Exército, Civil)
const { db } = require("../database/connection");

const TIPOS = ["marinha", "exercito", "civil"];

function normalize(p) {
  return {
    nome: String(p.nome || "").trim(),
    tipo: String(p.tipo || "").toLowerCase().trim(),
    identificador: String(p.identificador || "").replace(/\D/g, ""),
  };
}

function validate(p) {
  if (!p.nome) return "Nome é obrigatório.";
  if (!TIPOS.includes(p.tipo)) return "Tipo inválido (marinha|exercito|civil).";
  if (!/^\d{8}$/.test(p.identificador)) return "Identificador deve ter 8 dígitos.";
  return null;
}

module.exports = {
  TIPOS,
  list: ({ q } = {}) => {
    if (q) {
      const like = `%${q}%`;
      return db.prepare(`
        SELECT * FROM pessoas
        WHERE nome LIKE ? OR identificador LIKE ?
        ORDER BY nome
      `).all(like, like);
    }
    return db.prepare("SELECT * FROM pessoas ORDER BY nome").all();
  },
  getById: (id) => db.prepare("SELECT * FROM pessoas WHERE id = ?").get(id),
  getByIdentificador: (id) =>
    db.prepare("SELECT * FROM pessoas WHERE identificador = ?")
      .get(String(id || "").replace(/\D/g, "")),
  create: (raw) => {
    const p = normalize(raw);
    const err = validate(p);
    if (err) { const e = new Error(err); e.status = 400; throw e; }
    const exists = db.prepare("SELECT id FROM pessoas WHERE identificador = ?").get(p.identificador);
    if (exists) { const e = new Error("Identificador já cadastrado."); e.status = 409; throw e; }
    const r = db.prepare(`
      INSERT INTO pessoas (nome, tipo, identificador) VALUES (?,?,?)
    `).run(p.nome, p.tipo, p.identificador);
    return r.lastInsertRowid;
  },
  update: (id, raw) => {
    const p = normalize(raw);
    const err = validate(p);
    if (err) { const e = new Error(err); e.status = 400; throw e; }
    const conflict = db.prepare(
      "SELECT id FROM pessoas WHERE identificador = ? AND id <> ?"
    ).get(p.identificador, id);
    if (conflict) { const e = new Error("Identificador já em uso por outra pessoa."); e.status = 409; throw e; }
    db.prepare(`
      UPDATE pessoas SET nome=?, tipo=?, identificador=? WHERE id=?
    `).run(p.nome, p.tipo, p.identificador, id);
  },
  remove: (id) => db.prepare("DELETE FROM pessoas WHERE id = ?").run(id),
};
