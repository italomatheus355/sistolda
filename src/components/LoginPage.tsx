import { useState } from "react";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Erro", description: "Preencha e-mail e senha.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Acesso Negado", description: "Credenciais inválidas.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-wide">CLAVICULÁRIO</h1>
          <p className="text-xs font-mono text-muted-foreground tracking-widest mt-1">SISTEMA DE CONTROLE DE PORTARIA</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground mb-5 text-center tracking-widest">IDENTIFICAÇÃO DO OPERADOR</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">E-MAIL</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                className="bg-secondary border-border"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">SENHA</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary border-border pr-10"
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

        <div className="text-center text-[10px] text-muted-foreground mt-4 font-mono space-y-1">
          <p>Acesso restrito — contate o administrador</p>
          <p className="opacity-60">Demo: admin@portaria.mil / Admin@2026</p>
        </div>
      </div>
    </div>
  );
}
