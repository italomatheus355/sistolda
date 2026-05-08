const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "sistolda.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Chaves organizadas por departamento (administração, manutenção, operações, segurança)
const CHAVES_POR_DEPARTAMENTO = [
  { dep: "administracao", itens: [
    ["Escritório do Imediato", "secreta"],
    ["Escritório do Comandante", "secreta"],
    ["CPD", "secreta"],
    ["Divisão Pessoal", "secreta"],
    ["Suprimentos", "secreta"],
    ["SECOM", "secreta"],
    ["Sessão de Inteligência", "secreta"],
    ["Sala de Estar", "geral"],
    ["Divisão de Serviços Gerais", "geral"],
    ["Sala de Estar de Segundo e Terceiros", "geral"],
    ["Sala de Estar de Sub", "geral"],
    ["Paiol de Material Comum", "geral"],
    ["Paiol de Tintas", "geral"],
    ["Praça d'Armas", "geral"],
    ["Vestiários Oficiais", "geral"],
    ["Dormitório do Contramestre", "geral"],
    ["Vestiário Feminino", "geral"],
    ["Cisterna", "geral"],
    ["Portões de Acesso à Retaguarda", "geral"],
    ["Mestre 1", "geral"],
    ["Mestre 2", "geral"],
    ["Mestre 3", "geral"],
    ["Mestre 4", "geral"],
    ["Paiol do Cave", "geral"],
    ["Paiol de Geração", "geral"],
    ["Ford C", "geral"],
    ["Viatura L200", "geral"],
  ]},
  { dep: "manutencao", itens: [
    ["Divisão de Armamento", "secreta"],
    ["Escoteria da FAB", "secreta"],
    ["Departamento de Manutenção", "secreta"],
    ["Oficina de ASV/HV", "geral"],
    ["Oficina de MV", "geral"],
    ["PPU", "geral"],
    ["Divisão de Controle de Qualidade", "geral"],
    ["Planejamento da Manutenção", "geral"],
    ["Divisão de Apoio", "geral"],
    ["Divisão de Aviônica", "geral"],
    ["Oficina de Baterias", "geral"],
    ["Sessão do Conversor", "geral"],
    ["Sala do Compressor", "geral"],
    ["POG 1", "geral"],
    ["POG 2", "geral"],
    ["Paiol do Reboque", "geral"],
  ]},
  { dep: "operacoes", itens: [
    ["Departamento de Operações", "secreta"],
    ["Sala do Briefing", "geral"],
    ["Paiol de Salvamento", "geral"],
  ]},
  { dep: "seguranca", itens: [
    ["Fator Humano", "secreta"],
    ["Departamento de Segurança", "secreta"],
    ["Paiol de Sobrevivência", "geral"],
    ["Oficina de Infláveis", "geral"],
  ]},
];

function initDb() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);
  seed();
  console.log("[SISTOLDA] Banco SQLite inicializado em", DB_PATH);
}

function seed() {
  const chaveCount = db.prepare("SELECT COUNT(*) AS c FROM chaves").get().c;
  if (chaveCount === 0) {
    const insert = db.prepare(
      "INSERT INTO chaves (numero, nome, categoria, departamento, setor) VALUES (?,?,?,?,?)"
    );
    const tx = db.transaction(() => {
      let n = 1;
      for (const grupo of CHAVES_POR_DEPARTAMENTO) {
        for (const [nome, categoria] of grupo.itens) {
          insert.run(n++, nome, categoria, grupo.dep, nome);
        }
      }
    });
    tx();
  }

  const viaturaCount = db.prepare("SELECT COUNT(*) AS c FROM viaturas").get().c;
  if (viaturaCount === 0) {
    const insert = db.prepare("INSERT INTO viaturas (prefixo, modelo, km_atual) VALUES (?,?,?)");
    insert.run("Ford Ka", "Ford Ka", 45000);
    insert.run("L200",    "Mitsubishi L200", 78000);
  }

  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (userCount === 0) {
    const insert = db.prepare("INSERT INTO users (username,password,role) VALUES (?,?,?)");
    insert.run("admin",     "admin",     "admin");
    insert.run("operacoes", "operacoes", "operacoes");
    insert.run("segorg",    "segorg",    "segorg");
    insert.run("servico",   "servico",   "servico");
  }
}

module.exports = { db, initDb };
