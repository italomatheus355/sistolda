const { db } = require("../database/connection");

module.exports = {
  getByData: (data) => {
    const row = db.prepare("SELECT * FROM pdv WHERE data = ?").get(data);
    if (!row) return null;
    return {
      ...row,
      tripulacao: JSON.parse(row.tripulacao || "[]"),
      missoes: JSON.parse(row.missoes || "[]"),
    };
  },
  upsert: ({ data, tripulacao, missoes, config_asd, material_gsar }) => {
    const trip = JSON.stringify(tripulacao || []);
    const miss = JSON.stringify(missoes || []);
    db.prepare(`
      INSERT INTO pdv (data, tripulacao, missoes, config_asd, material_gsar)
      VALUES (?,?,?,?,?)
      ON CONFLICT(data) DO UPDATE SET
        tripulacao=excluded.tripulacao,
        missoes=excluded.missoes,
        config_asd=excluded.config_asd,
        material_gsar=excluded.material_gsar
    `).run(data, trip, miss, config_asd || null, material_gsar || null);
    return module.exports.getByData(data);
  },
};
