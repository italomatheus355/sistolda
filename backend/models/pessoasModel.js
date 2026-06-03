// SISTOLDA — Cadastro de pessoas (Marinha, Exército, Civil) + dados de contato.
const { db } = require("../database/connection");

const TIPOS = ["marinha", "exercito", "civil"];
const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

function normalize(p) {
  return {
    nome: String(p.nome || "").trim(),
    tipo: String(p.tipo || "").toLowerCase().trim(),
    identificador: onlyDigits(p.identificador),
    cpf: onlyDigits(p.cpf) || null,
    rg: p.rg ? String(p.rg).trim() : null,
    telefone: p.telefone ? String(p.telefone).trim() : null,
  };
}

function validate(p) {
  if (!p.nome) return "Nome é obrigatório.";
  if (!TIPOS.includes(p.tipo)) return "Categoria inválida (marinha|exercito|civil).";
  if (!/^\d{4,10}$/.test(p.identificador)) return "Identificador deve conter entre 4 e 10 dígitos.";
  if (p.tipo !== "marinha" && p.cpf && p.cpf.length !== 11) return "CPF deve ter 11 dígitos.";
  return null;
}

// Gera NIP automático: "0000" + os 4 últimos dígitos do CPF (8 dígitos).
function gerarNipPorCpf(cpf) {
  const c = onlyDigits(cpf);
  if (c.length < 4) return null;
  const final4 = c.slice(-4);
  return "0000" + final4;
}

module.exports = {
  TIPOS,
  gerarNipPorCpf,
  list: ({ q } = {}) => {
    if (q) {
      const like = `%${q}%`;
      return db.prepare(`
        SELECT * FROM pessoas
        WHERE nome LIKE ? OR identificador LIKE ? OR IFNULL(cpf,'') LIKE ?
        ORDER BY nome
      `).all(like, like, like);
    }
    return db.prepare("SELECT * FROM pessoas ORDER BY nome").all();
  },
  getById: (id) => db.prepare("SELECT * FROM pessoas WHERE id = ?").get(id),
  getByIdentificador: (id) =>
    db.prepare("SELECT * FROM pessoas WHERE identificador = ?").get(onlyDigits(id)),
  create: (raw) => {
    const p = normalize(raw);
    // Para externo/civil: se identificador vier vazio, gerar a partir do CPF.
    if (!p.identificador && p.tipo !== "marinha" && p.cpf) {
      p.identificador = gerarNipPorCpf(p.cpf) || "";
    }
    const err = validate(p);
    if (err) { const e = new Error(err); e.status = 400; throw e; }
    const exists = db.prepare("SELECT id FROM pessoas WHERE identificador = ?").get(p.identificador);
    if (exists) { const e = new Error("Identificador (NIP) já cadastrado."); e.status = 409; throw e; }
    const r = db.prepare(`
      INSERT INTO pessoas (nome, tipo, identificador, cpf, rg, telefone)
      VALUES (?,?,?,?,?,?)
    `).run(p.nome, p.tipo, p.identificador, p.cpf, p.rg, p.telefone);
    return r.lastInsertRowid;
  },
  update: (id, raw) => {
    const p = normalize(raw);
    if (!p.identificador && p.tipo !== "marinha" && p.cpf) {
      p.identificador = gerarNipPorCpf(p.cpf) || "";
    }
    const err = validate(p);
    if (err) { const e = new Error(err); e.status = 400; throw e; }
    const conflict = db.prepare(
      "SELECT id FROM pessoas WHERE identificador = ? AND id <> ?"
    ).get(p.identificador, id);
    if (conflict) { const e = new Error("Identificador já em uso por outra pessoa."); e.status = 409; throw e; }
    db.prepare(`
      UPDATE pessoas SET nome=?, tipo=?, identificador=?, cpf=?, rg=?, telefone=? WHERE id=?
    `).run(p.nome, p.tipo, p.identificador, p.cpf, p.rg, p.telefone, id);
  },
  remove: (id) => db.prepare("DELETE FROM pessoas WHERE id = ?").run(id),
};
