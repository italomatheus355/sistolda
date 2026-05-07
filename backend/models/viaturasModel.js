const db = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM viaturas ORDER BY nome").all(),
  getById: (id) => db.prepare("SELECT * FROM viaturas WHERE id = ?").get(id),
  setStatus: (id, status) =>
    db.prepare("UPDATE viaturas SET status = ? WHERE id = ?").run(status, id),
  setKm: (id, km) =>
    db.prepare("UPDATE viaturas SET km_atual = ? WHERE id = ?").run(km, id),

  registrarSaida: ({ viatura_id, militar_id, destino, km_saida }) => {
    const r = db.prepare(
      `INSERT INTO historico_viaturas (viatura_id, militar_id, destino, km_saida)
       VALUES (?, ?, ?, ?)`
    ).run(viatura_id, militar_id, destino || null, km_saida ?? null);
    return r.lastInsertRowid;
  },
  registrarRetorno: ({ historico_id, km_retorno }) => {
    db.prepare(
      `UPDATE historico_viaturas
       SET km_retorno = ?, data_retorno = datetime('now')
       WHERE id = ?`
    ).run(km_retorno ?? null, historico_id);
  },
  getHistoricoById: (id) =>
    db.prepare("SELECT * FROM historico_viaturas WHERE id = ?").get(id),
  historico: () =>
    db.prepare(`
      SELECT h.*, v.nome AS viatura_nome, m.nome AS militar_nome, m.nip
      FROM historico_viaturas h
      JOIN viaturas  v ON v.id = h.viatura_id
      JOIN militares m ON m.id = h.militar_id
      ORDER BY h.data_saida DESC
    `).all(),
};
