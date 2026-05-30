const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { seedMilitares } = require("./seedMilitares");

const DB_PATH = path.join(__dirname, "sistolda.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

const db = new Database(DB_PATH);
// ===== Pragmas para estabilidade e operação contínua =====
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

const CHAVES_ORDENADAS = [
  ["Escritório do Imediato","secreta","administracao"],["Câmara do Comandante","secreta","administracao"],
  ["Divisão de Armamento","secreta","manutencao"],["Escoteria FAB","secreta","manutencao"],
  ["Departamento de Operações","secreta","operacoes"],["Divisão de Fator Humano","secreta","seguranca"],
  ["Departamento de Segurança da Aviação","secreta","seguranca"],["Departamento de Manutenção","secreta","manutencao"],
  ["CPD","secreta","administracao"],["Divisão de Pessoal","secreta","administracao"],
  ["Divisão de Suprimentos","secreta","administracao"],["SECOM","secreta","administracao"],
  ["Seção de Inteligência","secreta","administracao"],["Oficina de SV/HV","geral","manutencao"],
  ["Oficina de MV","geral","manutencao"],["Paiol de Pronto Uso (PPU)","geral","manutencao"],
  ["Sala de Estar de CB/MN","geral","administracao"],["Divisão de Serviços Gerais","geral","administracao"],
  ["Sala do Briefing","geral","operacoes"],["Sala de Estar de 2SG/3SG","geral","administracao"],
  ["Paiol de Salvamento","geral","operacoes"],["Paiol de Sobrevivência","geral","seguranca"],
  ["Oficina de Infláveis","geral","seguranca"],["Sala de Estar de SO/1SG","geral","administracao"],
  ["Divisão de Controle de Qualidade","geral","manutencao"],["Divisão de Planejamento","geral","manutencao"],
  ["Paiol de Material Comum","geral","administracao"],["Paiol de Tintas","geral","administracao"],
  ["Praça D'Armas","geral","administracao"],["Vestiário dos Oficiais","geral","administracao"],
  ["Dormitório do Contramestre","geral","administracao"],["Divisão de Apoio","geral","manutencao"],
  ["Divisão de Aviônica","geral","manutencao"],["Oficina de Baterias","geral","manutencao"],
  ["Sala do Conversor","geral","manutencao"],["Vestiário Feminino","geral","administracao"],
  ["Cisterna","geral","administracao"],["Portão de Acesso (Retaguarda)","geral","administracao"],
  ["Mestre 1","geral","administracao"],["Paiol do Mestre 2","geral","administracao"],
  ["Paiol do Mestre 3","geral","administracao"],["Paiol do Mestre 4","geral","administracao"],
  ["Sala do Compressor","geral","manutencao"],["POG1","geral","manutencao"],["POG2","geral","manutencao"],
  ["Paiol do CAV","geral","administracao"],["Viatura Ford Ka","geral","administracao"],
  ["Viatura L200","geral","administracao"],["Paiol do Reboque","geral","manutencao"],
  ["Paiol de Refrigeração","geral","manutencao"],["Vago","geral","administracao"],
];

function initDb() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schema);
  migrateVisitantes();
  migrateLogsAuditoria();
  migrateUsers();
  seed();
  console.log("[SISTOLDA] Banco SQLite inicializado em", DB_PATH);
}

function addColumnIfMissing(table, col, sql) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(col)) db.exec(sql);
}

function migrateLogsAuditoria() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      modulo TEXT, acao TEXT, nip TEXT, nome TEXT, descricao TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_logs_auditoria_ts ON logs_auditoria(timestamp);
    CREATE INDEX IF NOT EXISTS idx_logs_auditoria_nip ON logs_auditoria(nip);
  `);
  addColumnIfMissing("logs_auditoria", "usuario",    "ALTER TABLE logs_auditoria ADD COLUMN usuario TEXT");
  addColumnIfMissing("logs_auditoria", "perfil",     "ALTER TABLE logs_auditoria ADD COLUMN perfil TEXT");
  addColumnIfMissing("logs_auditoria", "ip",         "ALTER TABLE logs_auditoria ADD COLUMN ip TEXT");
  addColumnIfMissing("logs_auditoria", "estacao",    "ALTER TABLE logs_auditoria ADD COLUMN estacao TEXT");
  addColumnIfMissing("logs_auditoria", "user_agent", "ALTER TABLE logs_auditoria ADD COLUMN user_agent TEXT");
}

function migrateUsers() {
  addColumnIfMissing("users", "bloqueado",   "ALTER TABLE users ADD COLUMN bloqueado INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing("users", "ultimo_acesso","ALTER TABLE users ADD COLUMN ultimo_acesso TEXT");

  // Migrar roles antigas para o novo conjunto: admin | operador | consulta | informatica
  const map = { operacoes: "operador", segorg: "operador", servico: "consulta" };
  for (const [oldR, newR] of Object.entries(map)) {
    db.prepare("UPDATE users SET role=? WHERE role=?").run(newR, oldR);
  }

  // Hash de senhas em texto puro (legado)
  const users = db.prepare("SELECT id, password FROM users").all();
  const upd = db.prepare("UPDATE users SET password=? WHERE id=?");
  for (const u of users) {
    if (!u.password) continue;
    // bcrypt hashes começam com $2
    if (!String(u.password).startsWith("$2")) {
      upd.run(bcrypt.hashSync(u.password, 10), u.id);
    }
  }
}

function seed() {
  const chaveCount = db.prepare("SELECT COUNT(*) AS c FROM chaves").get().c;
  if (chaveCount === 0) {
    const insert = db.prepare("INSERT INTO chaves (numero, nome, categoria, departamento, setor) VALUES (?,?,?,?,?)");
    const tx = db.transaction(() => {
      let n = 1;
      for (const [nome, categoria, dep] of CHAVES_ORDENADAS) insert.run(n++, nome, categoria, dep, nome);
    });
    tx();
  }

  const viaturaCount = db.prepare("SELECT COUNT(*) AS c FROM viaturas").get().c;
  if (viaturaCount === 0) {
    const insert = db.prepare("INSERT INTO viaturas (prefixo, modelo, km_atual) VALUES (?,?,?)");
    insert.run("Ford Ka", "Ford Ka", 45000);
    insert.run("L200", "Mitsubishi L200", 78000);
  }

  seedMilitares(db);

  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (userCount === 0) {
    const insert = db.prepare("INSERT INTO users (username,password,role) VALUES (?,?,?)");
    insert.run("admin",     bcrypt.hashSync("admin", 10),     "admin");
    insert.run("operador",  bcrypt.hashSync("operador", 10),  "operador");
    insert.run("consulta",  bcrypt.hashSync("consulta", 10),  "consulta");
    insert.run("informatica", bcrypt.hashSync("informatica", 10), "informatica");
  }
}

function migrateVisitantes() {
  const adds = [
    ["cpf","ALTER TABLE visitantes ADD COLUMN cpf TEXT"],
    ["rg","ALTER TABLE visitantes ADD COLUMN rg TEXT"],
    ["telefone","ALTER TABLE visitantes ADD COLUMN telefone TEXT"],
    ["organizacao","ALTER TABLE visitantes ADD COLUMN organizacao TEXT"],
    ["recorrente_id","ALTER TABLE visitantes ADD COLUMN recorrente_id INTEGER"],
    ["tipo","ALTER TABLE visitantes ADD COLUMN tipo TEXT NOT NULL DEFAULT 'comum'"],
    ["civil_id","ALTER TABLE visitantes ADD COLUMN civil_id INTEGER"],
    ["militar_externo_id","ALTER TABLE visitantes ADD COLUMN militar_externo_id INTEGER"],
    ["forca_militar","ALTER TABLE visitantes ADD COLUMN forca_militar TEXT"],
    ["posto_graduacao","ALTER TABLE visitantes ADD COLUMN posto_graduacao TEXT"],
    ["origem_identificacao","ALTER TABLE visitantes ADD COLUMN origem_identificacao TEXT NOT NULL DEFAULT 'manual'"],
  ];
  for (const [name, sql] of adds) addColumnIfMissing("visitantes", name, sql);
}

module.exports = { db, initDb };
