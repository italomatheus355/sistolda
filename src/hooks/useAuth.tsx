import { createContext, useContext, useEffect, useState } from "react";
import { localDb, UserAccount } from "@/lib/localDb";

interface SessionUser {
  id: string;
  email: string;
  nome: string;
  posto_grad: string | null;
  matricula: string | null;
  role: "administrador" | "cabo_auxiliar";
}

interface AuthContextType {
  user: SessionUser | null;
  profile: SessionUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  isAdmin: false,
});

const SESSION_KEY = "claviculario:session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Garante que a tabela de users seja semeada
    localDb.list<UserAccount>("users");
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const users = localDb.list<UserAccount>("users");
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return { error: new Error("Credenciais inválidas") };
    const sess: SessionUser = {
      id: found.id, email: found.email, nome: found.nome,
      posto_grad: found.posto_grad, matricula: found.matricula, role: found.role,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    setUser(sess);
    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const isAdmin = user?.role === "administrador";

  return (
    <AuthContext.Provider value={{ user, profile: user, loading, signIn, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
