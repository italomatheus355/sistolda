import { useState } from "react";
import { Eye, EyeOff, User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import logoHU41 from "@/assets/logo-hu41.png";

export function LoginPage() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Erro", description: "Preencha usuário e senha.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signIn(username, password);
    if (error) {
      toast({ title: "Acesso Negado", description: "Credenciais inválidas.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={logoHU41} alt="HU-41" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-foreground tracking-wide">SISTOLDA</h1>
          <p className="text-xs font-mono text-muted-foreground tracking-widest mt-1">CENTRO DE PROCESSAMENTO DE DADOS</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <p className="text-[10px] font-mono text-muted-foreground mb-5 text-center tracking-widest">IDENTIFICAÇÃO DO OPERADOR</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">USUÁRIO</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="usuário"
                  className="bg-secondary border-border pl-9"
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">SENHA</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary border-border pl-9 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Autenticando..." : "Entrar"}
            </Button>
          </form>
        </div>

        <div className="text-center text-[10px] text-muted-foreground mt-4 font-mono space-y-0.5">
          <p>Acesso restrito — contate o administrador</p>
          <p className="opacity-60">admin / operacoes / segorg / servico</p>
        </div>
      </div>
    </div>
  );
}
