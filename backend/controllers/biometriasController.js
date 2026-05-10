const Biometrias = require("../models/biometriasModel");

exports.list = (_req, res) => res.json(Biometrias.list());

exports.getByNip = (req, res) => {
  const b = Biometrias.getByNip(req.params.nip);
  if (!b) return res.status(404).json({ error: "Biometria não encontrada" });
  res.json(b);
};

exports.create = (req, res, next) => {
  try {
    const { identificacao, nip, template, leituras } = req.body || {};
    if (!identificacao || !nip) {
      return res.status(400).json({ error: "Identificação e NIP são obrigatórios" });
    }
    if (!/^\d{8}$/.test(String(nip))) {
      return res.status(400).json({ error: "NIP deve conter exatamente 8 dígitos" });
    }
    const id = Biometrias.create({
      identificacao: String(identificacao).trim(),
      nip: String(nip).trim(),
      template: template || null,
      leituras: Number.isInteger(leituras) ? leituras : 0,
    });
    res.status(201).json({ id, ok: true });
  } catch (e) {
    next(e);
  }
};

exports.setStatus = (req, res, next) => {
  try {
    Biometrias.setStatus(req.params.id, req.body.status);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};

exports.remove = (req, res, next) => {
  try {
    Biometrias.remove(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
