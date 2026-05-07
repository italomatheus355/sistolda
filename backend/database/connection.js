const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_DIR = __dirname;
const DB_PATH = path.join(DB_DIR, "sistolda.db");
const SCHEMA_PATH = path.join(DB_DIR, "schema.sql");

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Aplica schema (idempotente: usa CREATE TABLE IF NOT EXISTS)
const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
db.exec(schema);

// Seed mínimo: chaves e viaturas iniciais (apenas se vazio)
function seedIfEmpty() {
  const countChaves = db.prepare("SELECT COUNT(*) AS c FROM chaves").get().c;
  if (countChaves === 0) {
    const secretas = [
      "Escritório do Imediato","Câmara do Comandante","Divisão de Armamento",
      "Escoteria Fábio","Departamento de Operações","Divisão de Fase Humana",
      "Departamento de Segurança da Aviação","Departamento de Manutenção","CPD",
      "Divisão de Pessoal","Divisão de Suprimentos","SECOM","Seção de Inteligência"
    ];
    const gerais = [
      "Oficina de SV/HV","Oficina de MV","Paiol de Pronto Uso (PPU)",
      "Sala de Estar de CB/MN","Divisão de Serviços Gerais","Sala do Briefing",
      "Sala de Estar de 2SG/3SG","Paiol de Salvamento","Paiol de Sobrevivência",
      "Oficina de Infláveis","Sala de Estar de SO/1SG","Divisão de Controle de Qualidade",
      "Divisão de Planejamento","Paiol de Material Comum","Paiol de Tintas",
      "Praça D'Armas","Vestiário dos Oficiais","Dormitório do Contramestre",
      "Divisão de Apoio","Divisão de Aviônica","Oficina de Baterias",
      "Sala do Conversor","Vestiário Feminino","Cisterna",
      "Portão de Acesso (Retaguarda)","Mestre 1","Paiol do Mestre 2",
      "Paiol do Mestre 3","Paiol do Mestre 4","Sala do Compressor",
      "POG1","POG2","Paiol do CAV","Viatura Ford Ka","Viatura L200",
      "Paiol do Reboque","Paiol de Refrigeração","Vago"
    ];
    const ins = db.prepare(
      "INSERT INTO chaves (numero, nome, categoria, status) VALUES (?, ?, ?, 'disponivel')"
    );
    const tx = db.transaction(() => {
      let n = 1;
      secretas.forEach((nome) => ins.run(n++, nome, "secreta"));
      gerais.forEach((nome) => ins.run(n++, nome, "geral"));
    });
    tx();
  }

  const countVtr = db.prepare("SELECT COUNT(*) AS c FROM viaturas").get().c;
  if (countVtr === 0) {
    const ins = db.prepare("INSERT INTO viaturas (nome, km_atual, status) VALUES (?, ?, 'disponivel')");
    ins.run("Ford Ka", 45000);
    ins.run("L200", 78000);
  }
}
seedIfEmpty();

module.exports = db;
