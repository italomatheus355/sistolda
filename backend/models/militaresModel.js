const db = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM militares WHERE ativo = 1 ORDER BY nome").all(),
  getById: (id) => db.prepare("SELECT * FROM militares WHERE id = ?").get(id),
  getByNip: (nip) => db.prepare("SELECT * FROM militares WHERE nip = ?").get(nip),
  getByBiometria: (bio) => db.prepare("SELECT * FROM militares WHERE biometria_id = ?").get(bio),
  create: ({ nome, nip, graduacao, funcao, biometria_id }) => {
    const r = db.prepare(
      "INSERT INTO militares (nome, nip, graduacao, funcao, biometria_id) VALUES (?, ?, ?, ?, ?)"
    ).run(nome, nip || null, graduacao || null, funcao || null, biometria_id || null);
    return module.exports.getById(r.lastInsertRowid);
  },
};
