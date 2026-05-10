const { db } = require("../database/connection");

module.exports = {
  list: () =>
    db.prepare("SELECT * FROM biometrias ORDER BY data_cadastro DESC").all(),

  getByNip: (nip) =>
    db.prepare("SELECT * FROM biometrias WHERE nip = ? AND status = 'ativa'").get(nip),

  create: ({ identificacao, nip, template = null, leituras = 0 }) => {
    const r = db
      .prepare(
        `INSERT INTO biometrias (identificacao, nip, template, leituras)
         VALUES (?,?,?,?)`
      )
      .run(identificacao, nip, template, leituras);
    return r.lastInsertRowid;
  },

  setStatus: (id, status) =>
    db.prepare("UPDATE biometrias SET status = ? WHERE id = ?").run(status, id),

  remove: (id) => db.prepare("DELETE FROM biometrias WHERE id = ?").run(id),
};
