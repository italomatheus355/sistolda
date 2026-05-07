const Chaves = require("../models/chavesModel");

exports.list = (_req, res) => res.json(Chaves.list());

exports.retirada = (req, res) => {
  const { chave_id, militar_id, recebido_por } = req.body;
  if (!chave_id || !militar_id)
    return res.status(400).json({ error: "chave_id e militar_id obrigatórios" });
  const chave = Chaves.getById(chave_id);
  if (!chave) return res.status(404).json({ error: "Chave não encontrada" });
  if (chave.status === "emprestada")
    return res.status(409).json({ error: "Chave já está emprestada" });
  Chaves.setStatus(chave_id, "emprestada");
  const id = Chaves.registrarOperacao({ chave_id, militar_id, tipo_operacao: "retirada", recebido_por });
  res.status(201).json({ id, ok: true });
};

exports.devolucao = (req, res) => {
  const { chave_id, militar_id, recebido_por } = req.body;
  if (!chave_id || !militar_id)
    return res.status(400).json({ error: "chave_id e militar_id obrigatórios" });
  Chaves.setStatus(chave_id, "disponivel");
  const id = Chaves.registrarOperacao({ chave_id, militar_id, tipo_operacao: "devolucao", recebido_por });
  res.status(201).json({ id, ok: true });
};

exports.historico = (_req, res) => res.json(Chaves.historico());
