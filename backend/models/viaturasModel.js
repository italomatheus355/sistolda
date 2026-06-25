const { db } = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM viaturas ORDER BY id").all(),
  getById: (id) => db.prepare("SELECT * FROM viaturas WHERE id = ?").get(id),

  saida: ({ viatura, motorista, nip, destino, cabo, pessoa_tipo }) => {
    const tx = db.transaction(() => {
      const km = viatura.km_atual != null ? viatura.km_atual : 0;
      db.prepare("UPDATE viaturas SET status='em_uso' WHERE id=?").run(viatura.id);
      const r = db.prepare(`
        INSERT INTO historico_viaturas
          (viatura_id, viatura_prefixo, motorista, nip, destino, km_saida, cabo_saida, status, pessoa_tipo)
        VALUES (?,?,?,?,?,?,?, 'em_uso', ?)
      `).run(viatura.id, viatura.prefixo, motorista, nip != null ? nip : null, destino, km, cabo != null ? cabo : null, pessoa_tipo || 'marinha');
      return r.lastInsertRowid;
    });
    return tx();
  },

  retorno: ({ viatura_id, km_retorno, autonomia, cabo }) => {
    const tx = db.transaction(() => {
      const reg = db.prepare(
        "SELECT * FROM historico_viaturas WHERE viatura_id=? AND status='em_uso' ORDER BY id DESC LIMIT 1"
      ).get(viatura_id);
      if (!reg) throw Object.assign(new Error("Nenhuma saída em aberto"), { status: 400 });
      const rodado = (km_retorno != null ? km_retorno : 0) - (reg.km_saida != null ? reg.km_saida : 0);
      db.prepare(`
        UPDATE historico_viaturas
        SET status='retornada', data_retorno=datetime('now','localtime'),
            km_retorno=?, km_rodado=?, autonomia_informada=?, cabo_retorno=?
        WHERE id=?
      `).run(km_retorno, rodado, autonomia != null ? autonomia : null, cabo != null ? cabo : null, reg.id);
      db.prepare("UPDATE viaturas SET status='disponivel', km_atual=? WHERE id=?")
        .run(km_retorno, viatura_id);
      return reg.id;
    });
    return tx();
  },

  historico: () =>
    db.prepare("SELECT * FROM historico_viaturas ORDER BY data_saida DESC").all(),
};
