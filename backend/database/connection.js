const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "sistolda.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const CHAVES_SECRETAS = [
  "Escritório do Imediato",
  "Câmara do Comandante",
  "Divisão de Armamento",
  "Escoteria FAB",
  "Departamento de Operações",
  "Divisão de Fator Humano",
  "Departamento de Segurança da Aviação",
  "Departamento de Manutenção",
  "CPD",
  "Divisão de Pessoal",
  "Divisão de Suprimentos",
  "SECOM",
  "(Secreta) Seção de Inteligência",
];

const CHAVES_GERAIS = [
  "Oficina de SV/HV","Oficina de MV","Paiol de Pronto Uso (PPU)","Sala de Estar de CB/MN",
  "Divisão de Serviços Gerais","Sala do Briefing","Sala de Estar de 2SG/3SG","Paiol de Salvamento",
  "Paiol de Sobrevivência","Oficina de Infláveis","Sala de Estar de SO/1SG","Divisão de Controle de Qualidade",
  "Divisão de Planejamento","Paiol de Material Comum","Paiol de Tintas","Praça D'Armas",
  "Vestiário dos Oficiais","Dormitório do Contramestre","Divisão de Apoio","Divisão de Aviônica",
  "Oficina de Baterias","Sala do Conversor","Vestiário Feminino","Cisterna",
  "Portão de Acesso (Retaguarda)","Mestre 1","Paiol do Mestre 2","Paiol do Mestre 3",
  "Paiol do Mestre 4","Sala do Compressor","POG1","POG2","Paiol do CAV",
  "Viatura Ford Ka","Viatura L200","Paiol do Reboque","Paiol de Refrigeração","Vago",
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
    const insert = db.prepare("INSERT INTO chaves (numero, nome, categoria) VALUES (?,?,?)");
    const tx = db.transaction(() => {
      let n = 1;
      for (const nome of CHAVES_SECRETAS) insert.run(n++, nome, "secreta");
      for (const nome of CHAVES_GERAIS)   insert.run(n++, nome, "geral");
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
