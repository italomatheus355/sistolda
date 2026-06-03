const { db } = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM chaves ORDER BY numero").all(),
  getById: (id) => db.prepare("SELECT * FROM chaves WHERE id = ?").get(id),
  setStatus: (id, status, militar) =>
    db.prepare("UPDATE chaves SET status = ?, militar_responsavel = ? WHERE id = ?")
      .run(status, militar, id),

  retirar: ({ chave, militar, nip, cabo }) => {
    const tx = db.transaction(() => {
      db.prepare("UPDATE chaves SET status='emprestada', militar_responsavel=? WHERE id=?")
        .run(militar, chave.id);
      const r = db.prepare(`
        INSERT INTO retiradas_chaves
          (chave_id, chave_numero, chave_nome, militar, nip, cabo_retirada, status, pessoa_tipo)
        VALUES (?,?,?,?,?,?, 'em_uso', ?)
      `).run(chave.id, chave.numero, chave.nome, militar, nip || null, cabo || null, arguments[0].tipo || 'marinha');
      return r.lastInsertRowid;
    });
    return tx();
  },

  devolver: ({ chave_id, cabo }) => {
    const tx = db.transaction(() => {
      const reg = db.prepare(
        "SELECT * FROM retiradas_chaves WHERE chave_id=? AND status='em_uso' ORDER BY id DESC LIMIT 1"
      ).get(chave_id);
      if (!reg) throw Object.assign(new Error("Nenhuma retirada em aberto"), { status: 400 });
      db.prepare(`
        UPDATE retiradas_chaves
        SET status='devolvida', data_devolucao=datetime('now'), cabo_devolucao=?
        WHERE id=?
      `).run(cabo || null, reg.id);
      db.prepare("UPDATE chaves SET status='disponivel', militar_responsavel=NULL WHERE id=?")
        .run(chave_id);
      return reg.id;
    });
    return tx();
  },

  historico: () =>
    db.prepare("SELECT * FROM retiradas_chaves ORDER BY data_retirada DESC").all(),
};
