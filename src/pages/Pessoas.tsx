// SISTOLDA — Cadastramento de Pessoas (Administração)
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { UserPlus, Pencil, Trash2, Search, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { api, type ApiPessoa, type PessoaTipo } from "@/lib/api";

const TIPO_LABEL: Record<PessoaTipo, string> = {
  marinha: "Militar da Marinha",
  exercito: "Militar do Exército",
  civil: "Civil",
};

const TIPO_VARIANT: Record<PessoaTipo, "default" | "secondary" | "outline"> = {
  marinha: "default",
  exercito: "secondary",
  civil: "outline",
};

const EMPTY = { nome: "", tipo: "marinha" as PessoaTipo, identificador: "" };

export default function Pessoas() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiPessoa | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDel, setConfirmDel] = useState<ApiPessoa | null>(null);

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: pessoas = [], isLoading } = useQuery({
    queryKey: ["pessoas"],
    queryFn: () => api.listPessoas(),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pessoas;
    return pessoas.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.identificador.includes(q) ||
        TIPO_LABEL[p.tipo as PessoaTipo].toLowerCase().includes(q),
    );
  }, [pessoas, search]);

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(p: ApiPessoa) {
    setEditing(p);
    setForm({ nome: p.nome, tipo: p.tipo as PessoaTipo, identificador: p.identificador });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: () =>
      editing ? api.updatePessoa(editing.id, form) : api.createPessoa(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pessoas"] });
      toast({ title: editing ? "Pessoa atualizada" : "Pessoa cadastrada" });
      setOpen(false);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.deletePessoa(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pessoas"] });
      toast({ title: "Pessoa excluída" });
      setConfirmDel(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4,10}$/.test(form.identificador)) {
      toast({ title: "Identificador inválido", description: "Entre 4 e 10 dígitos.", variant: "destructive" });
      return;
    }
    if (!form.nome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    save.mutate();
  }

  const hintByTipo: Record<PessoaTipo, string> = {
    marinha: "NIP real (até 10 dígitos).",
    exercito: "NIP gerado: 000 + 4 últimos do CPF (7 dígitos).",
    civil: "NIP gerado: 000 + 4 últimos do CPF (7 dígitos).",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users2 className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-wide">CADASTRAMENTO DE PESSOAS</h1>
          <p className="text-xs font-mono text-muted-foreground tracking-widest">
            MARINHA · EXÉRCITO · CIVIL
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-sm font-mono tracking-widest text-muted-foreground">
            REGISTROS ({filtered.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome, identificador ou tipo..."
                className="pl-8 w-72"
              />
            </div>
            <Button onClick={openCreate} className="gap-2">
              <UserPlus className="w-4 h-4" /> Cadastrar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Identificador (NIP)</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6 font-mono text-xs">
                    CARREGANDO...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6 font-mono text-xs">
                    NENHUMA PESSOA CADASTRADA
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>
                    <Badge variant={TIPO_VARIANT[p.tipo as PessoaTipo]}>
                      {TIPO_LABEL[p.tipo as PessoaTipo]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{p.identificador}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDel(p)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono tracking-widest text-sm">
              {editing ? "EDITAR PESSOA" : "NOVO CADASTRO"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome completo"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as PessoaTipo })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="marinha">Militar da Marinha</SelectItem>
                  <SelectItem value="exercito">Militar do Exército</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>NIP / Identificador (4 a 10 dígitos)</Label>
              <Input
                value={form.identificador}
                onChange={(e) =>
                  setForm({ ...form, identificador: e.target.value.replace(/\D/g, "").slice(0, 10) })
                }
                placeholder="0000000"
                inputMode="numeric"
                maxLength={10}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">{hintByTipo[form.tipo]}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : editing ? "Atualizar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pessoa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá <strong>{confirmDel?.nome}</strong> (ID {confirmDel?.identificador}) do sistema.
              Operações já registradas não serão afetadas, mas novas autenticações biométricas com esse identificador deixarão de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && remove.mutate(confirmDel.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
