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
    posto_graduacao: p.posto_graduacao ? String(p.posto_graduacao).trim().toUpperCase() : null,
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

// Sincroniza a tabela legada `militares` (usada por biometria/chaves) quando
// uma pessoa do tipo "marinha" é cadastrada/atualizada/removida via /pessoas.
function syncMilitaresFromPessoa(p, { remove = false, oldIdentificador = null } = {}) {
  try {
    const hasMilitares = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='militares'"
    ).get();
    if (!hasMilitares) return;

    if (remove) {
      if (p && p.identificador) {
        db.prepare("UPDATE militares SET ativo = 0 WHERE nip = ?").run(p.identificador);
      }
      return;
    }
    if (!p || p.tipo !== "marinha" || !p.identificador) return;

    if (oldIdentificador && oldIdentificador !== p.identificador) {
      db.prepare("UPDATE militares SET ativo = 0 WHERE nip = ?").run(oldIdentificador);
    }
    db.prepare(`
      INSERT INTO militares (nip, nome, posto_graduacao, ativo)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(nip) DO UPDATE SET
        nome = excluded.nome,
        posto_graduacao = excluded.posto_graduacao,
        ativo = 1
    `).run(p.identificador, p.nome, p.posto_graduacao || null);
  } catch (e) {
    console.warn("[pessoas] sync militares falhou:", e.message);
  }
}

module.exports = {
  TIPOS,
  gerarNipPorCpf,
  list: ({ q, tipo } = {}) => {
    const where = [];
    const params = [];
    if (q) {
      const like = `%${q}%`;
      where.push("(nome LIKE ? OR identificador LIKE ? OR IFNULL(cpf,'') LIKE ?)");
      params.push(like, like, like);
    }
    if (tipo && TIPOS.includes(String(tipo).toLowerCase())) {
      where.push("tipo = ?");
      params.push(String(tipo).toLowerCase());
    }
    const sql = `SELECT * FROM pessoas ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY nome`;
    return db.prepare(sql).all(...params);
  },
  getById: (id) => db.prepare("SELECT * FROM pessoas WHERE id = ?").get(id),
  getByIdentificador: (id) =>
    db.prepare("SELECT * FROM pessoas WHERE identificador = ?").get(onlyDigits(id)),
  create: (raw) => {
    const p = normalize(raw);
    if (!p.identificador && p.tipo !== "marinha" && p.cpf) {
      p.identificador = gerarNipPorCpf(p.cpf) || "";
    }
    const err = validate(p);
    if (err) { const e = new Error(err); e.status = 400; throw e; }
    const exists = db.prepare("SELECT id FROM pessoas WHERE identificador = ?").get(p.identificador);
    if (exists) {
      syncMilitaresFromPessoa(p);
      return exists.id;
    }
    const r = db.prepare(`
      INSERT INTO pessoas (nome, tipo, identificador, cpf, rg, telefone, posto_graduacao)
      VALUES (?,?,?,?,?,?,?)
    `).run(p.nome, p.tipo, p.identificador, p.cpf, p.rg, p.telefone, p.posto_graduacao);
    syncMilitaresFromPessoa(p);
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
    if (conflict) { const e = new Error("NIP já em uso por outra pessoa cadastrada."); e.status = 409; throw e; }
    const prev = db.prepare("SELECT identificador, tipo FROM pessoas WHERE id = ?").get(id);
    db.prepare(`
      UPDATE pessoas SET nome=?, tipo=?, identificador=?, cpf=?, rg=?, telefone=?, posto_graduacao=? WHERE id=?
    `).run(p.nome, p.tipo, p.identificador, p.cpf, p.rg, p.telefone, p.posto_graduacao, id);
    if (prev && prev.tipo === "marinha" && p.tipo !== "marinha") {
      syncMilitaresFromPessoa({ identificador: prev.identificador }, { remove: true });
    } else {
      syncMilitaresFromPessoa(p, { oldIdentificador: prev ? prev.identificador : null });
    }
  },
  remove: (id) => {
    const prev = db.prepare("SELECT identificador, tipo FROM pessoas WHERE id = ?").get(id);
    const r = db.prepare("DELETE FROM pessoas WHERE id = ?").run(id);
    if (prev && prev.tipo === "marinha") {
      syncMilitaresFromPessoa({ identificador: prev.identificador }, { remove: true });
    }
    return r;
  },
};
