// SISTOLDA — Agendador interno (cron) com gravação redundante em 3 destinos
// independentes: Servidor Local, Rede Informática e Rede SEGORG.
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { db } = require("../database/connection");
const {
  gerarRelatorioDiario, gerarRelatorioMensal,
  isoDate, writeRedundant, diagnosticarDestinos, LOCAL_BASE,
} = require("./relatoriosService");

const SCHEDULE_DIARIO     = process.env.SISTOLDA_RELATORIO_CRON   || "0 20 * * *";
const SCHEDULE_MENSAL     = process.env.SISTOLDA_RELATORIO_MENSAL || "0 20 1 * *";
const SCHEDULE_BACKUP     = process.env.SISTOLDA_BACKUP_CRON      || "0 20 * * *";
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

    for (const d of r.destinos || []) {
      const linha = `${d.label}: ${d.ok ? "SUCESSO" : `ERRO — ${d.error}`}`;
      log("BACKUP", linha);
      audit({
        acao: d.ok ? "relatorio.destino_ok" : "relatorio.destino_erro",
        descricao: `Relatório ${dateStr} — ${linha}`,
      });
    }

    if (!r.localOk && !r.networkOk) {
      throw new Error(r.errors.join(" | ") || "nenhum destino disponível");
    }

    audit({
      acao: "relatorio.sucesso",
      descricao: `Relatório diário ${dateStr} processado. PDF=${r.pdfPath ? path.basename(r.pdfPath) : "—"} XLSX=${r.xlsxPath ? path.basename(r.xlsxPath) : "—"}.`,
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
// Registra o resultado de CADA destino individualmente (log + auditoria).
function reportarDestinos(tag, titulo, destinos) {
  for (const d of destinos || []) {
    const linha = `${d.label}: ${d.ok ? "SUCESSO" : `ERRO — ${d.error}`}`;
    log(tag, linha);
    audit({
      acao: d.ok ? `${tag.toLowerCase()}.destino_ok` : `${tag.toLowerCase()}.destino_erro`,
      descricao: `${titulo} — ${linha}`,
    });
  }
}

async function backupDatabase() {
  const fn = `sistolda-${isoDate()}.db`;
  log("BACKUP-DB", `Iniciando -> DATABASE/${fn}`);
  try {
    const res = await writeRedundant("DATABASE", fn, async (target) => {
      await db.backup(target);
    });
    reportarDestinos("BACKUP-DB", `Backup do banco DATABASE/${fn}`, res.destinos);
    const algum = res.destinos.some((d) => d.ok);
    if (!algum) throw new Error(res.errors.join(" | ") || "nenhum destino disponível");
    return res;
  } catch (e) {
    err("BACKUP-DB", e.message);
    audit({ acao: "backup_db.erro", descricao: e.message });
    return { destinos: [], errors: [e.message] };
  }
}

async function backupLogs() {
  const fn = `logs-${isoDate()}.json`;
  try {
    const rows = db.prepare("SELECT * FROM logs_auditoria WHERE substr(timestamp,1,10) = ?").all(isoDate());
    const data = JSON.stringify(rows, null, 2);
    const res = await writeRedundant("LOGS", fn, (target) => fs.promises.writeFile(target, data, "utf8"));
    reportarDestinos("BACKUP-LOGS", `Backup de logs (${rows.length} registros) LOGS/${fn}`, res.destinos);
    const algum = res.destinos.some((d) => d.ok);
    if (!algum) throw new Error(res.errors.join(" | ") || "nenhum destino disponível");
    return res;
  } catch (e) {
    err("BACKUP-LOGS", e.message);
    audit({ acao: "backup_logs.erro", descricao: e.message });
    return { destinos: [], errors: [e.message] };
  }
}

// Rotina completa (banco + logs + relatório do dia), com resumo por destino.
// Usada pelo cron das 20:00 e pelo teste manual via API.
async function runBackupCompleto({ origin = "cron", dateStr = isoDate() } = {}) {
  log("BACKUP", `Iniciando backup diário (origem=${origin}).`);
  audit({ acao: "backup.inicio", descricao: `Backup diário iniciado (origem=${origin}).` });

  const resumo = {}; // key -> { label, ok, erros[] }
  const acumular = (res) => {
    for (const d of res.destinos || []) {
      const cur = resumo[d.key] || (resumo[d.key] = { label: d.label, ok: true, erros: [] });
      if (!d.ok) { cur.ok = false; cur.erros.push(d.error); }
    }
  };

  acumular(await backupDatabase());
  acumular(await backupLogs());
  const rel = await runRelatorioDiario({ dateStr, origin });
  acumular(rel);

  const destinos = Object.entries(resumo).map(([key, v]) => ({
    key, label: v.label, ok: v.ok, error: v.erros[0] || null,
  }));

  for (const d of destinos) {
    const linha = `${d.label}: ${d.ok ? "SUCESSO" : `ERRO — ${d.error}`}`;
    log("BACKUP", linha);
    audit({ acao: d.ok ? "backup.destino_ok" : "backup.destino_erro", descricao: linha });
  }

  log("BACKUP", "Backup diário concluído.");
  audit({ acao: "backup.fim", descricao: "Backup diário concluído." });

  return { ok: destinos.some((d) => d.ok), destinos, relatorio: rel, dateStr };
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
  for (const d of diagnosticarDestinos()) {
    log("SCHEDULER", `Destino ${d.label}: ${d.ok ? `OK (${d.caminho})` : `INDISPONÍVEL — ${d.error}`}`);
  }

  // Diário 20:00 — banco + logs + relatório, com resultado por destino.
  if (cron.validate(SCHEDULE_DIARIO)) {
    cron.schedule(SCHEDULE_DIARIO, () => {
      runBackupCompleto({ origin: "cron-diario" }).catch(() => {});
    }, { timezone: TZ });
  }

  // Mensal — dia 01 às 20:00 (não substitui o diário).
  if (cron.validate(SCHEDULE_MENSAL)) {
    cron.schedule(SCHEDULE_MENSAL, async () => {
      const mes = new Date().toISOString().slice(0, 7);
      log("BACKUP-MENSAL", `Iniciando ${mes}`);
      audit({ acao: "relatorio_mensal.inicio", descricao: `Iniciando ${mes}` });
      try {
        const r = await gerarRelatorioMensal(mes);
        reportarDestinos("BACKUP-MENSAL", `Relatório mensal ${mes}`, r.destinos);
        audit({ acao: "relatorio_mensal.sucesso", descricao: `Mensal ${mes} em ${r.dir}` });
      } catch (e) {
        err("BACKUP-MENSAL", e.message);
        audit({ acao: "relatorio_mensal.erro", descricao: e.message });
      }
    }, { timezone: TZ });
  }

  // Cron extra de backup (só quando configurado em horário diferente do diário).
  if (SCHEDULE_BACKUP !== SCHEDULE_DIARIO && cron.validate(SCHEDULE_BACKUP)) {
    cron.schedule(SCHEDULE_BACKUP, () => {
      backupDatabase().catch(() => {});
      backupLogs().catch(() => {});
    }, { timezone: TZ });
  }

  if (cron.validate(SCHEDULE_INTEGRITY)) {
    cron.schedule(SCHEDULE_INTEGRITY, integrityCheck, { timezone: TZ });
  }

  log("SCHEDULER", `Diário="${SCHEDULE_DIARIO}" Mensal="${SCHEDULE_MENSAL}" Backup="${SCHEDULE_BACKUP}" Integridade="${SCHEDULE_INTEGRITY}" TZ=${TZ}`);
}

module.exports = {
  startScheduler, runRelatorioDiario, runBackupCompleto,
  backupDatabase, backupLogs, diagnosticarDestinos,
};

