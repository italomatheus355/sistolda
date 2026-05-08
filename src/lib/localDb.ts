// Local data layer — substitui completamente o Supabase usando localStorage.
// Toda persistência fica no navegador. Dados simulados / seed inicial.

const STORAGE_PREFIX = "sistolda:v4:";

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
export type UserRole = "admin" | "operacoes" | "segorg" | "servico";
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

// ============ Seed por departamento ============
type SeedItem = { nome: string; categoria: CategoriaChave };

const ADMINISTRACAO: SeedItem[] = [
  { nome: "Escritório do Imediato",                    categoria: "secreta" },
  { nome: "Escritório do Comandante",                  categoria: "secreta" },
  { nome: "CPD",                                       categoria: "secreta" },
  { nome: "Divisão Pessoal",                           categoria: "secreta" },
  { nome: "Suprimentos",                               categoria: "secreta" },
  { nome: "SECOM",                                     categoria: "secreta" },
  { nome: "Sessão de Inteligência",                    categoria: "secreta" },
  { nome: "Sala de Estar",                             categoria: "geral" },
  { nome: "Divisão de Serviços Gerais",                categoria: "geral" },
  { nome: "Sala de Estar de Segundo e Terceiros",      categoria: "geral" },
  { nome: "Sala de Estar de Sub",                      categoria: "geral" },
  { nome: "Paiol de Material Comum",                   categoria: "geral" },
  { nome: "Paiol de Tintas",                           categoria: "geral" },
  { nome: "Praça d'Armas",                             categoria: "geral" },
  { nome: "Vestiários Oficiais",                       categoria: "geral" },
  { nome: "Dormitório do Contramestre",                categoria: "geral" },
  { nome: "Vestiário Feminino",                        categoria: "geral" },
  { nome: "Cisterna",                                  categoria: "geral" },
  { nome: "Portões de Acesso à Retaguarda",            categoria: "geral" },
  { nome: "Mestre 1",                                  categoria: "geral" },
  { nome: "Mestre 2",                                  categoria: "geral" },
  { nome: "Mestre 3",                                  categoria: "geral" },
  { nome: "Mestre 4",                                  categoria: "geral" },
  { nome: "Paiol do Cave",                             categoria: "geral" },
  { nome: "Paiol de Geração",                          categoria: "geral" },
  { nome: "Ford C",                                    categoria: "geral" },
  { nome: "Viatura L200",                              categoria: "geral" },
];

const MANUTENCAO: SeedItem[] = [
  { nome: "Divisão de Armamento",                      categoria: "secreta" },
  { nome: "Escoteria da FAB",                          categoria: "secreta" },
  { nome: "Departamento de Manutenção",                categoria: "secreta" },
  { nome: "Oficina de ASV/HV",                         categoria: "geral" },
  { nome: "Oficina de MV",                             categoria: "geral" },
  { nome: "PPU",                                       categoria: "geral" },
  { nome: "Divisão de Controle de Qualidade",          categoria: "geral" },
  { nome: "Planejamento da Manutenção",                categoria: "geral" },
  { nome: "Divisão de Apoio",                          categoria: "geral" },
  { nome: "Divisão de Aviônica",                       categoria: "geral" },
  { nome: "Oficina de Baterias",                       categoria: "geral" },
  { nome: "Sessão do Conversor",                       categoria: "geral" },
  { nome: "Sala do Compressor",                        categoria: "geral" },
  { nome: "POG 1",                                     categoria: "geral" },
  { nome: "POG 2",                                     categoria: "geral" },
  { nome: "Paiol do Reboque",                          categoria: "geral" },
];

const OPERACOES: SeedItem[] = [
  { nome: "Departamento de Operações",                 categoria: "secreta" },
  { nome: "Sala do Briefing",                          categoria: "geral" },
  { nome: "Paiol de Salvamento",                       categoria: "geral" },
];

const SEGURANCA: SeedItem[] = [
  { nome: "Fator Humano",                              categoria: "secreta" },
  { nome: "Departamento de Segurança",                 categoria: "secreta" },
  { nome: "Paiol de Sobrevivência",                    categoria: "geral" },
  { nome: "Oficina de Infláveis",                      categoria: "geral" },
];

function seedChaves(): Chave[] {
  const grupos: { dep: Departamento; itens: SeedItem[] }[] = [
    { dep: "administracao", itens: ADMINISTRACAO },
    { dep: "manutencao",    itens: MANUTENCAO },
    { dep: "operacoes",     itens: OPERACOES },
    { dep: "seguranca",     itens: SEGURANCA },
  ];

  const out: Chave[] = [];
  let n = 1;
  for (const g of grupos) {
    for (const item of g.itens) {
      out.push({
        id: `chave-${n}`,
        numero: n,
        nome: item.nome,
        departamento: g.dep,
        setor: item.nome,
        codigo: `CH-${String(n).padStart(2, "0")}`,
        status: "disponivel",
        militar_responsavel: null,
        categoria: item.categoria,
      });
      n++;
    }
  }
  return out;
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
    { id: "u-admin",     username: "admin",     password: "admin",     role: "admin",     created_at: now },
    { id: "u-operacoes", username: "operacoes", password: "operacoes", role: "operacoes", created_at: now },
    { id: "u-segorg",    username: "segorg",    password: "segorg",    role: "segorg",    created_at: now },
    { id: "u-servico",   username: "servico",   password: "servico",   role: "servico",   created_at: now },
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
  | "users";

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
  admin:     ["chaves", "viaturas", "visitantes", "material", "pdv", "escala", "usuarios"],
  operacoes: ["pdv"],
  segorg:    ["chaves"],
  servico:   ["chaves", "viaturas", "visitantes", "material"],
};

export function canAccess(role: UserRole | undefined, route: string): boolean {
  if (!role) return false;
  return ROLE_ACCESS[role]?.includes(route) ?? false;
}
