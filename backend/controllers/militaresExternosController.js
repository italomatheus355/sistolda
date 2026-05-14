const Externos = require("../models/militaresExternosModel");

exports.list = (_req, res) => res.json(Externos.list());

exports.get = (req, res) => {
  const r = Externos.get(req.params.id);
  if (!r) return res.status(404).json({ error: "Militar externo não encontrado" });
  res.json(r);
};

exports.getByCpf = (req, res) => {
  const r = Externos.getByCpf(req.params.cpf);
  if (!r) return res.status(404).json({ error: "Não encontrado" });
  res.json(r);
};

exports.create = (req, res, next) => {
  try {
    const { nome, cpf } = req.body || {};
    if (!nome || !cpf) return res.status(400).json({ error: "Nome e CPF são obrigatórios" });
    const existing = Externos.getByCpf(cpf);
    if (existing) return res.status(409).json({ error: "CPF já cadastrado", id: existing.id });
    const id = Externos.create(req.body);
    res.status(201).json({ id, ok: true });
  } catch (e) { next(e); }
};

exports.update = (req, res, next) => {
  try { Externos.update(req.params.id, req.body || {}); res.json({ ok: true }); }
  catch (e) { next(e); }
};

exports.identificarBiometria = (req, res) => {
  const { id, template } = req.body || {};
  const r = Externos.identifyByBiometria(id || template);
  if (!r) return res.status(404).json({ error: "Biometria não reconhecida" });
  res.json(r);
};
