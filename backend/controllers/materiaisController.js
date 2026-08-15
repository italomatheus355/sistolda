const Materiais = require("../models/materiaisModel");
const { logAuditoria } = require("../services/auditService");

exports.list = (_req, res) => res.json(Materiais.list());
exports.create = (req, res, next) => {
  try { res.status(201).json({ id: Materiais.create(req.body), ok: true }); }
  catch (e) { next(e); }
};
exports.saida = (req, res, next) => {
  try {
    const reg = Materiais.saida(req.params.id, req.body?.cabo);
    logAuditoria(req, {
      modulo: "materiais",
      acao: "saida_material",
      nip: reg.nip,
      nome: reg.militar,
      descricao: `Saída do material "${reg.nome_material}" (${reg.destino})`,
    });
    res.json({ ok: true, registro: reg });
  } catch (e) { next(e); }
};
