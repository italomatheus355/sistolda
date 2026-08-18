// SISTOLDA — Controle de autorização para RETIRADA de chaves do claviculário.
// Regra de negócio: cada chave possui um conjunto de militares autorizados
// (lista nominal) e/ou uma regra especial (ostensivo, oficiais, SO/SG, etc.).
// A verificação é SEMPRE feita no backend, antes de registrar a retirada.

const { db } = require("../database/connection");

// ---------------------------------------------------------------- utilidades
const norm = (v) =>
  String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normPosto = (v) => norm(v).replace(/\s/g, "").replace(/^([123])O?(SG|TEN)$/, "$1$2");

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// Compara nomes de forma tolerante (acentos, grafias, sobrenome parcial).
function nomesCompativeis(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const tx = x.split(" "), ty = y.split(" ");
  // um é subconjunto de tokens do outro (ex.: "RENATO ANDRADE" x "ANDRADE")
  const sub = (s, l) => s.every((t) => l.includes(t));
  if (sub(tx, ty) || sub(ty, tx)) return true;
  const dist = levenshtein(x, y);
  return dist <= Math.min(2, Math.floor(Math.max(x.length, y.length) / 5));
}

const OFICIAIS = ["GM", "2TEN", "1TEN", "CT", "CC", "CF", "CMG", "ALTE"];
const SUBOFICIAIS_SARGENTOS = ["SO", "1SG", "2SG", "3SG"];

// -------------------------------------------------------------- matriz oficial
// regra: "nominal" (padrão) | "ostensivo" | "oficiais" (oficiais + nominais)
//        | "so_sg" | "so_1sg" | "contramestre"
const G = (...nomes) => nomes;

// Comando: autorizados em TODAS as 49 chaves.
const ACESSO_TOTAL = G("CF Rafael Peixoto", "CC Rodrigo Martins");
const TOTAL_CHAVES = 49;

const GRUPO_01_02 = G("SO Igor", "2ºSG Pereira", "3ºSG Lelis", "3ºSG Leonardo", "CB Pyter", "3ºSG Juan");

const GRUPO_03_04 = G("CC Torresini", "1ºSG Herbert", "2ºSG Bastos", "2ºSG Renato Andrade", "3ºSG Dias");
const GRUPO_05_19 = G(
  "CC Bragagnolo", "1ºTen Passeri", "1ºTen Maldonado", "SO Diego", "SO Gleidson", "SO Lucena",
  "1ºSG Carvalho", "1ºSG Souza", "2ºSG Goulart", "2ºSG Henrique", "2ºSG Simone Mombach",
  "3ºSG Faillon", "3ºSG Brandão",
);
const GRUPO_06_07 = G(
  "CC Pandini", "CC Sherman", "SO Josias", "SO Alex Soeth", "SO Lucivaldo",
  "2ºSG Daniel", "2ºSG Renan Mota", "2ºSG Adriano",
);
const GRUPO_16_44_45 = G(
  "CC Torresini", "CC Florêncio", "2ºTen Reinaldo", "SO Raiol", "2ºSG Miranda",
  "2ºSG Luiz Alan", "2ºSG Bruno", "2ºSG Renato Andrade", "CB Gonçalves", "CB Leoncio",
);
const GRUPO_22_23 = G(
  "CC Pandini", "CC Sherman", "SO Josias", "SO Alex Soeth", "SO Lucivaldo",
  "2ºSG Daniel", "2ºSG Adriano", "CB Sant'Anna",
);
const GRUPO_MESTRES = G(
  "CT Hoffmann", "2ºTen José Marcos", "SO Márcio", "3ºSG Ricardo", "3ºSG Thiago Santos",
  "MN Hyandre", "MN André", "MN RC Cláudio", "MN RC De Carvalho",
);
const GRUPO_33_34_35 = G(
  "CC Torresini", "CC Florêncio", "SO Jonathas", "1ºSG Arlei", "1ºSG Samuel", "2ºSG Levi",
  "2ºSG Bruno Matos", "2ºSG Marcio", "CB Júnior", "CB Cassiano", "CB Ramon",
);
const GRUPO_47_48 = G(
  "SO Lucivaldo", "2ºSG Pontes", "2ºSG Bruno", "3ºSG Ricardo", "3ºSG J. Costa",
  "3ºSG Vasconcelos", "CB Júnior", "CB Sant'Anna",
);

const MATRIZ = {
  1: { regra: "nominal", nomes: GRUPO_01_02 },
  2: { regra: "nominal", nomes: GRUPO_01_02 },
  3: { regra: "nominal", nomes: GRUPO_03_04 },
  4: { regra: "nominal", nomes: GRUPO_03_04 },
  5: { regra: "nominal", nomes: GRUPO_05_19 },
  6: { regra: "nominal", nomes: GRUPO_06_07 },
  7: { regra: "nominal", nomes: GRUPO_06_07 },
  8: { regra: "nominal", nomes: G("CC Torresini", "CC Florêncio", "1ºTen Pedro Assis", "2ºTen Reinaldo") },
  9: { regra: "nominal", nomes: G("CT Hoffmann", "2ºTen José Marcos", "3ºSG Azevedo", "CB Fernanda", "MN Ítalo") },
  10: { regra: "nominal", nomes: G("CT Hoffmann", "2ºTen José Marcos", "SO Pereira", "SO Da Cunha", "SO Mafra", "SO Sebastião", "3ºSG Ricardo") },
  11: { regra: "nominal", nomes: G("CT Hoffmann", "2ºTen José Marcos", "SO Aldeney", "3ºSG Oséas", "3ºSG J. Costa", "CB Julio Cesar") },
  12: {
    regra: "nominal",
    nomes: G("CT Hoffmann", "2ºTen José Marcos", "SO Igor", "2ºSG Pereira", "CB Pyter"),
    // Autorizados APENAS quando estiverem de serviço.
    condicionais: G("2ºSG Renan Mota", "3ºSG Oséas", "3ºSG Azevedo", "CB Fernanda"),
  },
  13: { regra: "nominal", nomes: G("CC Pandini", "CC Florêncio", "SO Aguiar", "2ºSG Pontes") },
  14: {
    regra: "nominal",
    nomes: G("CC Torresini", "CC Florêncio", "1ºSG Janner", "2ºSG Felipe Brito", "2ºSG Gonçalves",
      "2ºSG Jefté", "3ºSG Carlos Eduardo", "CB Paschoal", "CB Marlon", "CB Reis", "CB Da Silva", "CB Santos"),
  },
  15: {
    regra: "nominal",
    nomes: G("CC Torresini", "CC Florêncio", "SO Robisom", "SO Sabadini", "SO João Paulo", "1ºSG S. Alves",
      "1ºSG Wilson", "2ºSG Wellington", "2ºSG Ralph", "2ºSG Dourado", "2ºSG Reginaldo", "2ºSG Nicolas",
      "2ºSG Leite", "3ºSG Dias", "3ºSG Helton Pinto", "CB Davi", "CB Liberato"),
  },
  16: { regra: "nominal", nomes: GRUPO_16_44_45 },
  17: { regra: "ostensivo", nomes: [] },
  18: {
    regra: "nominal",
    nomes: G("CT Hoffmann", "2º José Marcos", "2º Reinaldo", "SO Márcio", "2ºSG Pontes",
      "3ºSG Thiago Santos", "MN Hyandre", "MN André", "MN RC Cláudio", "MN RC De Carvalho"),
  },
  19: { regra: "nominal", nomes: GRUPO_05_19 },
  20: { regra: "so_sg", nomes: [] },
  21: {
    regra: "nominal",
    nomes: G("CC Bragagnolo", "1ºSG Carvalho", "1ºSG Souza", "2ºSG Coutinho", "3ºSG Fernando Fernandes",
      "3ºSG Faillon", "3ºSG Brandão", "3ºSG Paes"),
  },
  22: { regra: "nominal", nomes: GRUPO_22_23 },
  23: { regra: "nominal", nomes: GRUPO_22_23 },
  24: { regra: "so_1sg", nomes: [] },
  25: {
    regra: "nominal",
    nomes: G("CC Torresini", "CC Florêncio", "SO Arlix", "SO Robisom", "SO Alessandro", "SO Adison",
      "SO João Paulo", "SO Giacometti", "1ºSG Carlenilson", "2ºSG Chada"),
  },
  26: {
    regra: "nominal",
    nomes: G("CC Torresini", "CC Florêncio", "SO Ferreira", "SO Farney", "SO Bitencourt",
      "1ºSG Grigório", "2ºSG Bueno", "2ºSG Thiago Costa"),
  },
  27: { regra: "nominal", nomes: G("CT Hoffmann", "2ºTen José Marcos", "SO Melo", "SO Amorim", "2ºSG Valtemir") },
  28: { regra: "nominal", nomes: GRUPO_MESTRES },
  29: { regra: "oficiais", nomes: G("3ºSG Lelis", "3ºSG Leonardo", "3ºSG Juan") },
  30: { regra: "oficiais", nomes: G("3ºSG Lelis", "3ºSG Leonardo", "3ºSG Juan") },
  31: { regra: "contramestre", nomes: [] },
  32: {
    regra: "nominal",
    nomes: G("CC Torresini", "CC Florêncio", "SO Gaia", "SO Lucena", "SO João Paulo", "1ºSG Wilson",
      "2ºSG Felipe Brito", "2ºSG Goulart", "2ºSG Gonçalves", "2ºSG Dourado", "2ºSG Jefté", "3ºSG Kleber Roberto"),
  },
  33: { regra: "nominal", nomes: GRUPO_33_34_35 },
  34: { regra: "nominal", nomes: GRUPO_33_34_35 },
  35: { regra: "nominal", nomes: GRUPO_33_34_35 },
  36: { regra: "nominal", nomes: G("2ºSG Simone Mombach", "CB Fernanda") },
  37: { regra: "nominal", nomes: GRUPO_MESTRES },
  38: { regra: "ostensivo", nomes: [] },
  39: { regra: "nominal", nomes: GRUPO_MESTRES },
  40: { regra: "nominal", nomes: GRUPO_MESTRES },
  41: { regra: "nominal", nomes: GRUPO_MESTRES },
  42: { regra: "nominal", nomes: GRUPO_MESTRES },
  43: {
    regra: "nominal",
    nomes: G("CC Torresini", "CC Florêncio", "SO Giacometti", "SO Sabadini", "SO João Paulo", "1ºSG Janner",
      "1ºSG S. Alves", "2ºSG Felipe Brito", "2ºSG Wellington", "2ºSG Gonçalves", "2ºSG Dourado"),
  },
  44: { regra: "nominal", nomes: GRUPO_16_44_45 },
  45: { regra: "nominal", nomes: GRUPO_16_44_45 },
  46: { regra: "nominal", nomes: G("2ºTen Reinaldo", "2ºSG Ralph", "3ºSG Ricardo", "CB Da Silva", "CB Marques", "CB Sant'Anna") },
  47: { regra: "nominal", nomes: GRUPO_47_48 },
  48: { regra: "nominal", nomes: GRUPO_47_48 },
  49: {
    regra: "nominal",
    nomes: G("CC Torresini", "CC Florêncio", "SO Lucena", "SO João Paulo", "1ºSG Wilson", "2ºSG Felipe Brito",
      "2ºSG Goulart", "2ºSG Gonçalves", "2ºSG Dourado", "2ºSG Jefté", "3ºSG Kleber Roberto",
      "CB Reis", "CB Santos Silva"),
  },
};

// Divide "2ºSG Renato Andrade" -> { posto: "2SG", nome: "RENATO ANDRADE" }
const POSTOS_TOKENS = new Set([
  "SO", "CB", "MN", "SD", "ST", "CT", "CC", "CF", "1SG", "2SG", "3SG", "1TEN", "2TEN", "2", "1",
]);
function parseEntrada(entrada) {
  const partes = String(entrada).trim().split(/\s+/);
  const p0 = normPosto(partes[0]);
  if (POSTOS_TOKENS.has(p0) && partes.length > 1) {
    return { posto: p0, nome: partes.slice(1).join(" "), original: entrada };
  }
  return { posto: null, nome: entrada, original: entrada };
}

// ------------------------------------------------------------------- schema
function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chave_regras (
      chave_numero INTEGER PRIMARY KEY,
      regra TEXT NOT NULL DEFAULT 'nominal'
    );
    CREATE TABLE IF NOT EXISTS chave_autorizacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave_numero INTEGER NOT NULL,
      nip TEXT,
      nome_ref TEXT NOT NULL,
      condicional INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE (chave_numero, nome_ref, condicional)
    );
    CREATE INDEX IF NOT EXISTS idx_chave_autorizacoes_num ON chave_autorizacoes(chave_numero);
    CREATE INDEX IF NOT EXISTS idx_chave_autorizacoes_nip ON chave_autorizacoes(nip);
  `);
}

// Resolve um nome da matriz para o NIP do cadastro existente (militares/pessoas).
function resolverNip(entrada, cadastro) {
  const { posto, nome } = parseEntrada(entrada);
  let cands = cadastro.filter((m) => nomesCompativeis(m.nome, nome));
  if (cands.length > 1 && posto) {
    const porPosto = cands.filter((m) => normPosto(m.posto_graduacao) === posto);
    if (porPosto.length) cands = porPosto;
  }
  const nipsUnicos = [...new Set(cands.map((m) => String(m.nip || "").replace(/\D/g, "")).filter(Boolean))];
  if (nipsUnicos.length === 1) return nipsUnicos[0];
  if (cands.length > 1) {
    // Preferência: correspondência exata de nome
    const exato = [...new Set(
      cands.filter((m) => norm(m.nome) === norm(nome)).map((m) => String(m.nip || "").replace(/\D/g, "")),
    )].filter(Boolean);
    if (exato.length === 1) return exato[0];
  }
  return null; // ficará resolvido em tempo de execução pelo nome
}

function carregarCadastro() {
  const rows = [];
  try {
    rows.push(...db.prepare("SELECT nip, nome, posto_graduacao FROM militares").all());
  } catch {}
  try {
    rows.push(
      ...db.prepare("SELECT identificador AS nip, nome, posto_graduacao FROM pessoas").all()
    );
  } catch {}
  return rows;
}

// Popula a matriz no banco (idempotente — nunca remove autorizações existentes).
function seedAutorizacoes() {
  ensureSchema();
  const cadastro = carregarCadastro();
  const insRegra = db.prepare(
    "INSERT INTO chave_regras (chave_numero, regra) VALUES (?, ?) ON CONFLICT(chave_numero) DO UPDATE SET regra = excluded.regra"
  );
  const insAut = db.prepare(`
    INSERT INTO chave_autorizacoes (chave_numero, nip, nome_ref, condicional)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(chave_numero, nome_ref, condicional) DO UPDATE SET nip = COALESCE(excluded.nip, chave_autorizacoes.nip)
  `);
  const tx = db.transaction(() => {
    for (const [num, cfg] of Object.entries(MATRIZ)) {
      insRegra.run(Number(num), cfg.regra || "nominal");
      for (const nome of cfg.nomes || []) insAut.run(Number(num), resolverNip(nome, cadastro), nome, 0);
      for (const nome of cfg.condicionais || []) insAut.run(Number(num), resolverNip(nome, cadastro), nome, 1);
    }
    // Comandante e Imediato — autorizados em TODAS as chaves (01 a 49).
    for (let num = 1; num <= TOTAL_CHAVES; num++) {
      for (const nome of ACESSO_TOTAL) insAut.run(num, resolverNip(nome, cadastro), nome, 0);
    }

  });
  tx();

  const total = db.prepare("SELECT COUNT(*) c FROM chave_autorizacoes").get().c;
  const semNip = db.prepare("SELECT COUNT(*) c FROM chave_autorizacoes WHERE nip IS NULL").get().c;
  console.log(`[SISTOLDA] Autorizações de chaves aplicadas: ${total} (sem NIP resolvido: ${semNip})`);
}

// ---------------------------------------------------------------- verificação
function listarAutorizacoes(chaveNumero) {
  ensureSchema();
  return db
    .prepare("SELECT nip, nome_ref, condicional FROM chave_autorizacoes WHERE chave_numero = ?")
    .all(Number(chaveNumero));
}

function regraDaChave(chaveNumero) {
  ensureSchema();
  const r = db.prepare("SELECT regra FROM chave_regras WHERE chave_numero = ?").get(Number(chaveNumero));
  return r ? r.regra : null;
}

function baterEntrada(row, pessoa) {
  if (row.nip && pessoa.nip && String(row.nip) === String(pessoa.nip)) return true;
  const { posto, nome } = parseEntrada(row.nome_ref);
  if (!nomesCompativeis(nome, pessoa.nome)) return false;
  // Se a matriz especifica o posto e a pessoa também, exigir coerência apenas
  // quando existir outro militar de mesmo nome (ambiguidade real).
  if (posto && pessoa.posto) {
    const mesmos = carregarCadastro().filter((m) => nomesCompativeis(m.nome, nome));
    const postosDistintos = new Set(mesmos.map((m) => normPosto(m.posto_graduacao))).size > 1;
    if (postosDistintos && normPosto(pessoa.posto) !== posto) return false;
  }
  return true;
}

/**
 * Verifica se a pessoa pode retirar a chave.
 * @param {{numero:number}} chave
 * @param {{nip:string, nome:string, posto:string|null, tipo:string}} pessoa
 * @param {{caboServico?:string|null}} ctx
 * @returns {{autorizado:boolean, motivo:string, regra:string}}
 */
function verificarAutorizacao(chave, pessoa, ctx = {}) {
  const numero = Number(chave?.numero);
  
  // Regra OSTENSIVA Dinâmica:
  // Buscamos a categoria atual da chave no banco para garantir que a regra dinâmica
  // prevaleça sobre a matriz se a chave for OSTENSIVA.
  const chaveDb = db.prepare("SELECT categoria FROM chaves WHERE numero = ?").get(numero);
  if (chaveDb && chaveDb.categoria === 'OSTENSIVA') {
    return { autorizado: true, motivo: "ostensivo", regra: "ostensivo" };
  }

  const regra = regraDaChave(numero);
  // Chave sem regra cadastrada → mantém comportamento atual (não bloqueia).
  if (!regra) return { autorizado: true, motivo: "sem_regra", regra: "sem_regra" };

  if (regra === "ostensivo") return { autorizado: true, motivo: "ostensivo", regra };


  const posto = normPosto(pessoa.posto);
  const emServico =
    !!ctx.caboServico && nomesCompativeis(String(ctx.caboServico).replace(/^\S+\s/, ""), pessoa.nome);

  if (regra === "so_sg") {
    return { autorizado: SUBOFICIAIS_SARGENTOS.includes(posto), motivo: "so_sg", regra };
  }
  if (regra === "so_1sg") {
    return { autorizado: ["SO", "1SG"].includes(posto), motivo: "so_1sg", regra };
  }
  if (regra === "contramestre") {
    return { autorizado: emServico, motivo: "contramestre_de_servico", regra };
  }

  const rows = listarAutorizacoes(numero);
  if (regra === "oficiais" && OFICIAIS.includes(posto)) {
    return { autorizado: true, motivo: "oficial", regra };
  }
  for (const row of rows) {
    if (!baterEntrada(row, pessoa)) continue;
    if (row.condicional && !emServico) continue; // autorizado somente quando de serviço
    return { autorizado: true, motivo: row.condicional ? "nominal_em_servico" : "nominal", regra };
  }
  return { autorizado: false, motivo: "nao_autorizado", regra };
}

// ------------------------------------------------- administração da matriz
const REGRA_LABEL = {
  nominal: "Somente militares nominalmente autorizados",
  ostensivo: "Chave ostensiva — liberada a todos",
  oficiais: "Oficiais + militares nominalmente autorizados",
  so_sg: "Suboficiais e Sargentos",
  so_1sg: "Suboficiais e 1ºSG",
  contramestre: "Contramestre de serviço",
};

// Lista as 49 chaves com regra, descrição e militares autorizados.
function listarMatriz() {
  ensureSchema();
  const chaves = db.prepare("SELECT numero, nome, categoria, departamento FROM chaves ORDER BY numero").all();
  const regras = db.prepare("SELECT chave_numero, regra FROM chave_regras").all();
  const regraMap = new Map(regras.map((r) => [r.chave_numero, r.regra]));
  const auts = db
    .prepare("SELECT id, chave_numero, nip, nome_ref, condicional FROM chave_autorizacoes ORDER BY nome_ref")
    .all();
  return chaves.map((c) => {
    const regra = regraMap.get(c.numero) || "sem_regra";
    return {
      numero: c.numero,
      nome: c.nome,
      categoria: c.categoria,
      departamento: c.departamento,
      regra,
      regra_label: REGRA_LABEL[regra] || "Sem regra cadastrada (liberada)",
      autorizados: auts.filter((a) => a.chave_numero === c.numero),
    };
  });
}

function adicionarAutorizacao({ chave_numero, nip, nome_ref, condicional }) {
  ensureSchema();
  const numero = Number(chave_numero);
  if (!numero) throw Object.assign(new Error("Chave inválida."), { status: 400 });
  const nome = String(nome_ref || "").trim();
  if (!nome) throw Object.assign(new Error("Militar não informado."), { status: 400 });
  const digits = String(nip || "").replace(/\D/g, "") || null;
  const cond = condicional ? 1 : 0;
  db.prepare(`
    INSERT INTO chave_autorizacoes (chave_numero, nip, nome_ref, condicional)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(chave_numero, nome_ref, condicional)
      DO UPDATE SET nip = COALESCE(excluded.nip, chave_autorizacoes.nip)
  `).run(numero, digits, nome, cond);
  // Garante que a chave passe a ter regra nominal caso não possua nenhuma.
  db.prepare("INSERT INTO chave_regras (chave_numero, regra) VALUES (?, 'nominal') ON CONFLICT(chave_numero) DO NOTHING")
    .run(numero);
  return db.prepare("SELECT id, chave_numero, nip, nome_ref, condicional FROM chave_autorizacoes WHERE chave_numero=? AND nome_ref=? AND condicional=?")
    .get(numero, nome, cond);
}

// Edita a configuração da própria chave (número, nome/local e categoria),
// preservando integralmente as autorizações já cadastradas.
function atualizarChave(numeroAtual, { numero, nome, categoria }) {
  ensureSchema();
  const atual = Number(numeroAtual);
  const chave = db.prepare("SELECT * FROM chaves WHERE numero = ?").get(atual);
  if (!chave) throw Object.assign(new Error("Chave não encontrada."), { status: 404 });

  const novoNumero = Number(numero);
  if (!Number.isInteger(novoNumero) || novoNumero <= 0) {
    throw Object.assign(new Error("Número da chave inválido."), { status: 400 });
  }
  const novoNome = String(nome || "").trim();
  if (!novoNome) throw Object.assign(new Error("Informe o nome/local da chave."), { status: 400 });
  const cat = String(categoria || "").trim().toUpperCase();
  if (!["SECRETA", "RESERVADA", "RESTRITA", "OSTENSIVA", "GERAL"].includes(cat)) {
    throw Object.assign(new Error("Categoria inválida (use SECRETA, RESERVADA, RESTRITA, OSTENSIVA ou GERAL)."), { status: 400 });
  }
  if (novoNumero !== atual) {
    const dup = db.prepare("SELECT id FROM chaves WHERE numero = ?").get(novoNumero);
    if (dup) throw Object.assign(new Error(`Já existe a chave Nº ${novoNumero}.`), { status: 409 });
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE chaves SET numero = ?, nome = ?, categoria = ? WHERE id = ?")
      .run(novoNumero, novoNome, cat, chave.id);
    if (novoNumero !== atual) {
      // Move as autorizações e a regra junto com a chave (nada é perdido).
      db.prepare("UPDATE chave_autorizacoes SET chave_numero = ? WHERE chave_numero = ?").run(novoNumero, atual);
      db.prepare("DELETE FROM chave_regras WHERE chave_numero = ?").run(novoNumero);
      db.prepare("UPDATE chave_regras SET chave_numero = ? WHERE chave_numero = ?").run(novoNumero, atual);
    }
  });
  tx();

  return {
    antes: { numero: chave.numero, nome: chave.nome, categoria: chave.categoria },
    depois: { numero: novoNumero, nome: novoNome, categoria: cat },
  };
}

function removerAutorizacao(id) {
  ensureSchema();
  const row = db.prepare("SELECT id, chave_numero, nip, nome_ref FROM chave_autorizacoes WHERE id = ?").get(Number(id));
  if (!row) throw Object.assign(new Error("Autorização não encontrada."), { status: 404 });
  db.prepare("DELETE FROM chave_autorizacoes WHERE id = ?").run(Number(id));
  return row;
}

module.exports = {
  MATRIZ,
  ensureSchema,
  seedAutorizacoes,
  verificarAutorizacao,
  listarAutorizacoes,
  listarMatriz,
  adicionarAutorizacao,
  atualizarChave,
  removerAutorizacao,
  regraDaChave,

  _internals: { norm, normPosto, nomesCompativeis, parseEntrada, resolverNip },
};
