const { db } = require("../database/connection");

const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

module.exports = {
  list: () =>
    db.prepare("SELECT * FROM visitantes_civis ORDER BY nome").all(),

  get: (id) => db.prepare("SELECT * FROM visitantes_civis WHERE id = ?").get(id),

  getByCpf: (cpf) =>
    db.prepare("SELECT * FROM visitantes_civis WHERE cpf = ?").get(onlyDigits(cpf)),

  getByRg: (rg) =>
    db.prepare("SELECT * FROM visitantes_civis WHERE rg = ?").get(String(rg || "").trim()),

  create: (v) => {
    const r = db.prepare(`
      INSERT INTO visitantes_civis (nome, cpf, rg, telefone, empresa, observacoes)
      VALUES (?,?,?,?,?,?)
    `).run(
      v.nome,
      onlyDigits(v.cpf) || null,
      v.rg || null,
      v.telefone || null,
      v.empresa || null,
      v.observacoes || null,
    );
    return r.lastInsertRowid;
  },

  update: (id, v) => {
    db.prepare(`
      UPDATE visitantes_civis SET
        nome = COALESCE(?, nome),
        rg = COALESCE(?, rg),
        telefone = COALESCE(?, telefone),
        empresa = COALESCE(?, empresa),
        observacoes = COALESCE(?, observacoes)
      WHERE id = ?
    `).run(v.nome || null, v.rg || null, v.telefone || null, v.empresa || null, v.observacoes || null, id);
  },
};
