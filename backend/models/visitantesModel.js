const { db } = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM visitantes ORDER BY hora_entrada DESC").all(),
  create: (v) => {
    const r = db.prepare(`
      INSERT INTO visitantes
        (nome, documento, militar_responsavel, local_destino, observacoes, cabo_registro)
      VALUES (?,?,?,?,?,?)
    `).run(v.nome, v.documento, v.militar_responsavel, v.local_destino,
           v.observacoes || null, v.cabo_registro || null);
    return r.lastInsertRowid;
  },
  registrarSaida: (id) =>
    db.prepare("UPDATE visitantes SET hora_saida = datetime('now') WHERE id = ?").run(id),
};
