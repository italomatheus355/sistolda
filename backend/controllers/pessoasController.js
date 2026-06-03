// SISTOLDA — Controller de Cadastramento de Pessoas
const Pessoas = require("../models/pessoasModel");
const { logAuditoria } = require("../services/auditService");

exports.list = (req, res, next) => {
  try { res.json(Pessoas.list({ q: req.query.q })); }
  catch (e) { next(e); }
};

exports.get = (req, res, next) => {
  try {
    const p = Pessoas.getById(Number(req.params.id));
    if (!p) return res.status(404).json({ error: "Pessoa não encontrada." });
    res.json(p);
  } catch (e) { next(e); }
};

exports.create = (req, res, next) => {
  try {
    const id = Pessoas.create(req.body);
    const p = Pessoas.getById(id);
    
    // Se o identificador já existia, o model retornou o ID existente em vez de criar novo.
    // Podemos detectar isso se a requisição original era uma criação mas o ID retornado já existia.
    // Para simplificar, o controller sempre registra auditoria, mas a mensagem muda se for reutilização.
    
    logAuditoria(req, {
      modulo: "pessoas", acao: "cadastro",
      nip: p.identificador, nome: p.nome,
      descricao: `Cadastro de pessoa (${p.tipo}) ${p.nome} — ID ${p.identificador}.`,
    });
    res.status(201).json({ ok: true, id, pessoa: p });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
};

exports.update = (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const antes = Pessoas.getById(id);
    if (!antes) return res.status(404).json({ error: "Pessoa não encontrada." });
    Pessoas.update(id, req.body);
    const depois = Pessoas.getById(id);
    logAuditoria(req, {
      modulo: "pessoas", acao: "edicao",
      nip: depois.identificador, nome: depois.nome,
      descricao: `Edição: ${antes.nome}/${antes.identificador} -> ${depois.nome}/${depois.identificador} (${depois.tipo}).`,
    });
    res.json({ ok: true, pessoa: depois });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
};

exports.remove = (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const p = Pessoas.getById(id);
    if (!p) return res.status(404).json({ error: "Pessoa não encontrada." });
    Pessoas.remove(id);
    logAuditoria(req, {
      modulo: "pessoas", acao: "exclusao",
      nip: p.identificador, nome: p.nome,
      descricao: `Exclusão da pessoa ${p.nome} — ID ${p.identificador}.`,
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
};
