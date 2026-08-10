// SISTOLDA — Administração da matriz de autorização das chaves.
// Acesso restrito a admin / seg_org (aplicado nas rotas).
const Aut = require("../services/autorizacaoChaves");
const Pessoas = require("../models/pessoasModel");
const Militares = require("../models/militaresModel");
const { logAuditoria } = require("../services/auditService");

exports.matriz = (_req, res, next) => {
  try { res.json(Aut.listarMatriz()); } catch (e) { next(e); }
};

exports.adicionar = (req, res, next) => {
  try {
    const { chave_numero, pessoa_id, nip, nome_ref, condicional } = req.body || {};
    let nome = (nome_ref || "").trim();
    let ident = String(nip || "").replace(/\D/g, "") || null;

    if (pessoa_id) {
      const p = Pessoas.getById(Number(pessoa_id));
      if (!p) return res.status(404).json({ error: "Pessoa não encontrada." });
      ident = String(p.identificador || "").replace(/\D/g, "") || ident;
      nome = [p.posto_graduacao, p.nome].filter(Boolean).join(" ").trim();
    } else if (!nome && ident) {
      const m = Militares.getByNip(ident);
      if (m) nome = [m.posto_graduacao, m.nome].filter(Boolean).join(" ").trim();
    }
    if (!nome) return res.status(400).json({ error: "Informe o militar a autorizar." });

    const row = Aut.adicionarAutorizacao({ chave_numero, nip: ident, nome_ref: nome, condicional });
    logAuditoria(req, {
      modulo: "chaves", acao: "autorizacao_adicionada", nip: ident, nome,
      descricao: `Autorização adicionada: ${nome}${ident ? ` (NIP ${ident})` : ""} — chave Nº ${String(chave_numero).padStart(2, "0")}.`,
    });
    res.status(201).json({ ok: true, autorizacao: row });
  } catch (e) { next(e); }
};

exports.remover = (req, res, next) => {
  try {
    const row = Aut.removerAutorizacao(req.params.id);
    logAuditoria(req, {
      modulo: "chaves", acao: "autorizacao_removida", nip: row.nip, nome: row.nome_ref,
      descricao: `Autorização removida: ${row.nome_ref} — chave Nº ${String(row.chave_numero).padStart(2, "0")}.`,
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
};
