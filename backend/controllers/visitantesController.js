const Visitantes = require("../models/visitantesModel");
const Pessoas = require("../models/pessoasModel");
const { logAuditoria } = require("../services/auditService");

exports.list = (_req, res) => res.json(Visitantes.list());
exports.create = (req, res, next) => {
  try { res.status(201).json({ id: Visitantes.create(req.body), ok: true }); }
  catch (e) { next(e); }
};
exports.saida = (req, res, next) => {
  try { Visitantes.registrarSaida(req.params.id); res.json({ ok: true }); }
  catch (e) { next(e); }
};

// Entrada SEM biometria — utiliza obrigatoriamente um cadastro já existente
// em /pessoas. Nunca cria/duplica pessoa.
exports.entradaManual = (req, res, next) => {
  try {
    const { pessoa_id, identificador, local_destino, observacoes, cabo } = req.body || {};
    const destino = String(local_destino || "").trim();
    if (!destino) return res.status(400).json({ error: "Informe o destino." });

    const pessoa = pessoa_id
      ? Pessoas.getById(Number(pessoa_id))
      : Pessoas.getByIdentificador(String(identificador || "").replace(/\D/g, ""));
    if (!pessoa) return res.status(404).json({ error: "Pessoa não cadastrada. Realize o cadastro antes." });

    const suffix = pessoa.tipo === "exercito" ? " (EB)" : pessoa.tipo === "civil" ? " (Civil)" : "";
    const base = pessoa.tipo === "marinha" && pessoa.posto_graduacao
      ? `${pessoa.posto_graduacao} ${pessoa.nome}`
      : pessoa.nome;
    const nomeFmt = `${base}${suffix}`;

    const id = Visitantes.create({
      nome: nomeFmt,
      documento: pessoa.identificador,
      militar_responsavel: "—",
      local_destino: destino,
      observacoes: observacoes || null,
      cabo_registro: (cabo || "").trim() || null,
      cpf: pessoa.cpf || null,
      rg: pessoa.rg || null,
      telefone: pessoa.telefone || null,
      posto_graduacao: pessoa.posto_graduacao || null,
      tipo: pessoa.tipo === "exercito" ? "militar_externo" : (pessoa.tipo === "civil" ? "civil" : "comum"),
      origem_identificacao: "manual",
    });

    const descricao = `${nomeFmt} (${pessoa.identificador}) registrou entrada SEM biometria (destino: ${destino}).`;
    logAuditoria(req, { modulo: "visitantes", acao: "entrada_sem_biometria", nip: pessoa.identificador, nome: nomeFmt, descricao });
    res.status(201).json({ ok: true, id, nome: nomeFmt, nip: pessoa.identificador, descricao });
  } catch (e) { next(e); }
};
