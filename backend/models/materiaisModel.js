const { db } = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM materiais ORDER BY data_registro DESC").all(),
  create: (m) => {
    const r = db.prepare(`
      INSERT INTO materiais (nome_material, militar, nip, destino, cabo_registro, pessoa_tipo)
      VALUES (?,?,?,?,?,?)
    `).run(m.nome_material, m.militar, m.nip, m.destino, m.cabo_registro || null, m.pessoa_tipo || 'marinha');
    return r.lastInsertRowid;
  },
};
