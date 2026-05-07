const { db } = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM militares WHERE ativo = 1 ORDER BY nome").all(),
  getByNip: (nip) => db.prepare("SELECT * FROM militares WHERE nip = ?").get(nip),
  create: (m) => {
    const r = db.prepare(`
      INSERT INTO militares (nip, nome, posto_graduacao, biometria_id)
      VALUES (?,?,?,?)
    `).run(m.nip, m.nome, m.posto_graduacao || null, m.biometria_id || null);
    return r.lastInsertRowid;
  },
  setBiometria: (nip, biometria_id) =>
    db.prepare("UPDATE militares SET biometria_id = ? WHERE nip = ?").run(biometria_id, nip),
};
