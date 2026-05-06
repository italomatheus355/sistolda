// Local data layer — substitui completamente o Supabase usando localStorage.
// Toda persistência fica no navegador. Dados simulados / seed inicial.

const STORAGE_PREFIX = "sistolda:v2:";

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
  // dispatch local event para invalidar queries
  window.dispatchEvent(new CustomEvent("localdb:change", { detail: { key } }));
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ============ Tipos ============
export type CategoriaChave = "secreta" | "geral";

export interface Chave {
  id: string;
  numero: number;
  nome: string;
  departamento: string | null;
  codigo: string;
  status: "disponivel" | "emprestada";
  militar_responsavel: string | null;
  categoria: CategoriaChave;
}

export interface HistoricoChave {
  id: string;
  chave_id: string;
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
  prefixo: string; // Nome operacional (ex: Ford Ka, L200)
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

export interface PDV {
  id: string;
  data: string; // YYYY-MM-DD
  aeronave: string;
  piloto: string;
  copiloto: string;
  mecanico_voo: string;
  gsac1: string;
  gsac2: string;
  vn: string;
  created_at: string;
}

export interface BlocoHorario { inicio: string; fim: string }

export interface EscalaCabo {
  id: string;
  data: string;        // YYYY-MM-DD
  cabo_id: number;     // 1 ou 2
  cabo_nome: string;
  blocos: BlocoHorario[];
}

export interface UserAccount {
  id: string;
  email: string;
  password: string;
  nome: string;
  posto_grad: string | null;
  matricula: string | null;
  role: "administrador" | "cabo_auxiliar";
  created_at: string;
}

// ============ Seed ============
const CHAVES_SECRETAS: string[] = [
  "Escritório do Imediato",
  "Câmara do Comandante",
  "Divisão de Armamento",
  "Escoteria Fábio",
  "Departamento de Operações",
  "Divisão de Fase Humana",
  "Departamento de Segurança da Aviação",
  "Departamento de Manutenção",
  "CPD",
  "Divisão de Pessoal",
  "Divisão de Suprimentos",
  "SECOM",
  "(Secreta) Seção de Inteligência",
];

const CHAVES_GERAIS: string[] = [
  "Oficina de SV/HV",
  "Oficina de MV",
  "Paiol de Pronto Uso (PPU)",
  "Sala de Estar de CB/MN",
  "Divisão de Serviços Gerais",
  "Sala do Briefing",
  "Sala de Estar de 2SG/3SG",
  "Paiol de Salvamento",
  "Paiol de Sobrevivência",
  "Oficina de Infláveis",
  "Sala de Estar de SO/1SG",
  "Divisão de Controle de Qualidade",
  "Divisão de Planejamento",
  "Paiol de Material Comum",
  "Paiol de Tintas",
  "Praça D'Armas",
  "Vestiário dos Oficiais",
  "Dormitório do Contramestre",
  "Divisão de Apoio",
  "Divisão de Aviônica",
  "Oficina de Baterias",
  "Sala do Conversor",
  "Vestiário Feminino",
  "Cisterna",
  "Portão de Acesso (Retaguarda)",
  "Mestre 1",
  "Paiol do Mestre 2",
  "Paiol do Mestre 3",
  "Paiol do Mestre 4",
  "Sala do Compressor",
  "POG1",
  "POG2",
  "Paiol do CAV",
  "Viatura Ford Ka",
  "Viatura L200",
  "Paiol do Reboque",
  "Paiol de Refrigeração",
  "Vago",
];

function seedChaves(): Chave[] {
  const all = [
    ...CHAVES_SECRETAS.map((nome, i) => ({ nome, categoria: "secreta" as const, numero: i + 1 })),
    ...CHAVES_GERAIS.map((nome, i) => ({ nome, categoria: "geral" as const, numero: CHAVES_SECRETAS.length + i + 1 })),
  ];
  return all.map((c) => ({
    id: `chave-${c.numero}`,
    numero: c.numero,
    nome: c.nome,
    departamento: null,
    codigo: `CH-${String(c.numero).padStart(2, "0")}`,
    status: "disponivel" as const,
    militar_responsavel: null,
    categoria: c.categoria,
  }));
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
    { id: "user-admin", email: "admin@portaria.mil", password: "Admin@2026", nome: "Administrador", posto_grad: "Sgt", matricula: "00001", role: "administrador", created_at: now },
    { id: "user-cabo", email: "cabo@portaria.mil", password: "Cabo@2026", nome: "Cabo de Plantão", posto_grad: "Cb", matricula: "00002", role: "cabo_auxiliar", created_at: now },
  ];
}

function seedEscala(): EscalaCabo[] {
  const today = new Date().toISOString().split("T")[0];
  return [
    { id: "esc-1", data: today, cabo_id: 1, cabo_nome: "Cb Pereira", blocos: [{ inicio: "08:00", fim: "20:00" }] },
    { id: "esc-2", data: today, cabo_id: 2, cabo_nome: "Cb Rodrigues", blocos: [{ inicio: "20:00", fim: "08:00" }] },
  ];
}

// ============ API genérica de tabelas ============
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
  list<T>(table: TableName): T[] {
    return getAll<T>(table);
  },
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

// ============ Cabo on duty (lógica do RPC) ============
export function getCaboOnDuty(): string {
  const today = new Date().toISOString().split("T")[0];
  const escalas = localDb.list<EscalaCabo>("escala_cabos").filter((e) => e.data === today);
  const currH = new Date().getHours();
  for (const e of escalas) {
    for (const b of e.blocos) {
      const sH = parseInt(b.inicio.split(":")[0]);
      const eH = parseInt(b.fim.split(":")[0]);
      const inBlock = sH < eH ? currH >= sH && currH < eH : currH >= sH || currH < eH;
      if (inBlock) return e.cabo_nome || "Não identificado";
    }
  }
  return "Não identificado";
}

// ============ Subscribe (para invalidação reativa) ============
export function subscribeChanges(cb: (key: string) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.key) cb(detail.key);
  };
  window.addEventListener("localdb:change", handler);
  return () => window.removeEventListener("localdb:change", handler);
}
