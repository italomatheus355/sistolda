import { useMemo, useState } from "react";
import { Users2, Pencil, Trash2, Search, Plus, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiPessoa, PessoaInput, PessoaTipo, SYNC_OPTIONS } from "@/lib/api";

const TIPO_LABEL: Record<PessoaTipo, string> = {
  marinha: "Militar da Marinha",
  exercito: "Militar do Exército (EB)",
  civil: "Civil",
};

const TIPO_BADGE: Record<PessoaTipo, string> = {
  marinha: "bg-primary/15 text-primary border-primary/30",
  exercito: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  civil: "bg-muted text-muted-foreground border-border",
};

const GRADUACOES: Record<PessoaTipo, string[]> = {
  marinha: ["MN", "CB", "3°SG", "2°SG", "1°SG", "SO"],
  exercito: ["SD", "CB", "3°SG", "2°SG", "1°SG", "ST"],
  civil: [],
};

const emptyForm: PessoaInput & { id?: number } = {
  nome: "",
  tipo: "marinha",
  identificador: "",
  cpf: "",
  rg: "",
  telefone: "",
  posto_graduacao: "",
};

function onlyDigits(v: string) { return (v || "").replace(/\D/g, ""); }
function formatCpf(c: string | null) {
  const n = onlyDigits(c || "");
  if (n.length !== 11) return c || "—";
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`;
}
function formatDate(d: string) {
  try { return new Date(d.replace(" ", "T") + "Z").toLocaleDateString("pt-BR"); }
  catch { return d; }
}

export default function Pessoas() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<PessoaTipo | "all">("all");
  const [editing, setEditing] = useState<(PessoaInput & { id?: number }) | null>(null);
  const [confirmDel, setConfirmDel] = useState<ApiPessoa | null>(null);

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: pessoas = [], isLoading } = useQuery({
    queryKey: ["pessoas-admin"],
    queryFn: () => api.listPessoas(),
    ...SYNC_OPTIONS,
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return pessoas.filter((p) => {
      if (tipo !== "all" && p.tipo !== tipo) return false;
      if (!term) return true;
      return (
        p.nome.toLowerCase().includes(term) ||
        (p.identificador || "").toLowerCase().includes(term) ||
        (p.cpf || "").toLowerCase().includes(term)
      );
    });
  }, [pessoas, q, tipo]);

  const saveMutation = useMutation({
    mutationFn: async (data: PessoaInput & { id?: number }) => {
      const body: PessoaInput = {
        nome: data.nome,
        tipo: data.tipo,
        identificador: data.identificador || undefined,
        cpf: data.cpf || null,
        rg: data.rg || null,
        telefone: data.telefone || null,
        posto_graduacao: data.posto_graduacao || null,
      };
      if (data.id) return api.updatePessoa(data.id, body);
      return api.createPessoa(body);
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["pessoas-admin"] });
      qc.invalidateQueries({ queryKey: ["pessoas"] });
      toast({ title: vars.id ? "Cadastro atualizado" : "Pessoa cadastrada" });
      setEditing(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const delMutation = useMutation({
    mutationFn: (id: number) => api.deletePessoa(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pessoas-admin"] });
      qc.invalidateQueries({ queryKey: ["pessoas"] });
      toast({ title: "Cadastro removido" });
      setConfirmDel(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const counts = useMemo(() => ({
    total: pessoas.length,
    marinha: pessoas.filter((p) => p.tipo === "marinha").length,
    exercito: pessoas.filter((p) => p.tipo === "exercito").length,
    civil: pessoas.filter((p) => p.tipo === "civil").length,
  }), [pessoas]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Users2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">GERENCIAMENTO DE PESSOAS</h1>
            <p className="text-xs font-mono text-muted-foreground">
              Administração de cadastros (NIP, dados pessoais e categoria)
            </p>
          </div>
        </div>
        <Button onClick={() => setEditing({ ...emptyForm })} className="gap-2">
          <Plus className="w-4 h-4" /> Novo cadastro
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Marinha" value={counts.marinha} />
        <StatCard label="Exército" value={counts.exercito} />
        <StatCard label="Civis" value={counts.civil} />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, NIP ou CPF…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tipo} onValueChange={(v) => setTipo(v as PessoaTipo | "all")}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value="marinha">Militar da Marinha</SelectItem>
            <SelectItem value="exercito">Militar do Exército</SelectItem>
            <SelectItem value="civil">Civil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border bg-card/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
            )}
            {filtered.map((p) => {
              const sufixo = p.tipo === "exercito" ? " (EB)" : p.tipo === "civil" ? " (Civil)" : "";
              const nomeCompleto = p.posto_graduacao
                ? `${p.posto_graduacao} ${p.nome}${sufixo}`
                : `${p.nome}${sufixo}`;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{nomeCompleto}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-mono text-[10px] ${TIPO_BADGE[p.tipo]}`}>
                      {TIPO_LABEL[p.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{p.identificador}</TableCell>
                  <TableCell className="font-mono">{formatCpf(p.cpf)}</TableCell>
                  <TableCell className="font-mono">{p.telefone || "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing({
                      id: p.id,
                      nome: p.nome,
                      tipo: p.tipo,
                      identificador: p.identificador,
                      cpf: p.cpf || "",
                      rg: p.rg || "",
                      telefone: p.telefone || "",
                      posto_graduacao: p.posto_graduacao || "",
                    })}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDel(p)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar cadastro" : "Novo cadastro"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Nome completo *</Label>
                <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select value={editing.tipo} onValueChange={(v) => setEditing({ ...editing, tipo: v as PessoaTipo, posto_graduacao: v === "civil" ? "" : editing.posto_graduacao })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marinha">Militar da Marinha</SelectItem>
                    <SelectItem value="exercito">Militar do Exército</SelectItem>
                    <SelectItem value="civil">Civil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Graduação / Posto</Label>
                <Select
                  value={editing.posto_graduacao || "__none__"}
                  onValueChange={(v) => setEditing({ ...editing, posto_graduacao: v === "__none__" ? "" : v })}
                  disabled={editing.tipo === "civil"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={editing.tipo === "civil" ? "N/A" : "Selecione a graduação"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sem graduação —</SelectItem>
                    {GRADUACOES[editing.tipo].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>NIP / Identificador *</Label>
                <Input
                  value={editing.identificador || ""}
                  onChange={(e) => setEditing({ ...editing, identificador: onlyDigits(e.target.value) })}
                  className="font-mono"
                  placeholder="8 dígitos"
                  maxLength={10}
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  value={editing.cpf || ""}
                  onChange={(e) => setEditing({ ...editing, cpf: onlyDigits(e.target.value) })}
                  className="font-mono"
                  maxLength={11}
                />
              </div>
              <div>
                <Label>RG</Label>
                <Input value={editing.rg || ""} onChange={(e) => setEditing({ ...editing, rg: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Telefone</Label>
                <Input value={editing.telefone || ""} onChange={(e) => setEditing({ ...editing, telefone: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
            <Button
              onClick={() => editing && saveMutation.mutate(editing)}
              disabled={!editing?.nome?.trim() || saveMutation.isPending}
            >
              {editing?.id ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remover <span className="font-semibold text-foreground">{confirmDel?.nome}</span> (NIP {confirmDel?.identificador})?
            O histórico operacional já registrado será preservado.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDel(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDel && delMutation.mutate(confirmDel.id)} disabled={delMutation.isPending}>
              Excluir cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
