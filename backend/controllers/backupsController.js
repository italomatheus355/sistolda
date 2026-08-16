// SISTOLDA — Visualização (somente leitura) dos backups/relatórios já produzidos
// + execução manual/diagnóstico da rotina de backup nos 3 destinos.
// A listagem NÃO gera, altera, move ou apaga arquivos.
const fs = require("fs");
const path = require("path");
const {
  CATEGORIES, DESTINOS, baseAtiva, diagnosticarDestinos,
} = require("../services/relatoriosService");
const { runBackupCompleto } = require("../services/scheduler");
const { logAuditoria } = require("../services/auditService");

const BASES = DESTINOS.map((d) => ({ key: d.key, label: d.label, base: baseAtiva(d) }));


function listarPasta(baseKey, baseLabel, base, categoria) {
  const dir = path.join(base, categoria);
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const full = path.join(dir, e.name);
    let st;
    try { st = fs.statSync(full); } catch { continue; }
    out.push({
      nome: e.name,
      categoria,
      origem: baseKey,
      origem_label: baseLabel,
      caminho: full,
      tamanho: st.size,
      modificado_em: st.mtime.toISOString(),
      extensao: path.extname(e.name).replace(".", "").toLowerCase(),
      tipo: "Automático",
    });
  }
  return out;
}

function basesAtuais() {
  return DESTINOS.map((d) => ({ key: d.key, label: d.label, base: baseAtiva(d) }));
}

exports.list = (req, res, next) => {
  try {
    const bases = basesAtuais();
    const arquivos = [];
    for (const b of bases) {
      if (!b.base) continue;
      for (const c of CATEGORIES) arquivos.push(...listarPasta(b.key, b.label, b.base, c));
    }
    arquivos.sort((a, b) => (a.modificado_em < b.modificado_em ? 1 : -1));
    res.json({
      bases: bases.map((b) => ({ key: b.key, label: b.label, caminho: b.base })),
      categorias: CATEGORIES,
      arquivos,
    });
  } catch (e) { next(e); }
};

// Diagnóstico: cada destino está acessível e gravável?
exports.diagnostico = (req, res, next) => {
  try {
    res.json({ destinos: diagnosticarDestinos() });
  } catch (e) { next(e); }
};

// Teste manual da rotina completa (banco + logs + relatório) nos 3 destinos.
exports.executar = async (req, res, next) => {
  try {
    logAuditoria(req, {
      modulo: "relatorios", acao: "backup_manual",
      descricao: "Execução manual da rotina de backup nos três destinos.",
    });
    const r = await runBackupCompleto({ origin: "manual" });
    res.json(r);
  } catch (e) { next(e); }
};


// Serve o arquivo original (inline para visualizar, attachment para baixar).
exports.download = (req, res, next) => {
  try {
    const alvo = String(req.query.path || "");
    if (!alvo) return res.status(400).json({ error: "Caminho não informado." });
    const resolvido = path.resolve(alvo);
    const permitido = BASES.some(
      (b) => b.base && resolvido.toLowerCase().startsWith(path.resolve(b.base).toLowerCase() + path.sep),
    );
    if (!permitido) return res.status(403).json({ error: "Caminho fora das pastas de backup." });
    if (!fs.existsSync(resolvido) || !fs.statSync(resolvido).isFile()) {
      return res.status(404).json({ error: "Arquivo não encontrado no servidor." });
    }

    const inline = String(req.query.inline || "") === "1";
    logAuditoria(req, {
      modulo: "relatorios",
      acao: inline ? "backup_visualizado" : "backup_baixado",
      descricao: `${inline ? "Visualização" : "Download"} do arquivo de backup: ${resolvido}.`,
    });

    const nome = path.basename(resolvido);
    const ext = path.extname(nome).toLowerCase();
    const mime =
      ext === ".pdf" ? "application/pdf"
        : ext === ".xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : ext === ".csv" ? "text/csv"
            : ext === ".txt" || ext === ".log" ? "text/plain; charset=utf-8"
              : "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename="${nome.replace(/"/g, "")}"`,
    );
    fs.createReadStream(resolvido).pipe(res);
  } catch (e) { next(e); }
};
