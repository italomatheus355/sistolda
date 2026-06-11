// SISTOLDA — Geração de relatórios + estrutura de backup local/rede.
// Estrutura local (sempre cria) — C:\Users\SISTOLDA\BACKUPS\:
//   RELATORIOS  — todos os PDFs/XLSX (sem subpastas) — RELATORIO_DIARIO_YYYY-MM-DD.*,
//                                                       RELATORIO_MENSAL_YYYY-MM.*
//   LOGS        — logs operacionais diários
//   DATABASE    — cópias do banco SQLite
//   EXPORTACOES — exportações sob demanda
//   CONFIG      — backups de configuração
//   TEMP        — arquivos temporários
//
// Estrutura de rede (opcional, mesmo layout) — gravação em paralelo quando disponível.

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { db } = require("../database/connection");

const NETWORK_BASE =
  process.env.SISTOLDA_BACKUP_DIR ||
  "Y:\\informatica\\ADMINISTRATIVOS\\BACKUP-SISTOLDA";
const LOCAL_BASE =
  process.env.SISTOLDA_LOCAL_BACKUP_DIR ||
  "C:\\Users\\SISTOLDA\\BACKUPS";

const CATEGORIES = ["RELATORIOS", "LOGS", "DATABASE", "EXPORTACOES", "CONFIG", "TEMP"];

function pad(n) { return String(n).padStart(2, "0"); }
function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function brDateTime(s) {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return s;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }); return p; }
  catch (e) { return null; }
}

function resolveLocalDir(category) {
  return ensureDir(path.join(LOCAL_BASE, category));
}
function resolveNetworkDir(category) {
  return ensureDir(path.join(NETWORK_BASE, category));
}

// Garante toda a estrutura local na inicialização.
function ensureLocalStructure() {
  ensureDir(LOCAL_BASE);
  CATEGORIES.forEach((c) => ensureDir(path.join(LOCAL_BASE, c)));
}
ensureLocalStructure();

// Compat: scheduler antigo pode chamar com (categoria, ...) — devolve o caminho local.
function resolveBackupDir(category /* , ...ignored */) {
  return resolveLocalDir(String(category || "TEMP").toUpperCase());
}

/**
 * Grava um arquivo em LOCAL (obrigatório) e, se possível, replica na REDE.
 * @param {string} category Pasta (RELATORIOS, LOGS, DATABASE, ...)
 * @param {string} filename Nome final do arquivo
 * @param {(filePath:string)=>Promise<void>|void} writeAsync Função que escreve o arquivo no caminho informado.
 */
async function writeRedundant(category, filename, writeAsync) {
  const result = { localPath: null, networkPath: null, networkError: null, localError: null };
  const localDir = resolveLocalDir(category);
  if (localDir) {
    const lp = path.join(localDir, filename);
    try { await writeAsync(lp); result.localPath = lp; }
    catch (e) { result.localError = e.message; console.warn(`[BACKUP] Local falhou (${lp}): ${e.message}`); }
  } else {
    result.localError = `Pasta local indisponível (${category})`;
  }
  const netDir = resolveNetworkDir(category);
  if (netDir) {
    const np = path.join(netDir, filename);
    try {
      if (result.localPath) fs.copyFileSync(result.localPath, np);
      else await writeAsync(np);
      result.networkPath = np;
    } catch (e) {
      result.networkError = e.message;
      console.warn(`[BACKUP] Rede falhou (${np}): ${e.message}`);
    }
  } else {
    result.networkError = "Rede indisponível";
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

  const pendentesChaves = db.prepare(`
    SELECT chave_numero, chave_nome, militar, data_retirada, pessoa_tipo
    FROM retiradas_chaves
    WHERE status = 'em_uso'
    ORDER BY data_retirada
  `).all();

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

  return { chaves, pendentesChaves, viaturas, visitantes, materiais };
}

// ---------- PDF ----------
function gerarPDF(filePath, dateStr, dados, isMensal = false) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const titleColor = "#0f3460";
    const accent = "#1a4a6e";

    doc.fillColor(titleColor).fontSize(18).font("Helvetica-Bold")
       .text(`SISTOLDA — Relatório Operacional ${isMensal ? "Mensal" : "Diário"}`, { align: "center" });
    doc.moveDown(0.2);
    const ref = isMensal
      ? dateStr // YYYY-MM
      : dateStr.split("-").reverse().join("/");
    doc.fontSize(11).fillColor("#444").font("Helvetica")
       .text(`Referência: ${ref}`, { align: "center" });
    doc.text(`Gerado em: ${brDateTime(new Date().toISOString())}`, { align: "center" });
    doc.moveDown(1);

    const section = (title) => {
      doc.moveDown(0.5);
      doc.fillColor(accent).fontSize(13).font("Helvetica-Bold").text(title);
      doc.moveTo(doc.x, doc.y).lineTo(555, doc.y).strokeColor(accent).stroke();
      doc.moveDown(0.3);
      doc.fillColor("#000").fontSize(9).font("Helvetica");
    };
    const drawTable = (headers, rows, widths) => {
      if (!rows.length) {
        doc.fillColor("#777").font("Helvetica-Oblique").fontSize(9).text("Sem registros no período.");
        doc.fillColor("#000").font("Helvetica");
        return;
      }
      const startX = doc.x; let y = doc.y;
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#fff");
      doc.rect(startX, y, widths.reduce((a,b)=>a+b,0), 16).fill(accent);
      let x = startX;
      headers.forEach((h, i) => {
        doc.fillColor("#fff").text(h, x + 3, y + 4, { width: widths[i] - 6, ellipsis: true });
        x += widths[i];
      });
      y += 16;
      doc.font("Helvetica").fontSize(8).fillColor("#000");
      rows.forEach((row, idx) => {
        if (y > 780) { doc.addPage(); y = 50; }
        const rowH = 14;
        if (idx % 2 === 0) {
          doc.rect(startX, y, widths.reduce((a,b)=>a+b,0), rowH).fillColor("#f0f4f8").fill();
          doc.fillColor("#000");
        }
        x = startX;
        row.forEach((cell, i) => {
          doc.text(String(cell ?? "—"), x + 3, y + 3, { width: widths[i] - 6, ellipsis: true, lineBreak: false });
          x += widths[i];
        });
        y += rowH;
      });
      doc.y = y + 4; doc.x = startX;
    };

    section("CHAVES — Movimentação");
    drawTable(["Nº","Chave","Militar","Retirada","Devolução","Status"],
      dados.chaves.map(c => [
        c.chave_numero, 
        c.chave_nome, 
        c.militar + (c.pessoa_tipo === "exercito" ? " (EB)" : c.pessoa_tipo === "civil" ? " (Civil)" : ""),
        brDateTime(c.data_retirada), 
        brDateTime(c.data_devolucao), 
        c.status === "em_uso" ? "EM USO" : "DEVOLVIDA"
      ]),
      [30,170,110,90,90,65]);

    section("CHAVES — Pendências em aberto");
    drawTable(["Nº","Chave","Militar","Retirada"],
      dados.pendentesChaves.map(c => [
        c.chave_numero, 
        c.chave_nome, 
        c.militar + (c.pessoa_tipo === "exercito" ? " (EB)" : c.pessoa_tipo === "civil" ? " (Civil)" : ""),
        brDateTime(c.data_retirada)
      ]),
      [40,240,150,125]);

    doc.addPage();
    section("VIATURAS — Saídas e retornos");
    drawTable(["Prefixo","Motorista","Destino","KM Saída","KM Retorno","KM Rodado","Saída","Retorno"],
      dados.viaturas.map(v => [
        v.viatura_prefixo, 
        v.motorista + (v.pessoa_tipo === "exercito" ? " (EB)" : v.pessoa_tipo === "civil" ? " (Civil)" : ""),
        v.destino, 
        v.km_saida ?? "—", 
        v.km_retorno ?? "—", 
        v.km_rodado ?? "—", 
        brDateTime(v.data_saida), 
        brDateTime(v.data_retorno)
      ]),
      [60,90,90,50,55,55,80,75]);

    doc.addPage();
    section("VISITANTES");
    drawTable(["Nome","Tipo","Documento","Entrada","Saída"],
      dados.visitantes.map(v => {
        const suffix = v.tipo === "exercito" ? " (EB)" : v.tipo === "civil" ? " (Civil)" : "";
        return [v.nome + suffix, v.tipo || "comum", v.cpf || v.rg || v.documento || "—", brDateTime(v.hora_entrada), brDateTime(v.hora_saida)];
      }),
      [160,90,110,90,90]);

    section("MATERIAIS");
    drawTable(["Material","Militar","NIP","Destino","Registro"],
      dados.materiais.map(m => [
        m.nome_material, 
        m.militar + (m.pessoa_tipo === "exercito" ? " (EB)" : m.pessoa_tipo === "civil" ? " (Civil)" : ""),
        m.nip, 
        m.destino, 
        brDateTime(m.data_registro)
      ]),
      [160,110,70,110,105]);

    doc.moveDown(2);
    doc.fontSize(8).fillColor("#666").font("Helvetica-Oblique")
       .text("Documento gerado automaticamente pelo SISTOLDA — uso interno e auditoria operacional.", { align: "center" });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// ---------- XLSX ----------
async function gerarXLSX(filePath, dados) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SISTOLDA"; wb.created = new Date();
  const headerStyle = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A4A6E" } },
    alignment: { vertical: "middle", horizontal: "left" },
  };
  const addSheet = (name, columns, rows) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = columns.map(c => ({ ...c, width: c.width || 18 }));
    ws.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
    rows.forEach(r => ws.addRow(r));
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  };

  addSheet("Chaves", [
    { header: "Nº", key: "numero", width: 8 },
    { header: "Chave", key: "chave", width: 36 },
    { header: "Militar", key: "militar", width: 24 },
    { header: "NIP", key: "nip", width: 14 },
    { header: "Retirada", key: "ret", width: 20 },
    { header: "Devolução", key: "dev", width: 20 },
    { header: "Status", key: "status", width: 14 },
  ], dados.chaves.map(c => ({
    numero: c.chave_numero, chave: c.chave_nome, militar: c.militar, nip: c.nip,
    ret: brDateTime(c.data_retirada), dev: brDateTime(c.data_devolucao), status: c.status,
  })));

  addSheet("Viaturas", [
    { header: "Prefixo", key: "p", width: 14 },
    { header: "Motorista", key: "m", width: 24 },
    { header: "Destino", key: "d", width: 24 },
    { header: "KM Saída", key: "ks", width: 12 },
    { header: "KM Retorno", key: "kr", width: 12 },
    { header: "Saída", key: "s", width: 20 },
    { header: "Retorno", key: "r", width: 20 },
  ], dados.viaturas.map(v => ({
    p: v.viatura_prefixo, m: v.motorista, d: v.destino,
    ks: v.km_saida, kr: v.km_retorno,
    s: brDateTime(v.data_saida), r: brDateTime(v.data_retorno),
  })));

  addSheet("Visitantes", [
    { header: "Nome", key: "nome", width: 28 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Documento", key: "doc", width: 16 },
    { header: "Telefone", key: "tel", width: 16 },
    { header: "Destino", key: "ld", width: 22 },
    { header: "Entrada", key: "in", width: 20 },
    { header: "Saída", key: "out", width: 20 },
  ], dados.visitantes.map(v => ({
    nome: v.nome, tipo: v.tipo, doc: v.cpf || v.rg || v.documento, tel: v.telefone,
    ld: v.local_destino, in: brDateTime(v.hora_entrada), out: brDateTime(v.hora_saida),
  })));

  addSheet("Materiais", [
    { header: "Material", key: "m", width: 32 },
    { header: "Militar", key: "mi", width: 24 },
    { header: "NIP", key: "n", width: 14 },
    { header: "Destino", key: "d", width: 24 },
    { header: "Registro", key: "r", width: 20 },
  ], dados.materiais.map(m => ({
    m: m.nome_material, mi: m.militar, n: m.nip, d: m.destino, r: brDateTime(m.data_registro),
  })));

  await wb.xlsx.writeFile(filePath);
}

// ---------- Orquestrador diário ----------
async function gerarRelatorioDiario(dateStr = isoDate()) {
  const dados = coletarDados(dateStr);
  const fnPdf  = `RELATORIO_DIARIO_${dateStr}.pdf`;
  const fnXlsx = `RELATORIO_DIARIO_${dateStr}.xlsx`;
  const pdfRes  = await writeRedundant("RELATORIOS", fnPdf,  (p) => gerarPDF(p, dateStr, dados, false));
  const xlsxRes = await writeRedundant("RELATORIOS", fnXlsx, (p) => gerarXLSX(p, dados));
  const pdfPath  = pdfRes.localPath  || pdfRes.networkPath;
  const xlsxPath = xlsxRes.localPath || xlsxRes.networkPath;
  if (!pdfPath || !xlsxPath) throw new Error("Não foi possível gravar relatório (rede e local indisponíveis).");
  console.log(`[Relatorios] Diário ${dateStr} → ${pdfPath} | ${xlsxPath}`);
  return {
    pdfPath, xlsxPath,
    dir: path.dirname(pdfPath),
    dateStr,
    networkOk: !!(pdfRes.networkPath && xlsxRes.networkPath),
    localOk: !!(pdfRes.localPath && xlsxRes.localPath),
    networkError: pdfRes.networkError || xlsxRes.networkError || null,
  };
}

// ---------- Relatório mensal ----------
function coletarDadosMes(mesStr) {
  const chaves = db.prepare(`
    SELECT chave_numero, chave_nome, militar, nip, data_retirada, data_devolucao, status, cabo_retirada, cabo_devolucao, pessoa_tipo
    FROM retiradas_chaves
    WHERE substr(data_retirada,1,7) = ? OR substr(data_devolucao,1,7) = ?
    ORDER BY data_retirada
  `).all(mesStr, mesStr);
  const viaturas = db.prepare(`
    SELECT viatura_prefixo, motorista, nip, destino, km_saida, km_retorno, km_rodado, autonomia_informada,
           data_saida, data_retorno, status, cabo_saida, cabo_retorno, pessoa_tipo
    FROM historico_viaturas
    WHERE substr(data_saida,1,7) = ? OR substr(data_retorno,1,7) = ?
    ORDER BY data_saida
  `).all(mesStr, mesStr);
  const visitantes = db.prepare(`
    SELECT nome, tipo, posto_graduacao, forca_militar, cpf, rg, documento, telefone, organizacao,
           militar_responsavel, local_destino, hora_entrada, hora_saida, origem_identificacao, cabo_registro
    FROM visitantes
    WHERE substr(hora_entrada,1,7) = ? OR substr(hora_saida,1,7) = ?
    ORDER BY hora_entrada
  `).all(mesStr, mesStr);
  const materiais = db.prepare(`
    SELECT nome_material, militar, nip, destino, data_registro, cabo_registro, pessoa_tipo
    FROM materiais
    WHERE substr(data_registro,1,7) = ?
    ORDER BY data_registro
  `).all(mesStr);
  return { chaves, pendentesChaves: [], viaturas, visitantes, materiais };
}

async function gerarRelatorioMensal(mesStr = isoDate().slice(0, 7)) {
  const dados = coletarDadosMes(mesStr);
  const fnPdf  = `RELATORIO_MENSAL_${mesStr}.pdf`;
  const fnXlsx = `RELATORIO_MENSAL_${mesStr}.xlsx`;
  const pdfRes  = await writeRedundant("RELATORIOS", fnPdf,  (p) => gerarPDF(p, mesStr, dados, true));
  const xlsxRes = await writeRedundant("RELATORIOS", fnXlsx, (p) => gerarXLSX(p, dados));
  const pdfPath  = pdfRes.localPath  || pdfRes.networkPath;
  const xlsxPath = xlsxRes.localPath || xlsxRes.networkPath;
  if (!pdfPath || !xlsxPath) throw new Error("Não foi possível gravar relatório mensal.");
  console.log(`[Relatorios mensal] ${mesStr} → ${pdfPath} | ${xlsxPath}`);
  return {
    pdfPath, xlsxPath,
    dir: path.dirname(pdfPath),
    mesStr,
    networkOk: !!(pdfRes.networkPath && xlsxRes.networkPath),
    localOk: !!(pdfRes.localPath && xlsxRes.localPath),
    networkError: pdfRes.networkError || xlsxRes.networkError || null,
  };
}

module.exports = {
  gerarRelatorioDiario, gerarRelatorioMensal, isoDate,
  resolveBackupDir, resolveLocalDir, resolveNetworkDir, writeRedundant,
  LOCAL_BASE, NETWORK_BASE, CATEGORIES,
};
