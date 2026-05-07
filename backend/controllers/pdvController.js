const Pdv = require("../models/pdvModel");

exports.get = (req, res) => {
  const row = Pdv.getByData(req.params.data);
  res.json(row || { data: req.params.data, tripulacao: [], missoes: [], config_asd: null, material_gsar: null });
};

exports.upsert = (req, res, next) => {
  try { res.json(Pdv.upsert(req.body)); }
  catch (e) { next(e); }
};
