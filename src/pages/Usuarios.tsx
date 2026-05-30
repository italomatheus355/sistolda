import { useState } from "react";
import { Users, Plus, Shield, User, Trash2, Lock, Unlock, KeyRound } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  consulta: "Consulta",
  informatica: "Informática",
};

const Usuarios = () => {
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [resetting, setResetting] = useState<{ id: number; username: string } | null>(null);
  const [newPass, setNewPass] = useState("");
  const [form, setForm] = useState({ username: "", password: "", role: "operador" });

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-admin"],
    queryFn: api.listUsers,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createUser(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-admin"] });
      toast({ title: "Usuário criado", description: `${form.username} cadastrado.` });
      setForm({ username: "", password: "", role: "operador" });
      setShowForm(false);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleBlock = useMutation({
    mutationFn: ({ id, bloqueado }: { id: number; bloqueado: boolean }) =>
      api.updateUser(id, { bloqueado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-admin"] }),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => api.updateUser(id, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-admin"] }),
  });

  const removeUser = useMutation({
    mutationFn: (id: number) => api.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-admin"] });
      toast({ title: "Usuário removido" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const resetPw = useMutation({
    mutationFn: () => api.resetUserPassword(resetting!.id, newPass),
    onSuccess: () => {
      toast({ title: "Senha redefinida", description: `Nova senha definida para ${resetting?.username}.` });
      setResetting(null); setNewPass("");
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
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
              <TableHead className="text-xs font-mono">ÚLTIMO ACESSO</TableHead>
              <TableHead className="text-xs font-mono">STATUS</TableHead>
              <TableHead className="text-xs font-mono w-40">AÇÕES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id} className="hover:bg-secondary/30">
                <TableCell className="text-sm font-mono font-medium">{u.username}</TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(v) => changeRole.mutate({ id: u.id, role: v })}>
                    <SelectTrigger className="h-8 w-36 bg-secondary border-border text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabel).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleString("pt-BR") : "—"}
                </TableCell>
                <TableCell>
                  <Badge className={u.bloqueado ? "bg-status-borrowed/20 text-status-borrowed border-0" : "bg-status-available/20 text-status-available border-0"}>
                    {u.bloqueado ? "Bloqueado" : "Ativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      title={u.bloqueado ? "Desbloquear" : "Bloquear"}
                      onClick={() => toggleBlock.mutate({ id: u.id, bloqueado: !u.bloqueado })}>
                      {u.bloqueado ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      title="Redefinir senha"
                      onClick={() => setResetting({ id: u.id, username: u.username })}>
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    {u.id !== user?.id && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Remover" onClick={() => removeUser.mutate(u.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Criar usuário */}
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
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador — acesso total</SelectItem>
                  <SelectItem value="operador">Operador — chaves, viaturas, visitantes, materiais</SelectItem>
                  <SelectItem value="consulta">Consulta — somente leitura</SelectItem>
                  <SelectItem value="informatica">Informática — administração e auditoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => createMutation.mutate()} className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset senha */}
      <Dialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Redefinir senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">Definindo nova senha para <span className="font-mono text-foreground">{resetting?.username}</span></p>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Nova senha (mín. 4)" className="bg-secondary border-border" autoFocus />
            <Button className="w-full" onClick={() => resetPw.mutate()} disabled={resetPw.isPending || newPass.length < 4}>
              {resetPw.isPending ? "Aplicando..." : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
