-- SISTOLDA - Schema do banco SQLite local

CREATE TABLE IF NOT EXISTS militares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nip TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  posto_graduacao TEXT,
  biometria_id TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','operacoes','segorg','servico')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('secreta','geral')),
  departamento TEXT NOT NULL CHECK (departamento IN ('administracao','manutencao','operacoes','seguranca')),
  setor TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel','emprestada')),
  militar_responsavel TEXT
);

CREATE TABLE IF NOT EXISTS retiradas_chaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chave_id INTEGER NOT NULL REFERENCES chaves(id),
  chave_numero INTEGER NOT NULL,
  chave_nome TEXT NOT NULL,
  militar TEXT NOT NULL,
  nip TEXT,
  data_retirada TEXT NOT NULL DEFAULT (datetime('now')),
  data_devolucao TEXT,
  cabo_retirada TEXT,
  cabo_devolucao TEXT,
  status TEXT NOT NULL DEFAULT 'em_uso' CHECK (status IN ('em_uso','devolvida'))
);

CREATE TABLE IF NOT EXISTS viaturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefixo TEXT UNIQUE NOT NULL,
  modelo TEXT NOT NULL,
  placa TEXT,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel','em_uso','manutencao')),
  km_atual INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS historico_viaturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viatura_id INTEGER NOT NULL REFERENCES viaturas(id),
  viatura_prefixo TEXT NOT NULL,
  motorista TEXT NOT NULL,
  nip TEXT,
  destino TEXT NOT NULL,
  km_saida INTEGER,
  km_retorno INTEGER,
  km_rodado INTEGER,
  autonomia_informada TEXT,
  data_saida TEXT NOT NULL DEFAULT (datetime('now')),
  data_retorno TEXT,
  cabo_saida TEXT,
  cabo_retorno TEXT,
  status TEXT NOT NULL DEFAULT 'em_uso' CHECK (status IN ('em_uso','retornada'))
);

CREATE TABLE IF NOT EXISTS visitantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  documento TEXT NOT NULL,
  militar_responsavel TEXT NOT NULL,
  local_destino TEXT NOT NULL,
  hora_entrada TEXT NOT NULL DEFAULT (datetime('now')),
  hora_saida TEXT,
  observacoes TEXT,
  cabo_registro TEXT,
  cpf TEXT,
  rg TEXT,
  telefone TEXT,
  organizacao TEXT,
  recorrente_id INTEGER,
  tipo TEXT NOT NULL DEFAULT 'comum'
);

CREATE TABLE IF NOT EXISTS visitantes_civis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  rg TEXT,
  telefone TEXT,
  empresa TEXT,
  observacoes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS militares_externos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  posto_graduacao TEXT,
  forca_militar TEXT,
  telefone TEXT,
  biometria_template TEXT,
  biometria_leituras INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visitantes_recorrentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  rg TEXT,
  telefone TEXT,
  organizacao TEXT,
  observacoes TEXT,
  biometria_template TEXT,
  biometria_leituras INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS materiais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_material TEXT NOT NULL,
  militar TEXT NOT NULL,
  nip TEXT NOT NULL,
  destino TEXT NOT NULL,
  data_registro TEXT NOT NULL DEFAULT (datetime('now')),
  cabo_registro TEXT
);

CREATE TABLE IF NOT EXISTS biometrias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identificacao TEXT NOT NULL,
  nip TEXT NOT NULL,
  template TEXT,
  leituras INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','inativa')),
  data_cadastro TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pdv (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT UNIQUE NOT NULL,
  tripulacao TEXT NOT NULL DEFAULT '[]',
  missoes TEXT NOT NULL DEFAULT '[]',
  config_asd TEXT,
  material_gsar TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logs_auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  modulo TEXT,
  acao TEXT,
  nip TEXT,
  nome TEXT,
  descricao TEXT
);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_ts ON logs_auditoria(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_nip ON logs_auditoria(nip);

-- Cadastramento de Pessoas (Marinha, Exército, Civil)
CREATE TABLE IF NOT EXISTS pessoas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('marinha','exercito','civil')),
  identificador TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pessoas_ident ON pessoas(identificador);



