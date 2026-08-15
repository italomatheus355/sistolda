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
  migratePessoas();
  migrateOperationalTables();
  seed();
  console.log("[SISTOLDA] Banco SQLite inicializado em", DB_PATH);
}

function migrateOperationalTables() {
  addColumnIfMissing("retiradas_chaves", "pessoa_tipo", "ALTER TABLE retiradas_chaves ADD COLUMN pessoa_tipo TEXT DEFAULT 'marinha'");
  addColumnIfMissing("historico_viaturas", "pessoa_tipo", "ALTER TABLE historico_viaturas ADD COLUMN pessoa_tipo TEXT DEFAULT 'marinha'");
  addColumnIfMissing("materiais", "pessoa_tipo", "ALTER TABLE materiais ADD COLUMN pessoa_tipo TEXT DEFAULT 'marinha'");
  addColumnIfMissing("materiais", "status", "ALTER TABLE materiais ADD COLUMN status TEXT DEFAULT 'em_uso'");
  addColumnIfMissing("materiais", "data_saida", "ALTER TABLE materiais ADD COLUMN data_saida TEXT");
  addColumnIfMissing("materiais", "cabo_saida", "ALTER TABLE materiais ADD COLUMN cabo_saida TEXT");
}

function migratePessoas() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pessoas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('marinha','exercito','civil')),
      identificador TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_pessoas_ident ON pessoas(identificador);
  `);
  addColumnIfMissing("pessoas", "cpf",             "ALTER TABLE pessoas ADD COLUMN cpf TEXT");
  addColumnIfMissing("pessoas", "rg",              "ALTER TABLE pessoas ADD COLUMN rg TEXT");
  addColumnIfMissing("pessoas", "telefone",        "ALTER TABLE pessoas ADD COLUMN telefone TEXT");
  addColumnIfMissing("pessoas", "posto_graduacao", "ALTER TABLE pessoas ADD COLUMN posto_graduacao TEXT");
}

// Espelha a tabela legada `militares` (usada por biometria/chaves) em `pessoas`.
// Garante que TODOS os militares cadastrados apareçam na tela /pessoas,
// usando o NIP como identificador único.
function backfillPessoasFromMilitares() {
  const hasMilitares = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='militares'"
  ).get();
  if (!hasMilitares) return;
  const militares = db.prepare(
    "SELECT nip, nome, posto_graduacao FROM militares WHERE IFNULL(ativo,1) = 1"
  ).all();
  const insert = db.prepare(`
    INSERT INTO pessoas (nome, tipo, identificador, posto_graduacao)
    VALUES (?, 'marinha', ?, ?)
    ON CONFLICT(identificador) DO UPDATE SET
      nome = excluded.nome,
      posto_graduacao = COALESCE(pessoas.posto_graduacao, excluded.posto_graduacao)
  `);
  const tx = db.transaction(() => {
    for (const m of militares) {
      const nip = String(m.nip || "").replace(/\D/g, "");
      if (!nip) continue;
      insert.run(m.nome, nip, m.posto_graduacao || null);
    }
  });
  tx();
  console.log(`[SISTOLDA] Pessoas sincronizadas a partir de militares: ${militares.length}`);

  // Reverso: re-aplica em `militares` qualquer edição feita em `pessoas`
  // (nome / posto_graduacao). Garante que biometria, chaves, viaturas etc.
  // leiam SEMPRE o cadastro administrativo atualizado, mesmo após restart.
  const pessoasMarinha = db.prepare(
    "SELECT identificador, nome, posto_graduacao FROM pessoas WHERE tipo = 'marinha'"
  ).all();
  const upd = db.prepare(`
    UPDATE militares
       SET nome = ?, posto_graduacao = COALESCE(?, posto_graduacao), ativo = 1
     WHERE nip = ?
  `);
  const txp = db.transaction(() => {
    for (const p of pessoasMarinha) {
      const nip = String(p.identificador || "").replace(/\D/g, "");
      if (!nip) continue;
      upd.run(p.nome, p.posto_graduacao || null, nip);
    }
  });
  txp();
  console.log(`[SISTOLDA] Militares re-sincronizados a partir de pessoas: ${pessoasMarinha.length}`);
}

function addColumnIfMissing(table, col, sql) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(col)) db.exec(sql);
}

function migrateLogsAuditoria() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now','localtime')),
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

  const usersSql = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'"
  ).get()?.sql || "";

  // SQLite não permite alterar um CHECK diretamente. Reconstrói somente a
  // tabela users, em transação, preservando IDs, senhas e datas existentes.
  // A verificação do schema torna esta migração idempotente nos próximos boots.
  const hasDefinitiveRoles = /role\s+IN\s*\(\s*'admin'\s*,\s*'seg_org'\s*,\s*'tolda'\s*\)/i.test(usersSql);
  if (!hasDefinitiveRoles) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE users_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin','seg_org','tolda')),
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
          bloqueado INTEGER NOT NULL DEFAULT 0,
          ultimo_acesso TEXT
        );
      `);
      db.exec(`
        INSERT INTO users_migrated (id, username, password, role, created_at, bloqueado, ultimo_acesso)
        SELECT id, username, password,
          CASE
            WHEN role = 'admin' THEN 'admin'
            WHEN role = 'seg_org' THEN 'seg_org'
            ELSE 'tolda'
          END,
          created_at, COALESCE(bloqueado, 0), ultimo_acesso
        FROM users;
        DROP TABLE users;
        ALTER TABLE users_migrated RENAME TO users;
      `);
    })();
    console.log("[SISTOLDA] Perfis de usuários migrados com preservação dos dados.");
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
  backfillPessoasFromMilitares();
  // Matriz de autorização de retirada de chaves (idempotente).
  try {
    require("../services/autorizacaoChaves").seedAutorizacoes();
  } catch (e) {
    console.error("[SISTOLDA] Falha ao aplicar autorizações de chaves:", e.message);
  }

  ensureCoreUsers();
}

// Usuários definitivos do SISTOLDA (idempotente — nunca sobrescreve senhas).
function ensureCoreUsers() {
  const CORE = [
    ["admin",   "admin",        "admin"],
    ["seg_org", "seg_org@2026", "seg_org"],
    ["tolda",   "tolda@2026",   "tolda"],
  ];
  const get = db.prepare("SELECT id FROM users WHERE username = ?");
  const ins = db.prepare("INSERT INTO users (username,password,role) VALUES (?,?,?)");
  const updPassword = db.prepare("UPDATE users SET password = ? WHERE id = ?");
  for (const [username, senha, role] of CORE) {
    const u = get.get(username);
    if (!u) ins.run(username, bcrypt.hashSync(senha, 10), role);
    else updPassword.run(bcrypt.hashSync(senha, 10), u.id);
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
