const Civis = require("../models/visitantesCivisModel");

exports.list = (_req, res) => res.json(Civis.list());

exports.get = (req, res) => {
  const r = Civis.get(req.params.id);
  if (!r) return res.status(404).json({ error: "Visitante civil não encontrado" });
  res.json(r);
};

exports.getByCpf = (req, res) => {
  const r = Civis.getByCpf(req.params.cpf);
  if (!r) return res.status(404).json({ error: "Não encontrado" });
  res.json(r);
};

exports.getByRg = (req, res) => {
  const r = Civis.getByRg(req.params.rg);
  if (!r) return res.status(404).json({ error: "Não encontrado" });
  res.json(r);
};

exports.create = (req, res, next) => {
  try {
    const { nome, cpf } = req.body || {};
    if (!nome || !cpf) return res.status(400).json({ error: "Nome e CPF são obrigatórios" });
    const existing = Civis.getByCpf(cpf);
    if (existing) return res.status(409).json({ error: "CPF já cadastrado", id: existing.id });
    const id = Civis.create(req.body);
    res.status(201).json({ id, ok: true });
  } catch (e) { next(e); }
};

exports.update = (req, res, next) => {
  try { Civis.update(req.params.id, req.body || {}); res.json({ ok: true }); }
  catch (e) { next(e); }
};
