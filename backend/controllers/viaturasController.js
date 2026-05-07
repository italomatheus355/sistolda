const Viaturas = require("../models/viaturasModel");

exports.list = (_req, res) => res.json(Viaturas.list());

exports.saida = (req, res) => {
  const { viatura_id, militar_id, destino, km_saida } = req.body;
  if (!viatura_id || !militar_id)
    return res.status(400).json({ error: "viatura_id e militar_id obrigatórios" });
  const v = Viaturas.getById(viatura_id);
  if (!v) return res.status(404).json({ error: "Viatura não encontrada" });
  if (v.status === "em_uso")
    return res.status(409).json({ error: "Viatura já está em uso" });
  Viaturas.setStatus(viatura_id, "em_uso");
  const historico_id = Viaturas.registrarSaida({ viatura_id, militar_id, destino, km_saida });
  res.status(201).json({ historico_id, ok: true });
};

exports.retorno = (req, res) => {
  const { historico_id, km_retorno } = req.body;
  if (!historico_id)
    return res.status(400).json({ error: "historico_id obrigatório" });
  const h = Viaturas.getHistoricoById(historico_id);
  if (!h) return res.status(404).json({ error: "Registro não encontrado" });
  Viaturas.registrarRetorno({ historico_id, km_retorno });
  Viaturas.setStatus(h.viatura_id, "disponivel");
  if (km_retorno != null) Viaturas.setKm(h.viatura_id, km_retorno);
  res.json({ ok: true });
};

exports.historico = (_req, res) => res.json(Viaturas.historico());
