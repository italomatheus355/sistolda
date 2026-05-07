const Visitantes = require("../models/visitantesModel");

exports.list = (_req, res) => res.json(Visitantes.list());
exports.create = (req, res, next) => {
  try { res.status(201).json({ id: Visitantes.create(req.body), ok: true }); }
  catch (e) { next(e); }
};
exports.saida = (req, res, next) => {
  try { Visitantes.registrarSaida(req.params.id); res.json({ ok: true }); }
  catch (e) { next(e); }
};
