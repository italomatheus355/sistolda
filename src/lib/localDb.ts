// Local data layer — substitui completamente o Supabase usando localStorage.
// Toda persistência fica no navegador. Dados simulados / seed inicial.

const STORAGE_PREFIX = "sistolda:v5:";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("localdb:change", { detail: { key } }));
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ============ Tipos ============
export type UserRole = "admin" | "seg_org" | "tolda";
export type CategoriaChave = "secreta" | "geral";
export type Departamento = "administracao" | "manutencao" | "operacoes" | "seguranca";

export const DEPARTAMENTOS: { id: Departamento; label: string }[] = [
  { id: "administracao", label: "Administração" },
  { id: "manutencao",    label: "Manutenção" },
  { id: "operacoes",     label: "Operações" },
  { id: "seguranca",     label: "Segurança" },
];

export interface Chave {
  id: string;
  numero: number;
  nome: string;
  departamento: Departamento;
  setor: string;
  codigo: string;
  status: "disponivel" | "emprestada";
  militar_responsavel: string | null;
  categoria: CategoriaChave;
}

export interface HistoricoChave {
  id: string;
  chave_id: string;
  chave_numero: number;
  chave_nome: string;
  militar: string;
  matricula: string | null;
  data_retirada: string;
  data_devolucao: string | null;
  cabo_retirada: string | null;
  cabo_devolucao: string | null;
  status: "em_uso" | "devolvida";
}

export interface Viatura {
  id: string;
  numero: number;
  prefixo: string;
  modelo: string;
  placa: string | null;
  status: "disponivel" | "em_uso" | "manutencao";
  militar_responsavel: string | null;
  km_atual: number | null;
}

export interface HistoricoViatura {
  id: string;
  viatura_id: string;
  viatura_prefixo: string;
  motorista: string;
  matricula: string | null;
  destino: string;
  km_saida: number | null;
  km_retorno: number | null;
  km_rodado: number | null;
  data_saida: string;
  data_retorno: string | null;
  cabo_saida: string | null;
  cabo_retorno: string | null;
  autonomia_informada: string | null;
  status: "em_uso" | "retornada";
}

export interface Visitante {
  id: string;
  nome: string;
  documento: string;
  militar_responsavel: string;
  local_destino: string;
  hora_entrada: string;
  hora_saida: string | null;
  observacoes: string | null;
  cabo_registro: string | null;
}

export interface RegistroMaterial {
  id: string;
  nome_material: string;
  militar: string;
  nip: string;
  destino: string;
  data_registro: string;
  cabo_registro: string | null;
}

// ====== PDV (Plano Diário de Voo) ======
export interface PdvTripulacao {
  anv_svc: string;
  periodo: string;
  p1: string;
  p2: string;
  mcv: string;
  fiel: string;
  gsar1: string;
  gsar2: string;
  vn: string;
}

export interface PdvMissao {
  id: string;
  evt: string;
  pmpe: string;
  anv: string;
  abast_aut: string;
  etd: string;
  eta: string;
  area: string;
  p1: string;
  p2: string;
  ps_xy_fiel: string;
  observacoes: string;
}

export interface PDV {
  id: string;
  data: string;
  tripulacao: PdvTripulacao[];
  config_asd: string;
  material_gsar: string;
  missoes: PdvMissao[];
  created_at: string;
}

export interface BlocoHorario { inicio: string; fim: string }

export interface EscalaCabo {
  id: string;
  data: string;
  cabo_id: number;
  cabo_nome: string;
  blocos: BlocoHorario[];
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  created_at: string;
}

// ============ Seed ordenado conforme numeração oficial ============
type SeedItem = { nome: string; categoria: CategoriaChave; departamento: Departamento };

const CHAVES_ORDENADAS: SeedItem[] = [
  { nome: "Escritório do Imediato",                categoria: "secreta", departamento: "administracao" },
  { nome: "Câmara do Comandante",                  categoria: "secreta", departamento: "administracao" },
  { nome: "Divisão de Armamento",                  categoria: "secreta", departamento: "manutencao" },
  { nome: "Escoteria FAB",                         categoria: "secreta", departamento: "manutencao" },
  { nome: "Departamento de Operações",             categoria: "secreta", departamento: "operacoes" },
  { nome: "Divisão de Fator Humano",               categoria: "secreta", departamento: "seguranca" },
  { nome: "Departamento de Segurança da Aviação",  categoria: "secreta", departamento: "seguranca" },
  { nome: "Departamento de Manutenção",            categoria: "secreta", departamento: "manutencao" },
  { nome: "CPD",                                   categoria: "secreta", departamento: "administracao" },
  { nome: "Divisão de Pessoal",                    categoria: "secreta", departamento: "administracao" },
  { nome: "Divisão de Suprimentos",                categoria: "secreta", departamento: "administracao" },
  { nome: "SECOM",                                 categoria: "secreta", departamento: "administracao" },
  { nome: "Seção de Inteligência",                 categoria: "secreta", departamento: "administracao" },
  { nome: "Oficina de SV/HV",                      categoria: "geral",   departamento: "manutencao" },
  { nome: "Oficina de MV",                         categoria: "geral",   departamento: "manutencao" },
  { nome: "Paiol de Pronto Uso (PPU)",             categoria: "geral",   departamento: "manutencao" },
  { nome: "Sala de Estar de CB/MN",                categoria: "geral",   departamento: "administracao" },
  { nome: "Divisão de Serviços Gerais",            categoria: "geral",   departamento: "administracao" },
  { nome: "Sala do Briefing",                      categoria: "geral",   departamento: "operacoes" },
  { nome: "Sala de Estar de 2SG/3SG",              categoria: "geral",   departamento: "administracao" },
  { nome: "Paiol de Salvamento",                   categoria: "geral",   departamento: "operacoes" },
  { nome: "Paiol de Sobrevivência",                categoria: "geral",   departamento: "seguranca" },
  { nome: "Oficina de Infláveis",                  categoria: "geral",   departamento: "seguranca" },
  { nome: "Sala de Estar de SO/1SG",               categoria: "geral",   departamento: "administracao" },
  { nome: "Divisão de Controle de Qualidade",      categoria: "geral",   departamento: "manutencao" },
  { nome: "Divisão de Planejamento",               categoria: "geral",   departamento: "manutencao" },
  { nome: "Paiol de Material Comum",               categoria: "geral",   departamento: "administracao" },
  { nome: "Paiol de Tintas",                       categoria: "geral",   departamento: "administracao" },
  { nome: "Praça D'Armas",                         categoria: "geral",   departamento: "administracao" },
  { nome: "Vestiário dos Oficiais",                categoria: "geral",   departamento: "administracao" },
  { nome: "Dormitório do Contramestre",            categoria: "geral",   departamento: "administracao" },
  { nome: "Divisão de Apoio",                      categoria: "geral",   departamento: "manutencao" },
  { nome: "Divisão de Aviônica",                   categoria: "geral",   departamento: "manutencao" },
  { nome: "Oficina de Baterias",                   categoria: "geral",   departamento: "manutencao" },
  { nome: "Sala do Conversor",                     categoria: "geral",   departamento: "manutencao" },
  { nome: "Vestiário Feminino",                    categoria: "geral",   departamento: "administracao" },
  { nome: "Cisterna",                              categoria: "geral",   departamento: "administracao" },
  { nome: "Portão de Acesso (Retaguarda)",         categoria: "geral",   departamento: "administracao" },
  { nome: "Mestre 1",                              categoria: "geral",   departamento: "administracao" },
  { nome: "Paiol do Mestre 2",                     categoria: "geral",   departamento: "administracao" },
  { nome: "Paiol do Mestre 3",                     categoria: "geral",   departamento: "administracao" },
  { nome: "Paiol do Mestre 4",                     categoria: "geral",   departamento: "administracao" },
  { nome: "Sala do Compressor",                    categoria: "geral",   departamento: "manutencao" },
  { nome: "POG1",                                  categoria: "geral",   departamento: "manutencao" },
  { nome: "POG2",                                  categoria: "geral",   departamento: "manutencao" },
  { nome: "Paiol do CAV",                          categoria: "geral",   departamento: "administracao" },
  { nome: "Viatura Ford Ka",                       categoria: "geral",   departamento: "administracao" },
  { nome: "Viatura L200",                          categoria: "geral",   departamento: "administracao" },
  { nome: "Paiol do Reboque",                      categoria: "geral",   departamento: "manutencao" },
  { nome: "Paiol de Refrigeração",                 categoria: "geral",   departamento: "manutencao" },
  { nome: "Vago",                                  categoria: "geral",   departamento: "administracao" },
];

function seedChaves(): Chave[] {
  return CHAVES_ORDENADAS.map((item, i) => {
    const n = i + 1;
    return {
      id: `chave-${n}`,
      numero: n,
      nome: item.nome,
      departamento: item.departamento,
      setor: item.nome,
      codigo: `CH-${String(n).padStart(2, "0")}`,
      status: "disponivel" as const,
      militar_responsavel: null,
      categoria: item.categoria,
    };
  });
}

function seedViaturas(): Viatura[] {
  return [
    { id: "vtr-1", numero: 1, prefixo: "Ford Ka", modelo: "Ford Ka", placa: null, status: "disponivel", militar_responsavel: null, km_atual: 45000 },
    { id: "vtr-2", numero: 2, prefixo: "L200", modelo: "Mitsubishi L200", placa: null, status: "disponivel", militar_responsavel: null, km_atual: 78000 },
  ];
}

function seedUsers(): UserAccount[] {
  const now = new Date().toISOString();
  return [
    { id: "u-admin",   username: "admin",   password: "admin",        role: "admin",   created_at: now },
    { id: "u-seg-org", username: "seg_org", password: "seg_org@2026", role: "seg_org", created_at: now },
    { id: "u-tolda",   username: "tolda",   password: "tolda@2026",   role: "tolda",   created_at: now },
  ];
}

function seedEscala(): EscalaCabo[] {
  const today = new Date().toISOString().split("T")[0];
  return [
    { id: "esc-1", data: today, cabo_id: 1, cabo_nome: "Cabo Auxiliar 01", blocos: [{ inicio: "08:00", fim: "20:00" }] },
    { id: "esc-2", data: today, cabo_id: 2, cabo_nome: "Cabo Auxiliar 02", blocos: [{ inicio: "20:00", fim: "08:00" }] },
  ];
}

type TableName =
  | "chaves" | "historico_chaves"
  | "viaturas" | "historico_viaturas"
  | "visitantes"
  | "registros_materiais"
  | "escala_cabos"
  | "pdv"
  | "users"
  | "biometrias";

const seeders: Record<TableName, () => any[]> = {
  chaves: seedChaves,
  historico_chaves: () => [],
  viaturas: seedViaturas,
  historico_viaturas: () => [],
  visitantes: () => [],
  registros_materiais: () => [],
  escala_cabos: seedEscala,
  pdv: () => [],
  users: seedUsers,
  biometrias: () => [],
};

function getAll<T>(table: TableName): T[] {
  const existing = localStorage.getItem(STORAGE_PREFIX + table);
  if (existing === null) {
    const seeded = seeders[table]();
    save(table, seeded);
    return seeded as T[];
  }
  return load<T[]>(table, []);
}

function setAll<T>(table: TableName, rows: T[]) {
  save(table, rows);
}

export const localDb = {
  list<T>(table: TableName): T[] { return getAll<T>(table); },
  insert<T extends { id?: string }>(table: TableName, row: Omit<T, "id"> & { id?: string }): T {
    const rows = getAll<T>(table);
    const newRow = { ...(row as any), id: row.id || uid() } as T;
    rows.push(newRow);
    setAll(table, rows);
    return newRow;
  },
  update<T extends { id: string }>(table: TableName, id: string, patch: Partial<T>): T | null {
    const rows = getAll<T>(table);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    rows[idx] = { ...rows[idx], ...patch };
    setAll(table, rows);
    return rows[idx];
  },
  remove(table: TableName, id: string) {
    const rows = getAll<{ id: string }>(table);
    setAll(table, rows.filter((r) => r.id !== id));
  },
  resetAll() {
    Object.keys(seeders).forEach((t) => localStorage.removeItem(STORAGE_PREFIX + t));
  },
};

// ============ Identificação por NIP via biometria ============
export interface BiometriaRecord {
  id: string;
  identificacao: string;
  nip: string;
  template: string | null;
  leituras: number;
  status: "ativa" | "inativa";
  data_cadastro: string;
}

export function buscarBiometriaPorNip(nip: string): BiometriaRecord | null {
  const t = (nip || "").trim();
  if (!t) return null;
  const all = localDb.list<BiometriaRecord>("biometrias");
  return all.find((b) => b.nip === t && b.status === "ativa") || null;
}

export function identificarMilitarPorNip(nip: string): string {
  const b = buscarBiometriaPorNip(nip);
  if (b) return b.identificacao;
  const t = (nip || "").trim();
  return t ? `Militar NIP ${t}` : "";
}

// ============ Cabo on duty ============
export function getCaboOnDuty(): string {
  const today = new Date().toISOString().split("T")[0];
  const escalas = localDb.list<EscalaCabo>("escala_cabos").filter((e) => e.data === today);
  const currH = new Date().getHours();
  for (const e of escalas) {
    for (const b of e.blocos) {
      const sH = parseInt(b.inicio.split(":")[0]);
      const eH = parseInt(b.fim.split(":")[0]);
      const inBlock = sH < eH ? currH >= sH && currH < eH : currH >= sH || currH < eH;
      if (inBlock) return e.cabo_nome || "Cabo Auxiliar de Serviço";
    }
  }
  return "Cabo Auxiliar de Serviço";
}

export function subscribeChanges(cb: (key: string) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.key) cb(detail.key);
  };
  window.addEventListener("localdb:change", handler);
  return () => window.removeEventListener("localdb:change", handler);
}

// ============ Permissões por perfil ============
export const ROLE_ACCESS: Record<UserRole, string[]> = {
  admin:   ["chaves", "viaturas", "visitantes", "material", "pdv", "dashboard", "escala", "usuarios", "biometria"],
  seg_org: ["chaves", "viaturas", "visitantes", "material", "pdv", "dashboard", "escala", "usuarios", "biometria"],
  tolda:   ["dashboard", "chaves", "viaturas", "visitantes", "material", "pdv"],
};

export function canAccess(role: UserRole | undefined, route: string): boolean {
  if (!role) return false;
  return ROLE_ACCESS[role]?.includes(route) ?? false;
}
