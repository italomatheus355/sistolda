const db = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM chaves ORDER BY numero").all(),
  getById: (id) => db.prepare("SELECT * FROM chaves WHERE id = ?").get(id),
  setStatus: (id, status) =>
    db.prepare("UPDATE chaves SET status = ? WHERE id = ?").run(status, id),
  registrarOperacao: ({ chave_id, militar_id, tipo_operacao, recebido_por }) => {
    const r = db.prepare(
      `INSERT INTO retiradas_chaves (chave_id, militar_id, tipo_operacao, recebido_por)
       VALUES (?, ?, ?, ?)`
    ).run(chave_id, militar_id, tipo_operacao, recebido_por || null);
    return r.lastInsertRowid;
  },
  historico: () =>
    db.prepare(`
      SELECT r.*, c.nome AS chave_nome, c.numero AS chave_numero,
             m.nome AS militar_nome, m.nip
      FROM retiradas_chaves r
      JOIN chaves   c ON c.id = r.chave_id
      JOIN militares m ON m.id = r.militar_id
      ORDER BY r.data_hora DESC
    `).all(),
};
