const db = require("../database/connection");

module.exports = {
  list: () => db.prepare("SELECT * FROM materiais ORDER BY data_registro DESC").all(),
  create: ({ nome_material, militar_responsavel, destino }) => {
    const r = db.prepare(
      "INSERT INTO materiais (nome_material, militar_responsavel, destino) VALUES (?, ?, ?)"
    ).run(nome_material, militar_responsavel || null, destino || null);
    return db.prepare("SELECT * FROM materiais WHERE id = ?").get(r.lastInsertRowid);
  },
};
