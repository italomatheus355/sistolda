// SISTOLDA — Agendador interno (cron) com gravação redundante (rede + local).
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { db } = require("../database/connection");
const {
  gerarRelatorioDiario, gerarRelatorioMensal,
  isoDate, writeRedundant, LOCAL_BASE,
} = require("./relatoriosService");

const SCHEDULE_DIARIO     = process.env.SISTOLDA_RELATORIO_CRON   || "0 20 * * *";
const SCHEDULE_MENSAL     = process.env.SISTOLDA_RELATORIO_MENSAL || "50 23 28-31 * *";
const SCHEDULE_BACKUP     = process.env.SISTOLDA_BACKUP_CRON      || "0 2 * * *";
const SCHEDULE_INTEGRITY  = process.env.SISTOLDA_INTEGRITY_CRON   || "0 3 * * *";
const RETRY_DELAY_MIN     = Number(process.env.SISTOLDA_RETRY_MIN || 10);
const RETRY_MAX           = Number(process.env.SISTOLDA_RETRY_MAX || 6);

function ts() { return new Date().toISOString().replace("T", " ").slice(0, 19); }
function log(tag, msg) { console.log(`[${tag}] ${ts()} ${msg}`); }
function err(tag, msg) { console.error(`[${tag}] ${ts()} ${msg}`); }

function audit({ modulo = "sistema", acao, descricao, nip = null, nome = null }) {
  try {
    db.prepare(`
      INSERT INTO logs_auditoria (modulo, acao, descricao, nip, nome, usuario, perfil)
      VALUES (?,?,?,?,?,?,?)
    `).run(modulo, acao, descricao, nip, nome, "scheduler", "system");
  } catch (e) { err("AUDIT", `falha registrando: ${e.message}`); }
}

function isLastDayOfMonth() {
  const d = new Date(); const t = new Date(d); t.setDate(d.getDate() + 1);
  return t.getDate() === 1;
}

// =================== RELATÓRIO DIÁRIO ===================
async function runRelatorioDiario({ dateStr = isoDate(), origin = "scheduler", attempt = 1 } = {}) {
  log("BACKUP", `Iniciando relatório diário (data=${dateStr}, origem=${origin}, tentativa=${attempt})`);
  audit({ acao: "relatorio.inicio", descricao: `Relatório diário ${dateStr} (origem=${origin}, tentativa=${attempt}).` });

  try {
    const r = await gerarRelatorioDiario(dateStr);
    log("BACKUP", `OK local=${r.localOk} rede=${r.networkOk} → ${r.pdfPath}`);
    if (!r.networkOk) {
      log("BACKUP", `Cópia de rede falhou: ${r.networkError || "indisponível"} (mantida cópia local).`);
      audit({ acao: "relatorio.rede_falha", descricao: `Rede indisponível para ${dateStr}: ${r.networkError || ""}` });
    }
    audit({
      acao: "relatorio.sucesso",
      descricao: `Relatório diário ${dateStr} salvo em ${r.dir}. PDF=${path.basename(r.pdfPath)} XLSX=${path.basename(r.xlsxPath)}.`,
    });
    return { ok: true, ...r };
  } catch (e) {
    const msg = `Erro gerando relatório: ${e.message}`;
    err("BACKUP", msg);
    audit({ acao: "relatorio.erro", descricao: msg });
    return scheduleRetry(dateStr, attempt, msg);
  }
}

function scheduleRetry(dateStr, attempt, motivo) {
  if (attempt >= RETRY_MAX) {
    err("BACKUP", `Tentativas esgotadas (${attempt}/${RETRY_MAX}) para ${dateStr}.`);
    audit({ acao: "relatorio.retry_esgotado", descricao: `Falha definitiva ${dateStr} após ${RETRY_MAX} tentativas. Último erro: ${motivo}` });
    return { ok: false, error: motivo };
  }
  const next = attempt + 1;
  log("BACKUP", `Nova tentativa em ${RETRY_DELAY_MIN} min — ${next}/${RETRY_MAX}.`);
  audit({ acao: "relatorio.retry_agendado", descricao: `Reagendado ${RETRY_DELAY_MIN}min (${next}/${RETRY_MAX}). Motivo: ${motivo}` });
  setTimeout(() => {
    runRelatorioDiario({ dateStr, origin: "retry", attempt: next }).catch(() => {});
  }, RETRY_DELAY_MIN * 60_000);
  return { ok: false, retryIn: RETRY_DELAY_MIN, attempt: next };
}

// =================== BACKUPS DB / LOGS ===================
async function backupDatabase() {
  const fn = `sistolda-${isoDate()}.db`;
  log("BACKUP-DB", `Iniciando -> DATABASE/${fn}`);
  try {
    const res = await writeRedundant("DATABASE", fn, async (target) => {
      await db.backup(target);
    });
    if (!res.localPath && !res.networkPath) throw new Error(res.localError || res.networkError || "indisponível");
    log("BACKUP-DB", `OK local=${!!res.localPath} rede=${!!res.networkPath} → ${res.localPath || res.networkPath}`);
    if (!res.networkPath) {
      log("BACKUP-DB", `Cópia de rede falhou: ${res.networkError || "indisponível"} (mantida local).`);
      audit({ acao: "backup_db.rede_falha", descricao: res.networkError || "rede indisponível" });
    }
    audit({ acao: "backup_db.sucesso", descricao: `DB salvo em ${res.localPath || res.networkPath}` });
  } catch (e) { err("BACKUP-DB", e.message); audit({ acao: "backup_db.erro", descricao: e.message }); }
}

async function backupLogs() {
  const fn = `logs-${isoDate()}.json`;
  try {
    const rows = db.prepare("SELECT * FROM logs_auditoria WHERE substr(timestamp,1,10) = ?").all(isoDate());
    const data = JSON.stringify(rows, null, 2);
    const res = await writeRedundant("LOGS", fn, (target) => fs.promises.writeFile(target, data, "utf8"));
    if (!res.localPath && !res.networkPath) throw new Error(res.localError || res.networkError || "indisponível");
    log("BACKUP-LOGS", `OK (${rows.length}) local=${!!res.localPath} rede=${!!res.networkPath}`);
    if (!res.networkPath) audit({ acao: "backup_logs.rede_falha", descricao: res.networkError || "rede indisponível" });
    audit({ acao: "backup_logs.sucesso", descricao: `${rows.length} logs salvos.` });
  } catch (e) { err("BACKUP-LOGS", e.message); audit({ acao: "backup_logs.erro", descricao: e.message }); }
}

function integrityCheck() {
  try {
    const r = db.pragma("integrity_check");
    const ok = Array.isArray(r) && r[0]?.integrity_check === "ok";
    audit({ acao: "integrity_check", descricao: ok ? "OK" : `FALHA: ${JSON.stringify(r)}` });
    log("INTEGRITY", ok ? "OK" : `FALHA: ${JSON.stringify(r)}`);
  } catch (e) { err("INTEGRITY", e.message); }
}

// =================== START ===================
function startScheduler() {
  const TZ = process.env.TZ || "America/Sao_Paulo";
  log("SCHEDULER", `Diretório local: ${LOCAL_BASE}`);

  if (cron.validate(SCHEDULE_DIARIO)) {
    cron.schedule(SCHEDULE_DIARIO, () => {
      runRelatorioDiario({ origin: "cron-diario" }).catch(() => {});
    }, { timezone: TZ });
  }

  if (cron.validate(SCHEDULE_MENSAL)) {
    cron.schedule(SCHEDULE_MENSAL, async () => {
      if (!isLastDayOfMonth()) return;
      const mes = new Date().toISOString().slice(0, 7);
      log("BACKUP-MENSAL", `Iniciando ${mes}`);
      audit({ acao: "relatorio_mensal.inicio", descricao: `Iniciando ${mes}` });
      try {
        const r = await gerarRelatorioMensal(mes);
        log("BACKUP-MENSAL", `Concluído: ${r.pdfPath}`);
        audit({ acao: "relatorio_mensal.sucesso", descricao: `Mensal ${mes} em ${r.dir}` });
      } catch (e) {
        err("BACKUP-MENSAL", e.message);
        audit({ acao: "relatorio_mensal.erro", descricao: e.message });
      }
    }, { timezone: TZ });
  }

  if (cron.validate(SCHEDULE_BACKUP)) {
    cron.schedule(SCHEDULE_BACKUP, () => { backupDatabase(); backupLogs(); }, { timezone: TZ });
  }

  if (cron.validate(SCHEDULE_INTEGRITY)) {
    cron.schedule(SCHEDULE_INTEGRITY, integrityCheck, { timezone: TZ });
  }

  log("SCHEDULER", `Diário="${SCHEDULE_DIARIO}" Mensal="${SCHEDULE_MENSAL}" Backup="${SCHEDULE_BACKUP}" Integridade="${SCHEDULE_INTEGRITY}" TZ=${TZ}`);
}

module.exports = { startScheduler, runRelatorioDiario, backupDatabase, backupLogs };
