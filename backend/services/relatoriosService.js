// SISTOLDA — Geração de relatórios + estrutura de backup local/rede.
// Estrutura local (sempre cria) — C:\Users\SISTOLDA\BACKUPS\:
//   RELATORIOS  — todos os PDFs/XLSX (sem subpastas)
//   LOGS        — logs operacionais diários
//   DATABASE    — cópias do banco SQLite
//
// Estrutura de rede (opcional, mesmo layout) — gravação em paralelo quando disponível.

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { db } = require("../database/connection");

// ============================================================
// DESTINOS DE BACKUP (3, independentes entre si)
//   1. Servidor Local
//   2. Rede Informática   (Y:\informatica\ADMINISTRATIVOS\BACKUPS-SISTOLDA)
//   3. Rede SEGORG        (Y:\func_colaterais\seg_org\BACKUPS-SISTOLDA)
//
// Unidades mapeadas (Y:) só existem na sessão do usuário que fez o mapeamento.
// Quando o backend roda como serviço/outro contexto, a letra não existe — por
// isso cada destino de rede tem também o caminho UNC equivalente do
// compartilhamento \\esqdhu41fs, usado automaticamente como alternativa.
// ============================================================
const UNC_HOST = process.env.SISTOLDA_UNC_HOST || "\\\\esqdhu41fs";

const LOCAL_BASE = process.env.SISTOLDA_LOCAL_BACKUP_DIR || "C:\\Users\\SISTOLDA\\BACKUPS";

const NETWORK_1_CANDIDATES = [
  process.env.SISTOLDA_NET1_DIR,
  "Y:\\informatica\\ADMINISTRATIVOS\\BACKUPS-SISTOLDA",
  `${UNC_HOST}\\informatica\\ADMINISTRATIVOS\\BACKUPS-SISTOLDA`,
].filter(Boolean);

const NETWORK_2_CANDIDATES = [
  process.env.SISTOLDA_NET2_DIR,
  "Y:\\func_colaterais\\seg_org\\BACKUPS-SISTOLDA",
  `${UNC_HOST}\\func_colaterais\\seg_org\\BACKUPS-SISTOLDA`,
].filter(Boolean);

const DESTINOS = [
  { key: "local", label: "Servidor Local", candidates: [LOCAL_BASE] },
  { key: "informatica", label: "Rede Informática", candidates: NETWORK_1_CANDIDATES },
  { key: "segorg", label: "Rede SEGORG", candidates: NETWORK_2_CANDIDATES },
];

const CATEGORIES = ["DATABASE", "LOGS", "RELATORIOS"];

const TZ = "America/Sao_Paulo";

function pad(n) { return String(n).padStart(2, "0"); }

// Partes de data/hora no fuso do quartel (independente do fuso do servidor).
function partesSaoPaulo(d) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const p = {};
  for (const { type, value } of fmt.formatToParts(d)) p[type] = value;
  if (p.hour === "24") p.hour = "00";
  return p;
}

// Data de referência (YYYY-MM-DD) sempre no horário local de Brasília.
function isoDate(d = new Date()) {
  const p = partesSaoPaulo(d);
  return `${p.year}-${p.month}-${p.day}`;
}

// Os registros são gravados pelo SQLite já em horário local
// (datetime('now','localtime')) no formato "YYYY-MM-DD HH:MM:SS".
// Portanto NÃO devem ser reinterpretados como UTC — isso causava o desvio de 3h.
function brDateTime(s) {
  if (!s) return "—";
  const str = String(s).trim();
  const local = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (local && !/[zZ]$|[+-]\d{2}:?\d{2}$/.test(str)) {
    return `${local[3]}/${local[2]}/${local[1]} ${local[4]}:${local[5]}`;
  }
  // Timestamps com fuso explícito (ISO/UTC): converte para Brasília.
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  const p = partesSaoPaulo(d);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}


function ensureDir(p) {
  try {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
  } catch (e) { return null; }
}

// Cria a pasta e comprova permissão de escrita real (arquivo temporário).
function ensureWritableDir(dir) {
  if (!ensureDir(dir)) throw new Error(`não foi possível criar/acessar a pasta "${dir}"`);
  const probe = path.join(dir, `.sistolda-write-test-${process.pid}-${Date.now()}.tmp`);
  try {
    fs.writeFileSync(probe, "ok");
  } catch (e) {
    throw new Error(`sem permissão de escrita em "${dir}" (${e.code || e.message})`);
  } finally {
    try { fs.unlinkSync(probe); } catch { /* ignora */ }
  }
  return dir;
}

// Resolve a base de um destino testando cada candidato (Y: e depois UNC).
function resolveBase(destino, category) {
  const problemas = [];
  for (const cand of destino.candidates) {
    try {
      return { base: cand, dir: ensureWritableDir(path.join(cand, category)) };
    } catch (e) {
      problemas.push(`${cand}: ${e.message}`);
    }
  }
  const err = new Error(problemas.join(" | ") || "nenhum caminho configurado");
  err.candidatos = problemas;
  throw err;
}

// Base atualmente utilizável de um destino (para listagem de backups).
function baseAtiva(destino) {
  for (const cand of destino.candidates) {
    try { if (fs.existsSync(cand)) return cand; } catch { /* ignora */ }
  }
  return destino.candidates[0] || null;
}

// Garante toda a estrutura local na inicialização.
function ensureLocalStructure() {
  ensureDir(LOCAL_BASE);
  CATEGORIES.forEach((c) => ensureDir(path.join(LOCAL_BASE, c)));
}
ensureLocalStructure();

// Grava o mesmo arquivo nos 3 destinos, de forma TOTALMENTE independente:
// falha em um destino nunca impede os demais.
async function writeRedundant(category, filename, writeAsync) {
  const result = {
    localPath: null,
    networkPaths: [],
    errors: [],
    destinos: [], // [{ key, label, ok, path, error }]
  };

  for (const destino of DESTINOS) {
    const item = { key: destino.key, label: destino.label, ok: false, path: null, error: null };
    try {
      const { dir } = resolveBase(destino, category);
      const alvo = path.join(dir, filename);
      // Se o local já foi gravado, apenas copia (mais rápido e idêntico).
      if (result.localPath && destino.key !== "local") fs.copyFileSync(result.localPath, alvo);
      else await writeAsync(alvo);
      item.ok = true;
      item.path = alvo;
      if (destino.key === "local") result.localPath = alvo;
      else result.networkPaths.push(alvo);
    } catch (e) {
      item.error = e.message;
      result.errors.push(`${destino.label} (${category}): ${e.message}`);
    }
    result.destinos.push(item);
    console.log(
      `[BACKUP] ${destino.label}: ${item.ok ? "SUCESSO" : `ERRO — ${item.error}`}` +
      ` (${category}/${filename})`,
    );
  }

  return result;
}


// ---------- Coleta de dados ----------
function coletarDados(dateStr) {
  const chaves = db.prepare(`
    SELECT chave_numero, chave_nome, militar, nip,
           data_retirada, data_devolucao, status,
           cabo_retirada, cabo_devolucao, pessoa_tipo
    FROM retiradas_chaves
    WHERE (substr(data_retirada,1,10) = ? OR substr(data_devolucao,1,10) = ?)
    ORDER BY data_retirada
  `).all(dateStr, dateStr);

  const viaturas = db.prepare(`
    SELECT viatura_prefixo, motorista, nip, destino,
           km_saida, km_retorno, km_rodado, autonomia_informada,
           data_saida, data_retorno, status,
           cabo_saida, cabo_retorno, pessoa_tipo
    FROM historico_viaturas
    WHERE (substr(data_saida,1,10) = ? OR substr(data_retorno,1,10) = ?)
    ORDER BY data_saida
  `).all(dateStr, dateStr);

  const visitantes = db.prepare(`
    SELECT nome, tipo, posto_graduacao, forca_militar,
           cpf, rg, documento, telefone, organizacao,
           militar_responsavel, local_destino,
           hora_entrada, hora_saida, origem_identificacao,
           cabo_registro
    FROM visitantes
    WHERE substr(hora_entrada,1,10) = ? OR substr(hora_saida,1,10) = ?
    ORDER BY hora_entrada
  `).all(dateStr, dateStr);

  const materiais = db.prepare(`
    SELECT nome_material, militar, nip, destino, data_registro, cabo_registro, pessoa_tipo
    FROM materiais
    WHERE substr(data_registro,1,10) = ?
    ORDER BY data_registro
  `).all(dateStr);

  return { chaves, viaturas, visitantes, materiais };
}

// ---------- PDF Modelo Novo ----------
function gerarPDF(filePath, dateStr, dados, isMensal = false) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Cabeçalho institucional
    const logoPath = path.join(__dirname, "..", "assets", "logo-sistolda.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, { fit: [60, 60], align: 'center' });
      doc.moveDown(0.5);
    }

    doc.font("Helvetica-Bold").fontSize(12).text("MARINHA DO BRASIL", { align: "center" });
    doc.text("COMANDO DO 4º DISTRITO NAVAL", { align: "center" });
    doc.text("1º ESQUADRÃO DE HELICÓPTEROS DE EMPREGO GERAL DO NORTE", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).text("RELATÓRIO OPERACIONAL", { align: "center" });
    doc.moveDown(0.2);
    const ref = isMensal ? dateStr : dateStr.split("-").reverse().join("/");
    doc.fontSize(10).font("Helvetica").text(`Referência: ${ref}`, { align: "center" });
    doc.moveDown(1);

    const drawSection = (title) => {
      doc.moveDown(1);
      doc.font("Helvetica-Bold").fontSize(11).text(title.toUpperCase());
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);
    };

    const drawTable = (headers, rows, widths) => {
      const startX = 40;
      let y = doc.y;

      // Header em negrito
      doc.font("Helvetica-Bold").fontSize(8);
      let x = startX;
      headers.forEach((h, i) => {
        doc.text(h.toUpperCase(), x + 2, y, { width: widths[i] - 4 });
        x += widths[i];
      });
      doc.moveTo(40, y + 10).lineTo(555, y + 10).stroke();
      y += 15;

      // Dados normais
      doc.font("Helvetica").fontSize(7.5);
      rows.forEach((row) => {
        if (y > 750) { 
          doc.addPage(); 
          y = 50; 
          // Re-draw headers on new page
          doc.font("Helvetica-Bold").fontSize(8);
          let rx = startX;
          headers.forEach((h, i) => {
            doc.text(h.toUpperCase(), rx + 2, y, { width: widths[i] - 4 });
            rx += widths[i];
          });
          doc.moveTo(40, y + 10).lineTo(555, y + 10).stroke();
          y += 15;
          doc.font("Helvetica").fontSize(7.5);
        }
        x = startX;
        row.forEach((cell, i) => {
          doc.text(String(cell ?? ""), x + 2, y, { width: widths[i] - 4, lineBreak: false });
          x += widths[i];
        });
        y += 12;
      });
      doc.y = y;
    };

    // 1. CHAVES
    drawSection("1. CHAVES");
    drawTable(
      ["Nº", "Chave", "Militar", "Retirada", "Devolução", "Status"],
      dados.chaves.map(c => [
        c.chave_numero,
        c.chave_nome,
        c.militar + (c.pessoa_tipo === "exercito" ? " (EB)" : c.pessoa_tipo === "civil" ? " (Civil)" : ""),
        brDateTime(c.data_retirada),
        brDateTime(c.data_devolucao),
        c.status === "em_uso" ? "EM USO" : "DEVOLVIDA"
      ]),
      [30, 160, 120, 85, 85, 60]
    );

    // 2. VIATURAS
    drawSection("2. VIATURAS");
    drawTable(
      ["VTR", "Motorista", "Destino", "KM Ini", "KM Fim", "Auton", "Saída", "Retorno"],
      dados.viaturas.map(v => [
        v.viatura_prefixo,
        v.motorista + (v.pessoa_tipo === "exercito" ? " (EB)" : v.pessoa_tipo === "civil" ? " (Civil)" : ""),
        v.destino,
        v.km_saida ?? "—",
        v.km_retorno ?? "—",
        v.autonomia_informada ?? "—",
        brDateTime(v.data_saida),
        brDateTime(v.data_retorno)
      ]),
      [45, 90, 80, 40, 40, 40, 85, 85]
    );

    // 3. VISITANTES
    drawSection("3. VISITANTES");
    drawTable(
      ["Nome", "Documento", "Destino", "Entrada", "Saída"],
      dados.visitantes.map(v => [
        v.nome + (v.tipo === "exercito" ? " (EB)" : v.tipo === "civil" ? " (Civil)" : ""),
        v.cpf || v.rg || v.documento || "—",
        v.local_destino,
        brDateTime(v.hora_entrada),
        brDateTime(v.hora_saida)
      ]),
      [160, 100, 100, 85, 85]
    );

    // 4. MATERIAIS
    drawSection("4. MATERIAIS");
    drawTable(
      ["Material", "Militar", "NIP", "Destino", "Registro"],
      dados.materiais.map(m => [
        m.nome_material,
        m.militar + (m.pessoa_tipo === "exercito" ? " (EB)" : m.pessoa_tipo === "civil" ? " (Civil)" : ""),
        m.nip,
        m.destino,
        brDateTime(m.data_registro)
      ]),
      [160, 120, 60, 90, 85]
    );

    // Rodapé
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).font("Helvetica").text(
        "SISTOLDA — Documento gerado automaticamente",
        40, 800, { align: "center", width: 515 }
      );
      doc.text(`Página ${i + 1} de ${pages.count}`, 40, 810, { align: "center", width: 515 });
    }

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// ---------- XLSX ----------
async function gerarXLSX(filePath, dados) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SISTOLDA";
  const addSheet = (name, columns, rows) => {
    const ws = wb.addWorksheet(name);
    ws.columns = columns;
    rows.forEach(r => ws.addRow(r));
    ws.getRow(1).font = { bold: true };
  };

  addSheet("Chaves", [
    { header: "Nº", key: "numero" },
    { header: "Chave", key: "chave" },
    { header: "Militar", key: "militar" },
    { header: "Retirada", key: "ret" },
    { header: "Devolução", key: "dev" },
    { header: "Status", key: "status" },
  ], dados.chaves.map(c => ({
    numero: c.chave_numero, chave: c.chave_nome, militar: c.militar,
    ret: brDateTime(c.data_retirada), dev: brDateTime(c.data_devolucao), status: c.status,
  })));

  addSheet("Viaturas", [
    { header: "Prefixo", key: "p" },
    { header: "Motorista", key: "m" },
    { header: "Destino", key: "d" },
    { header: "KM Saída", key: "ks" },
    { header: "KM Retorno", key: "kr" },
    { header: "Autonomia", key: "a" },
    { header: "Saída", key: "s" },
    { header: "Retorno", key: "r" },
  ], dados.viaturas.map(v => ({
    p: v.viatura_prefixo, m: v.motorista, d: v.destino,
    ks: v.km_saida, kr: v.km_retorno, a: v.autonomia_informada,
    s: brDateTime(v.data_saida), r: brDateTime(v.data_retorno),
  })));

  await wb.xlsx.writeFile(filePath);
}

// ---------- Orquestrador ----------
async function gerarRelatorioDiario(dateStr = isoDate()) {
  const dados = coletarDados(dateStr);
  const fnPdf  = `RELATORIO_DIARIO_${dateStr}.pdf`;
  const fnXlsx = `RELATORIO_DIARIO_${dateStr}.xlsx`;
  const res = await writeRedundant("RELATORIOS", fnPdf, (p) => gerarPDF(p, dateStr, dados, false));
  const resXlsx = await writeRedundant("RELATORIOS", fnXlsx, (p) => gerarXLSX(p, dados));

  return {
    pdfPath: res.localPath || res.networkPaths[0],
    xlsxPath: resXlsx.localPath || resXlsx.networkPaths[0] || null,
    dir: path.dirname(res.localPath || ""),
    dateStr,
    localOk: !!res.localPath,
    networkOk: res.networkPaths.length > 0,
    destinos: res.destinos,
    errors: res.errors.concat(resXlsx.errors),
  };

}

async function gerarRelatorioMensal(mesStr) {
  // Simplificado para usar a mesma lógica
  const dados = coletarDados(mesStr + "-01"); // Aproximação
  const fnPdf = `RELATORIO_MENSAL_${mesStr}.pdf`;
  const res = await writeRedundant("RELATORIOS", fnPdf, (p) => gerarPDF(p, mesStr, dados, true));
  return {
    pdfPath: res.localPath || res.networkPaths[0],
    dir: path.dirname(res.localPath || ""),
    destinos: res.destinos,
    errors: res.errors,
  };
}

// Diagnóstico: estado atual de cada destino (acessível? gravável? qual caminho?).
function diagnosticarDestinos() {
  return DESTINOS.map((d) => {
    const item = { key: d.key, label: d.label, ok: false, caminho: null, candidatos: d.candidates, error: null };
    try {
      const { base, dir } = resolveBase(d, "DATABASE");
      item.ok = true; item.caminho = base; item.pastaTestada = dir;
    } catch (e) { item.error = e.message; }
    return item;
  });
}

module.exports = {
  gerarRelatorioDiario, gerarRelatorioMensal, isoDate,
  writeRedundant, diagnosticarDestinos,
  LOCAL_BASE, CATEGORIES, DESTINOS, baseAtiva,
};
