const { gerarRelatorioDiario, isoDate } = require("../services/relatoriosService");

exports.gerarHoje = async (_req, res, next) => {
  try {
    const r = await gerarRelatorioDiario(isoDate());
    res.json({ ok: true, ...r });
  } catch (e) { next(e); }
};

exports.gerarData = async (req, res, next) => {
  try {
    const { data } = req.params; // YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ error: "Data inválida (use YYYY-MM-DD)" });
    }
    const r = await gerarRelatorioDiario(data);
    res.json({ ok: true, ...r });
  } catch (e) { next(e); }
};
