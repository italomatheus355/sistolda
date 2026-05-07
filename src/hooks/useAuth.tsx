import { createContext, useContext, useEffect, useState } from "react";
import { localDb, UserAccount, UserRole, canAccess } from "@/lib/localDb";

interface SessionUser {
  id: string;
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
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  isAdmin: false,
  can: () => false,
});

const SESSION_KEY = "sistolda:session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localDb.list<UserAccount>("users");
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    const users = localDb.list<UserAccount>("users");
    const found = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
    );
    if (!found) return { error: new Error("Credenciais inválidas") };
    const sess: SessionUser = { id: found.id, username: found.username, role: found.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    setUser(sess);
    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const isAdmin = user?.role === "admin";
  const can = (route: string) => canAccess(user?.role, route);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAdmin, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
