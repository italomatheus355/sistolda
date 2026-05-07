const Militares = require("../models/militaresModel");

exports.list = (_req, res) => res.json(Militares.list());

exports.create = (req, res) => {
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: "nome obrigatório" });
  res.status(201).json(Militares.create(req.body));
};

exports.getByBiometria = (req, res) => {
  const m = Militares.getByBiometria(req.params.biometria_id);
  if (!m) return res.status(404).json({ error: "Militar não encontrado" });
  res.json(m);
};
