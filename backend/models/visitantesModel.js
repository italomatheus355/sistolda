const db = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM visitantes ORDER BY entrada DESC").all(),
  create: ({ nome, documento, destino, observacao }) => {
    const r = db.prepare(
      "INSERT INTO visitantes (nome, documento, destino, observacao) VALUES (?, ?, ?, ?)"
    ).run(nome, documento || null, destino || null, observacao || null);
    return db.prepare("SELECT * FROM visitantes WHERE id = ?").get(r.lastInsertRowid);
  },
  registrarSaida: (id) =>
    db.prepare("UPDATE visitantes SET saida = datetime('now') WHERE id = ?").run(id),
};
