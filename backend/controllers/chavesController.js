const Chaves = require("../models/chavesModel");

exports.list = (_req, res) => res.json(Chaves.list());
exports.historico = (_req, res) => res.json(Chaves.historico());

exports.retirada = (req, res, next) => {
  try {
    const { chave_id, militar, nip, cabo } = req.body;
    const chave = Chaves.getById(chave_id);
    if (!chave) return res.status(404).json({ error: "Chave não encontrada" });
    if (chave.status === "emprestada") return res.status(400).json({ error: "Chave já está emprestada" });
    const id = Chaves.retirar({ chave, militar, nip, cabo });
    res.status(201).json({ id, ok: true });
  } catch (e) { next(e); }
};

exports.devolucao = (req, res, next) => {
  try {
    const { chave_id, cabo } = req.body;
    const id = Chaves.devolver({ chave_id, cabo });
    res.json({ id, ok: true });
  } catch (e) { next(e); }
};
