const Militares = require("../models/militaresModel");

exports.list = (_req, res) => res.json(Militares.list());
exports.getByNip = (req, res) => {
  const m = Militares.getByNip(req.params.nip);
  if (!m) return res.status(404).json({ error: "Militar não encontrado" });
  res.json(m);
};
exports.create = (req, res, next) => {
  try { res.status(201).json({ id: Militares.create(req.body), ok: true }); }
  catch (e) { next(e); }
};
exports.setBiometria = (req, res, next) => {
  try {
    Militares.setBiometria(req.params.nip, req.body.biometria_id);
    res.json({ ok: true });
  } catch (e) { next(e); }
};
