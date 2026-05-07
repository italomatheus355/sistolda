const Materiais = require("../models/materiaisModel");

exports.list = (_req, res) => res.json(Materiais.list());

exports.create = (req, res) => {
  const { nome_material } = req.body;
  if (!nome_material) return res.status(400).json({ error: "nome_material obrigatório" });
  res.status(201).json(Materiais.create(req.body));
};
