const Materiais = require("../models/materiaisModel");

exports.list = (_req, res) => res.json(Materiais.list());
exports.create = (req, res, next) => {
  try { res.status(201).json({ id: Materiais.create(req.body), ok: true }); }
  catch (e) { next(e); }
};
