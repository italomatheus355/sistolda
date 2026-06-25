const { db } = require("../database/connection");

const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

module.exports = {
  list: () => db.prepare("SELECT * FROM visitantes ORDER BY hora_entrada DESC").all(),
  create: (v) => {
    const r = db.prepare(`
      INSERT INTO visitantes
        (nome, documento, militar_responsavel, local_destino, observacoes, cabo_registro,
         cpf, rg, telefone, organizacao, recorrente_id, tipo,
         civil_id, militar_externo_id, forca_militar, posto_graduacao, origem_identificacao, hora_entrada)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now','localtime'))
    `).run(
      v.nome,
      v.documento,
      v.militar_responsavel || "",
      v.local_destino,
      v.observacoes || null,
      v.cabo_registro || null,
      onlyDigits(v.cpf) || null,
      v.rg || null,
      v.telefone || null,
      v.organizacao || null,
      v.recorrente_id || null,
      v.tipo === "recorrente" ? "recorrente" : (v.tipo === "civil" ? "civil" : (v.tipo === "militar_externo" ? "militar_externo" : "comum")),
      v.civil_id || null,
      v.militar_externo_id || null,
      v.forca_militar || null,
      v.posto_graduacao || null,
      v.origem_identificacao || "manual",
    );
    return r.lastInsertRowid;
  },
  registrarSaida: (id) =>
    db.prepare("UPDATE visitantes SET hora_saida = datetime('now','localtime') WHERE id = ?").run(id),
};
