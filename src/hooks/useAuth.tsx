import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { api, setAuthToken, getAuthToken, setUnauthorizedHandler } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export type UserRole = "admin" | "segyorg" | "tolda" | "operador" | "consulta" | "informatica";

interface SessionUser {
  id: number;
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  can: (route: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true,
  signIn: async () => ({ error: null }), signOut: async () => {},
  isAdmin: false, can: () => false,
});

// Permissões por rota do frontend
const ADMIN_ROUTES = ["chaves", "viaturas", "visitantes", "material", "pdv", "dashboard", "escala", "usuarios", "pessoas", "relatorios", "auditoria", "chaves-autorizacoes"];
const ROLE_ACCESS: Record<UserRole, string[]> = {
  admin:       ADMIN_ROUTES,
  segyorg:     ADMIN_ROUTES,
  informatica: ADMIN_ROUTES,
  tolda:       ["dashboard", "chaves", "viaturas", "visitantes", "material", "pdv"],
  operador:    ["chaves", "viaturas", "visitantes", "material", "dashboard"],
  consulta:    ["chaves", "viaturas", "visitantes", "material", "dashboard"],
};


export function canAccess(role: UserRole | undefined, route: string): boolean {
  if (!role) return false;
  return ROLE_ACCESS[role]?.includes(route) ?? false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivity = useRef<number>(Date.now());

  const doSignOut = useCallback(async () => {
    try { await api.logoutServer(); } catch {}
    setAuthToken(null);
    setUser(null);
  }, []);

  // Handler global de 401
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Verifica sessão inicial
  useEffect(() => {
    const token = getAuthToken();
    if (!token) { setLoading(false); return; }
    api.me()
      .then(({ user }) => setUser(user as SessionUser))
      .catch(() => setAuthToken(null))
      .finally(() => setLoading(false));
  }, []);

  // Atividade do usuário (mousemove/keydown)
  useEffect(() => {
    const onAct = () => { lastActivity.current = Date.now(); };
    window.addEventListener("mousemove", onAct);
    window.addEventListener("keydown", onAct);
    return () => {
      window.removeEventListener("mousemove", onAct);
      window.removeEventListener("keydown", onAct);
    };
  }, []);

  // Auto-refresh enquanto houver atividade (a cada 30 min)
  useEffect(() => {
    if (!user) return;
    const t = setInterval(async () => {
      const idle = Date.now() - lastActivity.current;
      if (idle < 30 * 60_000) {
        try {
          const { token } = await api.refreshSession();
          setAuthToken(token);
        } catch {}
      }
    }, 30 * 60_000);
    return () => clearInterval(t);
  }, [user]);

  const signIn = async (username: string, password: string) => {
    try {
      const { token, user } = await api.login({ username, password });
      setAuthToken(token);
      setUser(user as SessionUser);
      return { error: null };
    } catch (e: any) {
      return { error: new Error(e?.message || "Erro ao autenticar") };
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "informatica";
  const can = (route: string) => canAccess(user?.role as UserRole | undefined, route);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut: doSignOut, isAdmin, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
