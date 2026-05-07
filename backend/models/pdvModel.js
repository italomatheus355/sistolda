const db = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM pdv ORDER BY data DESC").all(),
  getByData: (data) => db.prepare("SELECT * FROM pdv WHERE data = ?").get(data),
  upsert: (p) => {
    const existing = module.exports.getByData(p.data);
    if (existing) {
      db.prepare(
        `UPDATE pdv SET aeronave=?, piloto=?, copiloto=?, mecanico=?,
                        gsac1=?, gsac2=?, vn=? WHERE id=?`
      ).run(p.aeronave, p.piloto, p.copiloto, p.mecanico, p.gsac1, p.gsac2, p.vn, existing.id);
      return module.exports.getByData(p.data);
    }
    const r = db.prepare(
      `INSERT INTO pdv (data, aeronave, piloto, copiloto, mecanico, gsac1, gsac2, vn)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(p.data, p.aeronave, p.piloto, p.copiloto, p.mecanico, p.gsac1, p.gsac2, p.vn);
    return db.prepare("SELECT * FROM pdv WHERE id = ?").get(r.lastInsertRowid);
  },
};
