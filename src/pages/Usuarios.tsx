import { useState } from "react";
import { Users, Plus, Shield, User, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDb, UserAccount, UserRole, uid } from "@/lib/localDb";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const roleLabel: Record<UserRole, string> = {
  admin: "Administrador",
  operacoes: "Operações",
  segorg: "SegOrg",
  servico: "Serviço",
};

const Usuarios = () => {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ username: string; password: string; role: UserRole }>({
    username: "", password: "", role: "servico",
  });

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => localDb.list<UserAccount>("users").sort((a, b) => a.username.localeCompare(b.username)),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const exists = localDb.list<UserAccount>("users").some(
        (u) => u.username.toLowerCase() === form.username.toLowerCase().trim()
      );
      if (exists) throw new Error("Usuário já cadastrado.");
      if (!form.username.trim()) throw new Error("Informe um usuário.");
      if (form.password.length < 4) throw new Error("Senha deve ter no mínimo 4 caracteres.");
      localDb.insert<UserAccount>("users", {
        id: uid(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário Criado", description: `${form.username} cadastrado.` });
      setForm({ username: "", password: "", role: "servico" });
      setShowForm(false);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => localDb.remove("users", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário removido" });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Usuários
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
              <TableHead className="text-xs font-mono">USUÁRIO</TableHead>
              <TableHead className="text-xs font-mono">PERFIL</TableHead>
              <TableHead className="text-xs font-mono">CADASTRADO</TableHead>
              <TableHead className="text-xs font-mono w-20">AÇÕES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id} className="hover:bg-secondary/30">
                <TableCell className="text-sm font-mono font-medium">{u.username}</TableCell>
                <TableCell>
                  <Badge className={u.role === "admin" ? "bg-primary/20 text-primary border-0" : "bg-secondary text-muted-foreground border-0"}>
                    {u.role === "admin" ? <><Shield className="w-3 h-3 mr-1" />{roleLabel[u.role]}</> : <><User className="w-3 h-3 mr-1" />{roleLabel[u.role]}</>}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  {u.id !== user?.id && (
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(u.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Cadastrar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">USUÁRIO *</label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ex: cabo01" className="bg-secondary border-border" autoFocus />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">SENHA *</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 4 caracteres" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">PERFIL *</label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador — acesso total</SelectItem>
                  <SelectItem value="operacoes">Operações — apenas PDV</SelectItem>
                  <SelectItem value="segorg">SegOrg — chaves e históricos</SelectItem>
                  <SelectItem value="servico">Serviço — portaria operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createMutation.mutate()} className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
