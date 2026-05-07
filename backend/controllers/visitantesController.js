const Visitantes = require("../models/visitantesModel");

exports.list = (_req, res) => res.json(Visitantes.list());

exports.create = (req, res) => {
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: "nome obrigatório" });
  res.status(201).json(Visitantes.create(req.body));
};

exports.saida = (req, res) => {
  Visitantes.registrarSaida(req.params.id);
  res.json({ ok: true });
};
