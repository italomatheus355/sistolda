// SISTOLDA - Agendador interno (cron)
const cron = require("node-cron");
const { gerarRelatorioDiario, isoDate } = require("./relatoriosService");

// Default: todos os dias às 20:00 (hora local do servidor)
const SCHEDULE = process.env.SISTOLDA_RELATORIO_CRON || "0 20 * * *";

function startScheduler() {
  if (!cron.validate(SCHEDULE)) {
    console.error("[Scheduler] Expressão cron inválida:", SCHEDULE);
    return;
  }
  cron.schedule(SCHEDULE, async () => {
    const dateStr = isoDate();
    console.log(`[Scheduler] Executando geração diária (${dateStr})...`);
    try {
      await gerarRelatorioDiario(dateStr);
    } catch (e) {
      console.error("[Scheduler] Erro ao gerar relatório:", e);
    }
  }, { timezone: process.env.TZ || "America/Sao_Paulo" });

  console.log(`[Scheduler] Agendado: "${SCHEDULE}" (TZ=${process.env.TZ || "America/Sao_Paulo"})`);
}

module.exports = { startScheduler };
