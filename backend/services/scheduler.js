// SISTOLDA — Agendador interno (cron) com logs detalhados, validação de
// diretório, retry em caso de falha de rede/SMB e auditoria centralizada.
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { db } = require("../database/connection");
const {
  gerarRelatorioDiario, gerarRelatorioMensal,
  isoDate, resolveBackupDir,
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

// =================== EXECUÇÃO DO RELATÓRIO DIÁRIO ===================
async function runRelatorioDiario({ dateStr = isoDate(), origin = "scheduler", attempt = 1 } = {}) {
  log("BACKUP", `Iniciando relatório diário (data=${dateStr}, origem=${origin}, tentativa=${attempt})`);
  audit({ acao: "relatorio.inicio", descricao: `Iniciando relatório diário ${dateStr} (origem=${origin}, tentativa=${attempt}).` });

  // 1) Resolve/cria diretório de destino (rede ou fallback local)
  const dir = resolveBackupDir("RELATORIOS", "DIARIO", dateStr);
  if (!dir) {
    const msg = `Falha ao acessar/criar diretório de relatório (rede e local indisponíveis).`;
    err("BACKUP", msg);
    audit({ acao: "relatorio.falha", descricao: msg });
    return scheduleRetry(dateStr, attempt, msg);
  }
  log("BACKUP", `Caminho destino: ${dir}`);

  try {
    const r = await gerarRelatorioDiario(dateStr);
    log("BACKUP", `Relatório gerado com sucesso: ${r.pdfPath}`);
    log("BACKUP", `Relatório gerado com sucesso: ${r.xlsxPath}`);
    audit({
      acao: "relatorio.sucesso",
      descricao: `Relatório diário ${dateStr} gerado em ${r.dir}. PDF=${path.basename(r.pdfPath)} XLSX=${path.basename(r.xlsxPath)}.`,
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
    audit({ acao: "relatorio.retry_esgotado", descricao: `Não foi possível gerar relatório ${dateStr} após ${RETRY_MAX} tentativas. Último erro: ${motivo}` });
    return { ok: false, error: motivo };
  }
  const next = attempt + 1;
  log("BACKUP", `Tentativa de nova execução em ${RETRY_DELAY_MIN} minuto(s) — tentativa ${next}/${RETRY_MAX}.`);
  audit({ acao: "relatorio.retry_agendado", descricao: `Reagendado para ${RETRY_DELAY_MIN}min (tentativa ${next}/${RETRY_MAX}). Motivo: ${motivo}` });
  setTimeout(() => {
    runRelatorioDiario({ dateStr, origin: "retry", attempt: next }).catch(() => {});
  }, RETRY_DELAY_MIN * 60_000);
  return { ok: false, retryIn: RETRY_DELAY_MIN, attempt: next };
}

// =================== BACKUPS / INTEGRIDADE ===================
function backupDatabase() {
  const dir = resolveBackupDir("DB");
  if (!dir) { err("BACKUP-DB", "Diretório indisponível (rede e local)."); return; }
  const file = path.join(dir, `sistolda-${isoDate()}.db`);
  log("BACKUP-DB", `Iniciando backup -> ${file}`);
  try {
    db.backup(file)
      .then(() => { log("BACKUP-DB", "Backup concluído com sucesso."); audit({ acao: "backup_db.sucesso", descricao: `DB salvo em ${file}` }); })
      .catch((e) => { err("BACKUP-DB", `erro: ${e.message}`); audit({ acao: "backup_db.erro", descricao: e.message }); });
  } catch (e) { err("BACKUP-DB", `indisponível: ${e.message}`); }
}

function backupLogs() {
  const dir = resolveBackupDir("LOGS");
  if (!dir) { err("BACKUP-LOGS", "Diretório indisponível."); return; }
  const file = path.join(dir, `logs-${isoDate()}.json`);
  try {
    const rows = db.prepare("SELECT * FROM logs_auditoria WHERE substr(timestamp,1,10) = ?").all(isoDate());
    fs.writeFileSync(file, JSON.stringify(rows, null, 2), "utf8");
    log("BACKUP-LOGS", `Logs salvos (${rows.length}) em ${file}`);
    audit({ acao: "backup_logs.sucesso", descricao: `${rows.length} logs em ${file}` });
  } catch (e) { err("BACKUP-LOGS", `erro: ${e.message}`); audit({ acao: "backup_logs.erro", descricao: e.message }); }
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

  if (cron.validate(SCHEDULE_DIARIO)) {
    cron.schedule(SCHEDULE_DIARIO, () => {
      runRelatorioDiario({ origin: "cron-diario" }).catch(() => {});
    }, { timezone: TZ });
  }

  if (cron.validate(SCHEDULE_MENSAL)) {
    cron.schedule(SCHEDULE_MENSAL, async () => {
      if (!isLastDayOfMonth()) return;
      const mes = new Date().toISOString().slice(0, 7);
      log("BACKUP-MENSAL", `Iniciando relatório mensal ${mes}`);
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

module.exports = { startScheduler, runRelatorioDiario };
