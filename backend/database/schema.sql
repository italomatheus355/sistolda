-- SISTOLDA — Schema SQLite
-- Banco local para uso offline em rede interna.

PRAGMA foreign_keys = ON;

-- 1. MILITARES ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS militares (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT    NOT NULL,
  nip           TEXT    UNIQUE,
  graduacao     TEXT,
  funcao        TEXT,
  biometria_id  TEXT    UNIQUE,
  ativo         INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 2. CHAVES ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chaves (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  numero      INTEGER UNIQUE,
  nome        TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'disponivel'
              CHECK (status IN ('disponivel','emprestada','manutencao')),
  categoria   TEXT    NOT NULL DEFAULT 'geral'
              CHECK (categoria IN ('secreta','geral')),
  localizacao TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 3. RETIRADAS DE CHAVES --------------------------------------------------
CREATE TABLE IF NOT EXISTS retiradas_chaves (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  chave_id       INTEGER NOT NULL REFERENCES chaves(id),
  militar_id     INTEGER NOT NULL REFERENCES militares(id),
  tipo_operacao  TEXT    NOT NULL CHECK (tipo_operacao IN ('retirada','devolucao')),
  data_hora      TEXT    NOT NULL DEFAULT (datetime('now')),
  recebido_por   TEXT
);

-- 4. VIATURAS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS viaturas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT    NOT NULL,
  km_atual   INTEGER NOT NULL DEFAULT 0,
  status     TEXT    NOT NULL DEFAULT 'disponivel'
             CHECK (status IN ('disponivel','em_uso','manutencao')),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 5. HISTORICO DE VIATURAS ------------------------------------------------
CREATE TABLE IF NOT EXISTS historico_viaturas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  viatura_id   INTEGER NOT NULL REFERENCES viaturas(id),
  militar_id   INTEGER NOT NULL REFERENCES militares(id),
  destino      TEXT,
  km_saida     INTEGER,
  km_retorno   INTEGER,
  data_saida   TEXT    NOT NULL DEFAULT (datetime('now')),
  data_retorno TEXT
);

-- 6. VISITANTES -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS visitantes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT    NOT NULL,
  documento  TEXT,
  destino    TEXT,
  entrada    TEXT    NOT NULL DEFAULT (datetime('now')),
  saida      TEXT,
  observacao TEXT
);

-- 7. MATERIAIS ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materiais (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_material       TEXT    NOT NULL,
  militar_responsavel TEXT,
  destino             TEXT,
  data_registro       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 8. PDV ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pdv (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  data       TEXT    NOT NULL,
  aeronave   TEXT,
  piloto     TEXT,
  copiloto   TEXT,
  mecanico   TEXT,
  gsac1      TEXT,
  gsac2      TEXT,
  vn         TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Índices úteis -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_retiradas_chave   ON retiradas_chaves(chave_id);
CREATE INDEX IF NOT EXISTS idx_retiradas_militar ON retiradas_chaves(militar_id);
CREATE INDEX IF NOT EXISTS idx_hv_viatura        ON historico_viaturas(viatura_id);
CREATE INDEX IF NOT EXISTS idx_hv_militar        ON historico_viaturas(militar_id);
CREATE INDEX IF NOT EXISTS idx_pdv_data          ON pdv(data);
