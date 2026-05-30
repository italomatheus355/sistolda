// SISTOLDA — Agendador interno (cron)
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { db } = require("../database/connection");
const { gerarRelatorioDiario, gerarRelatorioMensal, isoDate, resolveBackupDir } = require("./relatoriosService");

const SCHEDULE_DIARIO  = process.env.SISTOLDA_RELATORIO_CRON   || "0 20 * * *";
const SCHEDULE_MENSAL  = process.env.SISTOLDA_RELATORIO_MENSAL || "50 23 28-31 * *"; // último dia do mês (verifica em runtime)
const SCHEDULE_BACKUP  = process.env.SISTOLDA_BACKUP_CRON      || "0 2 * * *";
const SCHEDULE_INTEGRITY = process.env.SISTOLDA_INTEGRITY_CRON || "0 3 * * *";

function isLastDayOfMonth() {
  const d = new Date(); const t = new Date(d); t.setDate(d.getDate() + 1);
  return t.getDate() === 1;
}

function backupDatabase() {
  const dir = resolveBackupDir("DB");
  if (!dir) return;
  const file = path.join(dir, `sistolda-${isoDate()}.db`);
  try {
    db.backup(file).then(() => console.log("[Backup] DB salvo em", file))
      .catch((e) => console.error("[Backup] erro:", e.message));
  } catch (e) { console.error("[Backup] indisponível:", e.message); }
}

function backupLogs() {
  const dir = resolveBackupDir("LOGS");
  if (!dir) return;
  const file = path.join(dir, `logs-${isoDate()}.json`);
  try {
    const rows = db.prepare("SELECT * FROM logs_auditoria WHERE substr(timestamp,1,10) = ?").all(isoDate());
    fs.writeFileSync(file, JSON.stringify(rows, null, 2), "utf8");
    console.log("[Backup] Logs salvos em", file);
  } catch (e) { console.error("[Backup] logs erro:", e.message); }
}

function integrityCheck() {
  try {
    const r = db.pragma("integrity_check");
    const ok = Array.isArray(r) && r[0]?.integrity_check === "ok";
    db.prepare(`
      INSERT INTO logs_auditoria (modulo, acao, descricao)
      VALUES ('sistema','integrity_check', ?)
    `).run(ok ? "OK" : `FALHA: ${JSON.stringify(r)}`);
    console.log("[Integrity] resultado:", ok ? "OK" : r);
  } catch (e) { console.error("[Integrity] erro:", e.message); }
}

function startScheduler() {
  const TZ = process.env.TZ || "America/Sao_Paulo";

  if (cron.validate(SCHEDULE_DIARIO)) {
    cron.schedule(SCHEDULE_DIARIO, async () => {
      try { await gerarRelatorioDiario(isoDate()); }
      catch (e) { console.error("[Scheduler diário] erro:", e); }
    }, { timezone: TZ });
  }

  if (cron.validate(SCHEDULE_MENSAL)) {
    cron.schedule(SCHEDULE_MENSAL, async () => {
      if (!isLastDayOfMonth()) return;
      try { await gerarRelatorioMensal(new Date().toISOString().slice(0, 7)); }
      catch (e) { console.error("[Scheduler mensal] erro:", e); }
    }, { timezone: TZ });
  }

  if (cron.validate(SCHEDULE_BACKUP)) {
    cron.schedule(SCHEDULE_BACKUP, () => { backupDatabase(); backupLogs(); }, { timezone: TZ });
  }

  if (cron.validate(SCHEDULE_INTEGRITY)) {
    cron.schedule(SCHEDULE_INTEGRITY, integrityCheck, { timezone: TZ });
  }

  console.log(`[Scheduler] Diário="${SCHEDULE_DIARIO}" Mensal="${SCHEDULE_MENSAL}" Backup="${SCHEDULE_BACKUP}" Integridade="${SCHEDULE_INTEGRITY}" TZ=${TZ}`);
}

module.exports = { startScheduler };
