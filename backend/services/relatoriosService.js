// SISTOLDA - Geração automática de relatórios diários (PDF + XLSX)
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { db } = require("../database/connection");

// Estrutura final: backup_sistolda/{DB,LOGS,RELATORIOS/{DIARIO,MENSAL}}
const NETWORK_BASE =
  process.env.SISTOLDA_BACKUP_DIR ||
  "\\\\esqdhu41fs\\grupos\\informatica\\ADMINISTRATIVOS\\backup_sistolda";
const LOCAL_FALLBACK = path.join(__dirname, "..", "backup_sistolda");

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
  catch (e) { console.warn("[Relatorios] Falha ao criar", p, "-", e.message); return null; }
}

// Resolve uma subpasta do backup (DB, LOGS, RELATORIOS/DIARIO/<data>, RELATORIOS/MENSAL/<aaaa-mm>)
function resolveBackupDir(...segments) {
  const tryNet = path.join(NETWORK_BASE, ...segments);
  const ok = ensureDir(tryNet);
  if (ok) return ok;
  return ensureDir(path.join(LOCAL_FALLBACK, ...segments));
}
function resolveOutputDir(dateStr) { return resolveBackupDir("RELATORIOS", "DIARIO", dateStr); }
function resolveOutputDirMensal(mesStr) { return resolveBackupDir("RELATORIOS", "MENSAL", mesStr); }

// ---------- Coleta de dados ----------
function coletarDados(dateStr) {
  // dateStr: YYYY-MM-DD — filtra registros do dia
  const like = `${dateStr}%`;

  const chaves = db.prepare(`
    SELECT chave_numero, chave_nome, militar, nip,
           data_retirada, data_devolucao, status,
           cabo_retirada, cabo_devolucao
    FROM retiradas_chaves
    WHERE substr(data_retirada,1,10) = ? OR substr(data_devolucao,1,10) = ?
    ORDER BY data_retirada
  `).all(dateStr, dateStr);

  const pendentesChaves = db.prepare(`
    SELECT chave_numero, chave_nome, militar, data_retirada
    FROM retiradas_chaves
    WHERE status = 'em_uso'
    ORDER BY data_retirada
  `).all();

  const viaturas = db.prepare(`
    SELECT viatura_prefixo, motorista, nip, destino,
           km_saida, km_retorno, km_rodado, autonomia_informada,
           data_saida, data_retorno, status,
           cabo_saida, cabo_retorno
    FROM historico_viaturas
    WHERE substr(data_saida,1,10) = ? OR substr(data_retorno,1,10) = ?
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
    SELECT nome_material, militar, nip, destino, data_registro, cabo_registro
    FROM materiais
    WHERE substr(data_registro,1,10) = ?
    ORDER BY data_registro
  `).all(dateStr);

  return { chaves, pendentesChaves, viaturas, visitantes, materiais };
}

// ---------- PDF ----------
function gerarPDF(filePath, dateStr, dados) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const titleColor = "#0f3460";
    const accent = "#1a4a6e";

    // Cabeçalho
    doc.fillColor(titleColor).fontSize(18).font("Helvetica-Bold")
       .text("SISTOLDA — Relatório Operacional Diário", { align: "center" });
    doc.moveDown(0.2);
    doc.fontSize(11).fillColor("#444").font("Helvetica")
       .text(`Data de referência: ${dateStr.split("-").reverse().join("/")}`, { align: "center" });
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
        doc.fillColor("#777").font("Helvetica-Oblique").fontSize(9)
           .text("Sem registros no período.");
        doc.fillColor("#000").font("Helvetica");
        return;
      }
      const startX = doc.x;
      let y = doc.y;
      // header
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#fff");
      let x = startX;
      doc.rect(startX, y, widths.reduce((a,b)=>a+b,0), 16).fill(accent);
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
      doc.y = y + 4;
      doc.x = startX;
    };

    // CHAVES
    section("CHAVES — Movimentação do dia");
    drawTable(
      ["Nº", "Chave", "Militar", "Retirada", "Devolução", "Status"],
      dados.chaves.map(c => [
        c.chave_numero, c.chave_nome, c.militar,
        brDateTime(c.data_retirada), brDateTime(c.data_devolucao),
        c.status === "em_uso" ? "EM USO" : "DEVOLVIDA",
      ]),
      [30, 170, 110, 90, 90, 65]
    );

    section("CHAVES — Pendências em aberto");
    drawTable(
      ["Nº", "Chave", "Militar", "Retirada"],
      dados.pendentesChaves.map(c => [
        c.chave_numero, c.chave_nome, c.militar, brDateTime(c.data_retirada),
      ]),
      [40, 240, 150, 125]
    );

    // VIATURAS
    doc.addPage();
    section("VIATURAS — Saídas e retornos");
    drawTable(
      ["Prefixo", "Motorista", "Destino", "KM Saída", "KM Retorno", "KM Rodado", "Saída", "Retorno"],
      dados.viaturas.map(v => [
        v.viatura_prefixo, v.motorista, v.destino,
        v.km_saida ?? "—", v.km_retorno ?? "—", v.km_rodado ?? "—",
        brDateTime(v.data_saida), brDateTime(v.data_retorno),
      ]),
      [60, 90, 90, 50, 55, 55, 80, 75]
    );

    // VISITANTES
    doc.addPage();
    section("VISITANTES — Civis e militares de outras forças");
    drawTable(
      ["Nome", "Tipo", "Posto/Força", "CPF/RG", "Entrada", "Saída", "Origem"],
      dados.visitantes.map(v => [
        v.nome,
        v.tipo || "comum",
        [v.posto_graduacao, v.forca_militar].filter(Boolean).join(" / ") || "—",
        v.cpf || v.rg || v.documento || "—",
        brDateTime(v.hora_entrada),
        brDateTime(v.hora_saida),
        (v.origem_identificacao || "manual").toUpperCase(),
      ]),
      [110, 55, 90, 90, 80, 80, 50]
    );

    // MATERIAIS
    section("MATERIAIS — Registros do dia");
    drawTable(
      ["Material", "Militar", "NIP", "Destino", "Registro"],
      dados.materiais.map(m => [
        m.nome_material, m.militar, m.nip, m.destino, brDateTime(m.data_registro),
      ]),
      [160, 110, 70, 110, 105]
    );

    // Rodapé
    doc.moveDown(2);
    doc.fontSize(8).fillColor("#666").font("Helvetica-Oblique")
       .text("Documento gerado automaticamente pelo SISTOLDA — uso interno e auditoria operacional.",
             { align: "center" });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// ---------- XLSX ----------
async function gerarXLSX(filePath, dateStr, dados) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SISTOLDA";
  wb.created = new Date();

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
    { header: "Cabo Retirada", key: "cr", width: 18 },
    { header: "Cabo Devolução", key: "cd", width: 18 },
  ], dados.chaves.map(c => ({
    numero: c.chave_numero, chave: c.chave_nome, militar: c.militar, nip: c.nip,
    ret: brDateTime(c.data_retirada), dev: brDateTime(c.data_devolucao),
    status: c.status, cr: c.cabo_retirada, cd: c.cabo_devolucao,
  })));

  addSheet("Chaves Pendentes", [
    { header: "Nº", key: "n", width: 8 },
    { header: "Chave", key: "chave", width: 36 },
    { header: "Militar", key: "militar", width: 24 },
    { header: "Retirada", key: "ret", width: 20 },
  ], dados.pendentesChaves.map(c => ({
    n: c.chave_numero, chave: c.chave_nome, militar: c.militar, ret: brDateTime(c.data_retirada),
  })));

  addSheet("Viaturas", [
    { header: "Prefixo", key: "p", width: 14 },
    { header: "Motorista", key: "m", width: 24 },
    { header: "NIP", key: "nip", width: 14 },
    { header: "Destino", key: "d", width: 24 },
    { header: "KM Saída", key: "ks", width: 12 },
    { header: "KM Retorno", key: "kr", width: 12 },
    { header: "KM Rodado", key: "kt", width: 12 },
    { header: "Autonomia", key: "a", width: 14 },
    { header: "Saída", key: "s", width: 20 },
    { header: "Retorno", key: "r", width: 20 },
    { header: "Status", key: "st", width: 14 },
  ], dados.viaturas.map(v => ({
    p: v.viatura_prefixo, m: v.motorista, nip: v.nip, d: v.destino,
    ks: v.km_saida, kr: v.km_retorno, kt: v.km_rodado, a: v.autonomia_informada,
    s: brDateTime(v.data_saida), r: brDateTime(v.data_retorno), st: v.status,
  })));

  addSheet("Visitantes", [
    { header: "Nome", key: "nome", width: 28 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Posto/Grad.", key: "pg", width: 14 },
    { header: "Força", key: "fm", width: 12 },
    { header: "CPF", key: "cpf", width: 16 },
    { header: "RG", key: "rg", width: 14 },
    { header: "Documento", key: "doc", width: 16 },
    { header: "Telefone", key: "tel", width: 16 },
    { header: "Organização", key: "org", width: 20 },
    { header: "Militar Responsável", key: "mr", width: 22 },
    { header: "Destino", key: "ld", width: 22 },
    { header: "Entrada", key: "in", width: 20 },
    { header: "Saída", key: "out", width: 20 },
    { header: "Origem", key: "or", width: 14 },
  ], dados.visitantes.map(v => ({
    nome: v.nome, tipo: v.tipo, pg: v.posto_graduacao, fm: v.forca_militar,
    cpf: v.cpf, rg: v.rg, doc: v.documento, tel: v.telefone, org: v.organizacao,
    mr: v.militar_responsavel, ld: v.local_destino,
    in: brDateTime(v.hora_entrada), out: brDateTime(v.hora_saida),
    or: v.origem_identificacao,
  })));

  addSheet("Materiais", [
    { header: "Material", key: "m", width: 32 },
    { header: "Militar", key: "mi", width: 24 },
    { header: "NIP", key: "n", width: 14 },
    { header: "Destino", key: "d", width: 24 },
    { header: "Registro", key: "r", width: 20 },
    { header: "Cabo", key: "c", width: 18 },
  ], dados.materiais.map(m => ({
    m: m.nome_material, mi: m.militar, n: m.nip, d: m.destino,
    r: brDateTime(m.data_registro), c: m.cabo_registro,
  })));

  await wb.xlsx.writeFile(filePath);
}

// ---------- Orquestrador ----------
async function gerarRelatorioDiario(dateStr = isoDate()) {
  const outDir = resolveOutputDir(dateStr);
  if (!outDir) throw new Error("Não foi possível criar diretório de saída");
  const dados = coletarDados(dateStr);
  const pdfPath = path.join(outDir, "relatorio_operacional.pdf");
  const xlsxPath = path.join(outDir, "relatorio_operacional.xlsx");
  await gerarPDF(pdfPath, dateStr, dados);
  await gerarXLSX(xlsxPath, dateStr, dados);
  console.log(`[Relatorios] Gerados: ${pdfPath} | ${xlsxPath}`);
  return { pdfPath, xlsxPath, dir: outDir, dateStr };
}

module.exports = { gerarRelatorioDiario, isoDate };
