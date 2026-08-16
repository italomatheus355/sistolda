// SISTOLDA — Cliente HTTP do backend local (Node.js + SQLite).
// Todas as PCs apontam para o mesmo backend para sincronização centralizada.

const RAW_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:3001`;

export const API_BASE = RAW_BASE.replace(/\/+$/, "");

// ============ Token JWT (Bearer) ============
const TOKEN_KEY = "sistolda:token";
export function setAuthToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getAuthToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

// Handler global para 401 — montado pelo AuthProvider
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) { onUnauthorized = fn; }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api${path}`, { ...init, headers });
  if (res.status === 401) {
    setAuthToken(null);
    if (onUnauthorized) onUnauthorized();
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    let body: any = null;
    try { body = await res.json(); msg = body?.error || msg; } catch {}
    const err = new Error(msg) as Error & { code?: string; status?: number; body?: any };
    err.status = res.status;
    err.code = body?.code;
    err.body = body;
    throw err;
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
  pessoa_tipo?: PessoaTipo;
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
  pessoa_tipo?: PessoaTipo;
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
  tipo?: "comum" | "recorrente" | "civil" | "militar_externo";
  civil_id?: number | null;
  militar_externo_id?: number | null;
  forca_militar?: string | null;
  posto_graduacao?: string | null;
  origem_identificacao?: "manual" | "cpf" | "rg" | "biometria";
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
export interface ApiVisitanteCivil {
  id: number;
  nome: string;
  cpf: string | null;
  rg: string | null;
  telefone: string | null;
  empresa: string | null;
  observacoes: string | null;
  created_at: string;
}
export interface ApiMilitarExterno {
  id: number;
  nome: string;
  cpf: string | null;
  posto_graduacao: string | null;
  forca_militar: string | null;
  telefone: string | null;
  biometria_template: string | null;
  biometria_leituras: number;
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
  pessoa_tipo?: PessoaTipo;
  status?: string | null;
  data_saida?: string | null;
  cabo_saida?: string | null;
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

export type PessoaTipo = "marinha" | "exercito" | "civil";
export interface ApiPessoa {
  id: number;
  nome: string;
  tipo: PessoaTipo;
  identificador: string;
  cpf: string | null;
  rg: string | null;
  telefone: string | null;
  posto_graduacao: string | null;
  created_at: string;
}
export interface PessoaInput {
  nome: string;
  tipo: PessoaTipo;
  identificador?: string;
  cpf?: string | null;
  rg?: string | null;
  telefone?: string | null;
  posto_graduacao?: string | null;
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

  // Visitantes Civis (cadastro permanente)
  listCivis: () => request<ApiVisitanteCivil[]>("/visitantes-civis"),
  getCivilByCpf: async (cpf: string): Promise<ApiVisitanteCivil | null> => {
    const n = onlyDigits(cpf);
    if (!n) return null;
    try { return await request<ApiVisitanteCivil>(`/visitantes-civis/cpf/${n}`); }
    catch { return null; }
  },
  getCivilByRg: async (rg: string): Promise<ApiVisitanteCivil | null> => {
    const r = (rg || "").trim();
    if (!r) return null;
    try { return await request<ApiVisitanteCivil>(`/visitantes-civis/rg/${encodeURIComponent(r)}`); }
    catch { return null; }
  },
  createCivil: (body: Partial<ApiVisitanteCivil> & { nome: string; cpf: string }) =>
    request<{ id: number; ok: true }>("/visitantes-civis", { method: "POST", body: JSON.stringify(body) }),

  // Militares Externos (cadastro permanente + biometria)
  listExternos: () => request<ApiMilitarExterno[]>("/militares-externos"),
  getExternoByCpf: async (cpf: string): Promise<ApiMilitarExterno | null> => {
    const n = onlyDigits(cpf);
    if (!n) return null;
    try { return await request<ApiMilitarExterno>(`/militares-externos/cpf/${n}`); }
    catch { return null; }
  },
  createExterno: (body: Partial<ApiMilitarExterno> & { nome: string; cpf: string }) =>
    request<{ id: number; ok: true }>("/militares-externos", { method: "POST", body: JSON.stringify(body) }),
  identificarExternoBiometria: async (id: number): Promise<ApiMilitarExterno | null> => {
    try {
      return await request<ApiMilitarExterno>("/militares-externos/identificar-biometria", {
        method: "POST", body: JSON.stringify({ id }),
      });
    } catch { return null; }
  },

  // Materiais
  listMateriais: () => request<ApiMaterial[]>("/materiais"),
  createMaterial: (body: Omit<ApiMaterial, "id" | "data_registro">) =>
    request("/materiais", { method: "POST", body: JSON.stringify(body) }),
  saidaMaterial: (id: number, cabo?: string | null) =>
    request(`/materiais/${id}/saida`, { method: "POST", body: JSON.stringify({ cabo: cabo ?? null }) }),

  // Militares
  listMilitares: () => request<ApiMilitar[]>("/militares"),
  getMilitarByNip: async (nip: string): Promise<ApiMilitar | null> => {
    const n = onlyDigits(nip);
    if (!n) return null;
    try { return await request<ApiMilitar>(`/militares/${n}`); }
    catch { return null; }
  },

  // Operação unificada — autenticação por NIP (leitor Keyboard Wedge)
  autenticarBiometria: (body: {
    nip: string;
    modulo: "chaves" | "visitantes" | "materiais" | "viaturas" | "administracao" | string;
    acao: string;
    itens?: (number | string)[];
    cabo?: string | null;
    payload?: Record<string, any>;
  }) => request<{
    success: true;
    nip: string;
    nome: string;
    descricao?: string;
    id?: number;
    chaves?: { id: number; numero: number; nome: string }[];
  }>("/operacao/autenticar-biometria", { method: "POST", body: JSON.stringify(body) }),

  // ===== Auth =====
  login: (body: { username: string; password: string }) =>
    request<{ token: string; user: { id: number; username: string; role: string } }>(
      "/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<{ user: { id: number; username: string; role: string } }>("/auth/me"),
  refreshSession: () => request<{ token: string }>("/auth/refresh", { method: "POST" }),
  logoutServer: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),

  // ===== Usuários =====
  listUsers: () => request<Array<{ id: number; username: string; role: string; bloqueado: boolean; created_at: string; ultimo_acesso: string | null }>>("/users"),
  createUser: (body: { username: string; password: string; role: string }) =>
    request<{ id: number; ok: true }>("/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id: number, body: { role?: string; bloqueado?: boolean }) =>
    request(`/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  resetUserPassword: (id: number, password: string) =>
    request(`/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) }),
  deleteUser: (id: number) => request(`/users/${id}`, { method: "DELETE" }),

  // ===== Dashboard =====
  dashboardResumo: () => request<{
    visitantes_hoje: number; visitantes_mes: number; visitantes_ativos: number;
    chaves_retiradas: number; chaves_pendentes_dia: number;
    materiais_dia: number; viaturas_em_uso: number;
    ultimas_operacoes: Array<{ id: number; timestamp: string; modulo: string; acao: string; nome: string | null; nip: string | null; descricao: string | null }>;
    ultimos_biometricos: Array<{ id: number; timestamp: string; modulo: string; acao: string; nome: string | null; nip: string | null; descricao: string | null }>;
  }>("/dashboard/resumo"),

  // ===== Auditoria =====
  listAuditoria: (params: { modulo?: string; usuario?: string; nip?: string; dataIni?: string; dataFim?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") q.set(k, String(v)); });
    const s = q.toString();
    return request<Array<{ id: number; timestamp: string; modulo: string; acao: string; nip: string | null; nome: string | null; descricao: string | null; usuario: string | null; perfil: string | null; ip: string | null; estacao: string | null; user_agent: string | null }>>(
      `/operacao/auditoria${s ? `?${s}` : ""}`);
  },

  // ===== Cadastramento de Pessoas =====
  listPessoas: (params: { q?: string; tipo?: PessoaTipo | "" } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.tipo) qs.set("tipo", params.tipo);
    const s = qs.toString();
    return request<ApiPessoa[]>(`/pessoas${s ? `?${s}` : ""}`);
  },
  createPessoa: (body: PessoaInput) =>
    request<{ ok: true; id: number; pessoa: ApiPessoa }>("/pessoas", { method: "POST", body: JSON.stringify(body) }),
  updatePessoa: (id: number, body: PessoaInput) =>
    request<{ ok: true; pessoa: ApiPessoa }>(`/pessoas/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePessoa: (id: number) => request<{ ok: true }>(`/pessoas/${id}`, { method: "DELETE" }),

  // ===== Gerenciamento de autorizações das chaves (Administração) =====
  listChaveAutorizacoes: () => request<ApiChaveMatriz[]>("/chaves-autorizacoes"),
  addChaveAutorizacao: (body: { chave_numero: number; pessoa_id?: number; nip?: string; nome_ref?: string; condicional?: boolean }) =>
    request<{ ok: true }>("/chaves-autorizacoes", { method: "POST", body: JSON.stringify(body) }),
  removeChaveAutorizacao: (id: number) =>
    request<{ ok: true }>(`/chaves-autorizacoes/${id}`, { method: "DELETE" }),

  // ===== Entrada de visitante SEM biometria =====
  entradaManualVisitante: (body: { pessoa_id: number; local_destino: string; cabo?: string | null }) =>
    request<{ ok: true; id: number; nome: string; nip: string; descricao: string }>(
      "/visitantes/entrada-manual", { method: "POST", body: JSON.stringify(body) }),


  // ===== Configuração da própria chave (número, nome/local, categoria) =====
  updateChaveConfig: (
    numeroAtual: number,
    body: { numero: number; nome: string; categoria: "secreta" | "geral" },
  ) =>
    request<{ ok: true }>(`/chaves-config/${numeroAtual}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  // ===== Relatórios sob demanda =====
  gerarRelatorioHoje: () =>
    request<{ ok: true; pdfPath: string; xlsxPath: string; dir: string; dateStr: string }>(
      "/relatorios/gerar", { method: "POST" }),
  gerarRelatorioData: (data: string) =>
    request<{ ok: true; pdfPath: string; xlsxPath: string; dir: string; dateStr: string }>(
      `/relatorios/gerar/${data}`, { method: "POST" }),

  // ===== Backups (somente leitura) =====
  listBackups: () => request<ApiBackupsResponse>("/backups"),
  diagnosticoBackups: () =>
    request<{ destinos: ApiBackupDestino[] }>("/backups/diagnostico"),
  executarBackupAgora: () =>
    request<{ ok: boolean; destinos: ApiBackupDestino[]; dateStr: string }>(
      "/backups/executar", { method: "POST" }),

  fetchBackupBlob: async (caminho: string, inline = false): Promise<Blob> => {
    const token = getAuthToken();
    const qs = new URLSearchParams({ path: caminho });
    if (inline) qs.set("inline", "1");
    const res = await fetch(`${API_BASE}/api/backups/arquivo?${qs.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 401) {
      setAuthToken(null);
      if (onUnauthorized) onUnauthorized();
      throw new Error("Sessão expirada. Faça login novamente.");
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { msg = (await res.json())?.error || msg; } catch { /* binário */ }
      throw new Error(msg);
    }
    return res.blob();
  },
};

export interface ApiBackupArquivo {
  nome: string;
  categoria: string;
  origem: "local" | "rede";
  origem_label: string;
  caminho: string;
  tamanho: number;
  modificado_em: string;
  extensao: string;
  tipo: string;
}
export interface ApiBackupsResponse {
  bases: { key: string; label: string; caminho: string }[];
  categorias: string[];
  arquivos: ApiBackupArquivo[];
}



export interface ApiChaveAutorizacao {
  id: number;
  chave_numero: number;
  nip: string | null;
  nome_ref: string;
  condicional: 0 | 1;
}
export interface ApiChaveMatriz {
  numero: number;
  nome: string;
  categoria: "secreta" | "geral";
  departamento: string;
  regra: string;
  regra_label: string;
  autorizados: ApiChaveAutorizacao[];
}

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
