// SISTOLDA — Cliente HTTP do backend local (Node.js + SQLite).
// Todas as PCs apontam para o mesmo backend para sincronização centralizada.

const RAW_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:3001`;

export const API_BASE = RAW_BASE.replace(/\/+$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ============ Tipos do backend ============
export interface ApiChave {
  id: number;
  numero: number;
  nome: string;
  categoria: "secreta" | "geral";
  departamento: "administracao" | "manutencao" | "operacoes" | "seguranca";
  setor: string;
  status: "disponivel" | "emprestada";
  militar_responsavel: string | null;
}
export interface ApiHistoricoChave {
  id: number;
  chave_id: number;
  chave_numero: number;
  chave_nome: string;
  militar: string;
  nip: string | null;
  data_retirada: string;
  data_devolucao: string | null;
  cabo_retirada: string | null;
  cabo_devolucao: string | null;
  status: "em_uso" | "devolvida";
}
export interface ApiViatura {
  id: number;
  prefixo: string;
  modelo: string;
  placa: string | null;
  status: "disponivel" | "em_uso" | "manutencao";
  km_atual: number | null;
  militar_responsavel?: string | null;
}
export interface ApiHistoricoViatura {
  id: number;
  viatura_id: number;
  viatura_prefixo: string;
  motorista: string;
  nip: string | null;
  destino: string;
  km_saida: number | null;
  km_retorno: number | null;
  km_rodado: number | null;
  autonomia_informada: string | null;
  data_saida: string;
  data_retorno: string | null;
  cabo_saida: string | null;
  cabo_retorno: string | null;
  status: "em_uso" | "retornada";
}
export interface ApiVisitante {
  id: number;
  nome: string;
  documento: string;
  militar_responsavel: string;
  local_destino: string;
  hora_entrada: string;
  hora_saida: string | null;
  observacoes: string | null;
  cabo_registro: string | null;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  organizacao?: string | null;
  recorrente_id?: number | null;
  tipo?: "comum" | "recorrente";
}
export interface ApiVisitanteRecorrente {
  id: number;
  nome: string;
  cpf: string | null;
  rg: string | null;
  telefone: string | null;
  organizacao: string | null;
  observacoes: string | null;
  biometria_template: string | null;
  biometria_leituras: number;
  status: "ativo" | "inativo";
  created_at: string;
}
export interface ApiMaterial {
  id: number;
  nome_material: string;
  militar: string;
  nip: string;
  destino: string;
  data_registro: string;
  cabo_registro: string | null;
}
export interface ApiMilitar {
  id: number;
  nip: string;
  nome: string;
  posto_graduacao: string | null;
  biometria_id: string | null;
  ativo: number;
  created_at: string;
}

// ============ Helpers ============
function onlyDigits(v: string) { return (v || "").replace(/\D/g, ""); }

// ============ API ============
export const api = {
  // Chaves
  listChaves: () => request<ApiChave[]>("/chaves"),
  historicoChaves: () => request<ApiHistoricoChave[]>("/chaves/historico"),
  retiradaChave: (body: { chave_id: number; militar: string; nip: string; cabo: string }) =>
    request<{ id: number; ok: true }>("/chaves/retirada", { method: "POST", body: JSON.stringify(body) }),
  devolucaoChave: (body: { chave_id: number; cabo: string }) =>
    request<{ id: number; ok: true }>("/chaves/devolucao", { method: "POST", body: JSON.stringify(body) }),

  // Viaturas
  listViaturas: () => request<ApiViatura[]>("/viaturas"),
  historicoViaturas: () => request<ApiHistoricoViatura[]>("/viaturas/historico"),
  saidaViatura: (body: { viatura_id: number; motorista: string; nip: string; destino: string; cabo: string }) =>
    request("/viaturas/saida", { method: "POST", body: JSON.stringify(body) }),
  retornoViatura: (body: { viatura_id: number; km_retorno: number; autonomia: string | null; cabo: string }) =>
    request("/viaturas/retorno", { method: "POST", body: JSON.stringify(body) }),

  // Visitantes
  listVisitantes: () => request<ApiVisitante[]>("/visitantes"),
  createVisitante: (body: Partial<ApiVisitante> & { nome: string; documento: string; local_destino: string }) =>
    request<{ id: number; ok: true }>("/visitantes", { method: "POST", body: JSON.stringify(body) }),
  saidaVisitante: (id: number) =>
    request(`/visitantes/${id}/saida`, { method: "POST" }),

  // Visitantes Recorrentes
  listRecorrentes: () => request<ApiVisitanteRecorrente[]>("/visitantes-recorrentes"),
  getRecorrenteByCpf: async (cpf: string): Promise<ApiVisitanteRecorrente | null> => {
    const n = onlyDigits(cpf);
    if (!n) return null;
    try { return await request<ApiVisitanteRecorrente>(`/visitantes-recorrentes/cpf/${n}`); }
    catch { return null; }
  },
  createRecorrente: (body: Partial<ApiVisitanteRecorrente> & { nome: string; cpf: string }) =>
    request<{ id: number; ok: true }>("/visitantes-recorrentes", { method: "POST", body: JSON.stringify(body) }),

  // Materiais
  listMateriais: () => request<ApiMaterial[]>("/materiais"),
  createMaterial: (body: Omit<ApiMaterial, "id" | "data_registro">) =>
    request("/materiais", { method: "POST", body: JSON.stringify(body) }),

  // Militares
  listMilitares: () => request<ApiMilitar[]>("/militares"),
  getMilitarByNip: async (nip: string): Promise<ApiMilitar | null> => {
    const n = onlyDigits(nip);
    if (!n) return null;
    try { return await request<ApiMilitar>(`/militares/${n}`); }
    catch { return null; }
  },
};

// ============ Polling padrão para sincronização entre PCs ============
export const SYNC_OPTIONS = {
  refetchInterval: 3000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

// Identificação por NIP via tabela militares (backend SQLite)
export async function nomeDoMilitarPorNip(nip: string): Promise<string> {
  const m = await api.getMilitarByNip(nip);
  if (m?.nome) {
    const posto = (m.posto_graduacao || "").trim();
    return posto ? `${posto} ${m.nome}` : m.nome;
  }
  const t = onlyDigits(nip);
  return t ? `Militar NIP ${t}` : "";
}
