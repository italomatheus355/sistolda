const { db } = require("../database/connection");

const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

module.exports = {
  list: () =>
    db.prepare("SELECT * FROM militares_externos ORDER BY nome").all(),

  get: (id) => db.prepare("SELECT * FROM militares_externos WHERE id = ?").get(id),

  getByCpf: (cpf) =>
    db.prepare("SELECT * FROM militares_externos WHERE cpf = ?").get(onlyDigits(cpf)),

  // Identificação biométrica: integração futura com leitor real.
  // Hoje retorna o militar com biometria cadastrada cujo CPF/ID confere.
  identifyByBiometria: (templateOrId) => {
    if (templateOrId == null) return null;
    // tenta por id direto
    const byId = db.prepare("SELECT * FROM militares_externos WHERE id = ?").get(templateOrId);
    if (byId) return byId;
    return null;
  },

  create: (v) => {
    const r = db.prepare(`
      INSERT INTO militares_externos
        (nome, cpf, posto_graduacao, forca_militar, telefone, biometria_template, biometria_leituras)
      VALUES (?,?,?,?,?,?,?)
    `).run(
      v.nome,
      onlyDigits(v.cpf) || null,
      v.posto_graduacao || null,
      v.forca_militar || null,
      v.telefone || null,
      v.biometria_template || null,
      Number.isInteger(v.biometria_leituras) ? v.biometria_leituras : 0,
    );
    return r.lastInsertRowid;
  },

  update: (id, v) => {
    db.prepare(`
      UPDATE militares_externos SET
        nome = COALESCE(?, nome),
        posto_graduacao = COALESCE(?, posto_graduacao),
        forca_militar = COALESCE(?, forca_militar),
        telefone = COALESCE(?, telefone),
        biometria_template = COALESCE(?, biometria_template),
        biometria_leituras = COALESCE(?, biometria_leituras)
      WHERE id = ?
    `).run(
      v.nome || null,
      v.posto_graduacao || null,
      v.forca_militar || null,
      v.telefone || null,
      v.biometria_template || null,
      Number.isInteger(v.biometria_leituras) ? v.biometria_leituras : null,
      id,
    );
  },
};
