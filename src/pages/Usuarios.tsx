import { useState } from "react";
import { Users, Plus, Shield, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDb, UserAccount, uid } from "@/lib/localDb";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Usuarios = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nome: "", posto_grad: "", matricula: "", role: "cabo_auxiliar" as "cabo_auxiliar" | "administrador" });

  if (!isAdmin) return <Navigate to="/chaves" replace />;

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => localDb.list<UserAccount>("users").sort((a, b) => a.nome.localeCompare(b.nome)),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const exists = localDb.list<UserAccount>("users").some((u) => u.email.toLowerCase() === form.email.toLowerCase());
      if (exists) throw new Error("E-mail já cadastrado.");
      if (form.password.length < 6) throw new Error("Senha deve ter no mínimo 6 caracteres.");
      localDb.insert<UserAccount>("users", {
        id: uid(),
        email: form.email,
        password: form.password,
        nome: form.nome,
        posto_grad: form.posto_grad || null,
        matricula: form.matricula || null,
        role: form.role,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário Criado", description: `${form.nome} cadastrado com sucesso.` });
      setForm({ email: "", password: "", nome: "", posto_grad: "", matricula: "", role: "cabo_auxiliar" });
      setShowForm(false);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Usuários
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento de operadores do sistema</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs font-mono">NOME</TableHead>
              <TableHead className="text-xs font-mono">POSTO/GRAD</TableHead>
              <TableHead className="text-xs font-mono">MATRÍCULA</TableHead>
              <TableHead className="text-xs font-mono">E-MAIL</TableHead>
              <TableHead className="text-xs font-mono">PERFIL</TableHead>
              <TableHead className="text-xs font-mono">CADASTRADO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : profiles.map((p) => (
              <TableRow key={p.id} className="hover:bg-secondary/30">
                <TableCell className="text-sm font-medium">{p.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.posto_grad || "—"}</TableCell>
                <TableCell className="text-xs font-mono">{p.matricula || "—"}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{p.email}</TableCell>
                <TableCell>
                  <Badge className={p.role === "administrador" ? "bg-primary/20 text-primary border-0" : "bg-secondary text-muted-foreground border-0"}>
                    {p.role === "administrador" ? <><Shield className="w-3 h-3 mr-1" />Admin</> : <><User className="w-3 h-3 mr-1" />Cabo Aux.</>}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Cadastrar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NOME COMPLETO *</label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do militar" className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">POSTO/GRAD</label>
                <Input value={form.posto_grad} onChange={(e) => setForm({ ...form, posto_grad: e.target.value })} placeholder="Ex: Sgt, Cb, Sd" className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">MATRÍCULA</label>
                <Input value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} placeholder="Ex: 12345" className="bg-secondary border-border" />
              </div>
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">E-MAIL *</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">SENHA *</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">PERFIL</label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "cabo_auxiliar" | "administrador" })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cabo_auxiliar">Cabo Auxiliar</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createMutation.mutate()} className="w-full" disabled={createMutation.isPending || !form.nome || !form.email || !form.password}>
              {createMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
