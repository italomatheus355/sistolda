const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { seedMilitares } = require("./seedMilitares");

const DB_PATH = path.join(__dirname, "sistolda.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Chaves em ordem oficial (numeração 1..51)
const CHAVES_ORDENADAS = [
  ["Escritório do Imediato",               "secreta", "administracao"],
  ["Câmara do Comandante",                 "secreta", "administracao"],
  ["Divisão de Armamento",                 "secreta", "manutencao"],
  ["Escoteria FAB",                        "secreta", "manutencao"],
  ["Departamento de Operações",            "secreta", "operacoes"],
  ["Divisão de Fator Humano",              "secreta", "seguranca"],
  ["Departamento de Segurança da Aviação", "secreta", "seguranca"],
  ["Departamento de Manutenção",           "secreta", "manutencao"],
  ["CPD",                                  "secreta", "administracao"],
  ["Divisão de Pessoal",                   "secreta", "administracao"],
  ["Divisão de Suprimentos",               "secreta", "administracao"],
  ["SECOM",                                "secreta", "administracao"],
  ["Seção de Inteligência",                "secreta", "administracao"],
  ["Oficina de SV/HV",                     "geral",   "manutencao"],
  ["Oficina de MV",                        "geral",   "manutencao"],
  ["Paiol de Pronto Uso (PPU)",            "geral",   "manutencao"],
  ["Sala de Estar de CB/MN",               "geral",   "administracao"],
  ["Divisão de Serviços Gerais",           "geral",   "administracao"],
  ["Sala do Briefing",                     "geral",   "operacoes"],
  ["Sala de Estar de 2SG/3SG",             "geral",   "administracao"],
  ["Paiol de Salvamento",                  "geral",   "operacoes"],
  ["Paiol de Sobrevivência",               "geral",   "seguranca"],
  ["Oficina de Infláveis",                 "geral",   "seguranca"],
  ["Sala de Estar de SO/1SG",              "geral",   "administracao"],
  ["Divisão de Controle de Qualidade",     "geral",   "manutencao"],
  ["Divisão de Planejamento",              "geral",   "manutencao"],
  ["Paiol de Material Comum",              "geral",   "administracao"],
  ["Paiol de Tintas",                      "geral",   "administracao"],
  ["Praça D'Armas",                        "geral",   "administracao"],
  ["Vestiário dos Oficiais",               "geral",   "administracao"],
  ["Dormitório do Contramestre",           "geral",   "administracao"],
  ["Divisão de Apoio",                     "geral",   "manutencao"],
  ["Divisão de Aviônica",                  "geral",   "manutencao"],
  ["Oficina de Baterias",                  "geral",   "manutencao"],
  ["Sala do Conversor",                    "geral",   "manutencao"],
  ["Vestiário Feminino",                   "geral",   "administracao"],
  ["Cisterna",                             "geral",   "administracao"],
  ["Portão de Acesso (Retaguarda)",        "geral",   "administracao"],
  ["Mestre 1",                             "geral",   "administracao"],
  ["Paiol do Mestre 2",                    "geral",   "administracao"],
  ["Paiol do Mestre 3",                    "geral",   "administracao"],
  ["Paiol do Mestre 4",                    "geral",   "administracao"],
  ["Sala do Compressor",                   "geral",   "manutencao"],
  ["POG1",                                 "geral",   "manutencao"],
  ["POG2",                                 "geral",   "manutencao"],
  ["Paiol do CAV",                         "geral",   "administracao"],
  ["Viatura Ford Ka",                      "geral",   "administracao"],
  ["Viatura L200",                         "geral",   "administracao"],
  ["Paiol do Reboque",                     "geral",   "manutencao"],
  ["Paiol de Refrigeração",                "geral",   "manutencao"],
  ["Vago",                                 "geral",   "administracao"],
];

function initDb() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);
  migrateVisitantes();
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
      for (const [nome, categoria, dep] of CHAVES_ORDENADAS) {
        insert.run(n++, nome, categoria, dep, nome);
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

  seedMilitares(db);

  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (userCount === 0) {
    const insert = db.prepare("INSERT INTO users (username,password,role) VALUES (?,?,?)");
    insert.run("admin",     "admin",     "admin");
    insert.run("operacoes", "operacoes", "operacoes");
    insert.run("segorg",    "segorg",    "segorg");
    insert.run("servico",   "servico",   "servico");
  }
}

function migrateVisitantes() {
  const cols = db.prepare("PRAGMA table_info(visitantes)").all().map((c) => c.name);
  const adds = [
    ["cpf",           "ALTER TABLE visitantes ADD COLUMN cpf TEXT"],
    ["rg",            "ALTER TABLE visitantes ADD COLUMN rg TEXT"],
    ["telefone",      "ALTER TABLE visitantes ADD COLUMN telefone TEXT"],
    ["organizacao",   "ALTER TABLE visitantes ADD COLUMN organizacao TEXT"],
    ["recorrente_id", "ALTER TABLE visitantes ADD COLUMN recorrente_id INTEGER"],
    ["tipo",          "ALTER TABLE visitantes ADD COLUMN tipo TEXT NOT NULL DEFAULT 'comum'"],
  ];
  for (const [name, sql] of adds) if (!cols.includes(name)) db.exec(sql);
}

module.exports = { db, initDb };
