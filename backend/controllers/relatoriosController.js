const { isoDate } = require("../services/relatoriosService");
const { runRelatorioDiario } = require("../services/scheduler");
const { logAuditoria } = require("../services/auditService");

exports.gerarHoje = async (req, res, next) => {
  try {
    logAuditoria(req, {
      modulo: "relatorios", acao: "gerar_manual",
      descricao: `Solicitada geração manual do relatório do dia ${isoDate()}.`,
    });
    const r = await runRelatorioDiario({ dateStr: isoDate(), origin: "manual" });
    if (!r.ok) return res.status(500).json({ ok: false, error: r.error || "Falha ao gerar." });
    res.json({ ok: true, ...r });
  } catch (e) { next(e); }
};

exports.gerarData = async (req, res, next) => {
  try {
    const { data } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ error: "Data inválida (use YYYY-MM-DD)" });
    }
    logAuditoria(req, {
      modulo: "relatorios", acao: "gerar_manual",
      descricao: `Solicitada geração manual do relatório ${data}.`,
    });
    const r = await runRelatorioDiario({ dateStr: data, origin: "manual" });
    if (!r.ok) return res.status(500).json({ ok: false, error: r.error || "Falha ao gerar." });
    res.json({ ok: true, ...r });
  } catch (e) { next(e); }
};
