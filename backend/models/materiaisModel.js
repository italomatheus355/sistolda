const { db } = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM materiais ORDER BY data_registro DESC").all(),
  getById: (id) => db.prepare("SELECT * FROM materiais WHERE id = ?").get(id),
  create: (m) => {
    const r = db.prepare(`
      INSERT INTO materiais (nome_material, militar, nip, destino, cabo_registro, pessoa_tipo, status, data_registro)
      VALUES (?,?,?,?,?,?, 'em_uso', datetime('now','localtime'))
    `).run(m.nome_material, m.militar, m.nip, m.destino, m.cabo_registro || null, m.pessoa_tipo || 'marinha');
    return r.lastInsertRowid;
  },
  saida: (id, cabo) => {
    const reg = db.prepare("SELECT * FROM materiais WHERE id = ?").get(id);
    if (!reg) throw Object.assign(new Error("Registro não encontrado"), { status: 404 });
    if (reg.data_saida) throw Object.assign(new Error("Registro já encerrado"), { status: 400 });
    db.prepare(`
      UPDATE materiais
      SET status = 'encerrado', data_saida = datetime('now','localtime'), cabo_saida = ?
      WHERE id = ?
    `).run(cabo || null, id);
    return db.prepare("SELECT * FROM materiais WHERE id = ?").get(id);
  },
};
