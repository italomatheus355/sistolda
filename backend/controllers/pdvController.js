const Pdv = require("../models/pdvModel");

exports.list = (_req, res) => res.json(Pdv.list());

exports.upsert = (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: "data obrigatória (YYYY-MM-DD)" });
  res.status(201).json(Pdv.upsert(req.body));
};
