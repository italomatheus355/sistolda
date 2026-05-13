const { db } = require("../database/connection");

const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

module.exports = {
  list: () =>
    db.prepare("SELECT * FROM visitantes_recorrentes WHERE status = 'ativo' ORDER BY nome").all(),

  get: (id) => db.prepare("SELECT * FROM visitantes_recorrentes WHERE id = ?").get(id),

  getByCpf: (cpf) =>
    db.prepare("SELECT * FROM visitantes_recorrentes WHERE cpf = ?").get(onlyDigits(cpf)),

  create: (v) => {
    const r = db.prepare(`
      INSERT INTO visitantes_recorrentes
        (nome, cpf, rg, telefone, organizacao, observacoes, biometria_template, biometria_leituras)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(
      v.nome,
      onlyDigits(v.cpf) || null,
      v.rg || null,
      v.telefone || null,
      v.organizacao || null,
      v.observacoes || null,
      v.biometria_template || null,
      Number.isInteger(v.biometria_leituras) ? v.biometria_leituras : 0,
    );
    return r.lastInsertRowid;
  },

  update: (id, v) => {
    db.prepare(`
      UPDATE visitantes_recorrentes SET
        nome = COALESCE(?, nome),
        rg = COALESCE(?, rg),
        telefone = COALESCE(?, telefone),
        organizacao = COALESCE(?, organizacao),
        observacoes = COALESCE(?, observacoes)
      WHERE id = ?
    `).run(v.nome || null, v.rg || null, v.telefone || null, v.organizacao || null, v.observacoes || null, id);
  },

  setStatus: (id, status) =>
    db.prepare("UPDATE visitantes_recorrentes SET status = ? WHERE id = ?").run(status, id),
};
