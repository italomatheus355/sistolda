const Recorrentes = require("../models/visitantesRecorrentesModel");

exports.list = (_req, res) => res.json(Recorrentes.list());

exports.get = (req, res) => {
  const r = Recorrentes.get(req.params.id);
  if (!r) return res.status(404).json({ error: "Recorrente não encontrado" });
  res.json(r);
};

exports.getByCpf = (req, res) => {
  const r = Recorrentes.getByCpf(req.params.cpf);
  if (!r) return res.status(404).json({ error: "Recorrente não encontrado" });
  res.json(r);
};

exports.create = (req, res, next) => {
  try {
    const { nome, cpf } = req.body || {};
    if (!nome || !cpf) return res.status(400).json({ error: "Nome e CPF são obrigatórios" });
    const existing = Recorrentes.getByCpf(cpf);
    if (existing) return res.status(409).json({ error: "CPF já cadastrado", id: existing.id });
    const id = Recorrentes.create(req.body);
    res.status(201).json({ id, ok: true });
  } catch (e) { next(e); }
};

exports.update = (req, res, next) => {
  try { Recorrentes.update(req.params.id, req.body || {}); res.json({ ok: true }); }
  catch (e) { next(e); }
};

exports.setStatus = (req, res, next) => {
  try { Recorrentes.setStatus(req.params.id, req.body.status); res.json({ ok: true }); }
  catch (e) { next(e); }
};
