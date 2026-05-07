const Viaturas = require("../models/viaturasModel");

exports.list = (_req, res) => res.json(Viaturas.list());
exports.historico = (_req, res) => res.json(Viaturas.historico());

exports.saida = (req, res, next) => {
  try {
    const { viatura_id, motorista, nip, destino, cabo } = req.body;
    const viatura = Viaturas.getById(viatura_id);
    if (!viatura) return res.status(404).json({ error: "Viatura não encontrada" });
    if (viatura.status !== "disponivel") return res.status(400).json({ error: "Viatura indisponível" });
    const id = Viaturas.saida({ viatura, motorista, nip, destino, cabo });
    res.status(201).json({ id, km_saida: viatura.km_atual, ok: true });
  } catch (e) { next(e); }
};

exports.retorno = (req, res, next) => {
  try {
    const { viatura_id, km_retorno, autonomia, cabo } = req.body;
    const id = Viaturas.retorno({ viatura_id, km_retorno, autonomia, cabo });
    res.json({ id, ok: true });
  } catch (e) { next(e); }
};
