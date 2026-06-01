// SISTOLDA — Módulo de Visitantes (versão simplificada).
// Fluxo: Registrar Entrada (biometria), Registrar Saída (lista), Cadastro de Pessoas, Histórico.
import { useMemo, useState } from "react";
import { Users, Plus, LogOut, History, UserPlus, Pencil, Trash2, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api, ApiVisitante, ApiPessoa, PessoaInput, PessoaTipo, SYNC_OPTIONS,
} from "@/lib/api";
import { getCaboOnDuty } from "@/lib/localDb";
import { showAuthConfirm } from "@/components/AuthConfirm";
import { BiometricCapture } from "@/components/BiometricCapture";
import { OperationalDateBanner } from "@/components/OperationalDateBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

const TIPO_LABEL: Record<PessoaTipo, string> = {
  marinha: "Militar da Marinha",
  exercito: "Militar Externo",
  civil: "Civil",
};
const TIPO_BADGE: Record<PessoaTipo, "default" | "secondary" | "outline"> = {
  marinha: "default", exercito: "secondary", civil: "outline",
};

// "000" + últimos 4 dígitos do CPF (7 dígitos)
function nipFromCpf(cpf: string) {
  const c = onlyDigits(cpf);
  if (c.length < 4) return "";
  return "000" + c.slice(-4);
}

const EMPTY_FORM: PessoaInput & { identificador: string } = {
  nome: "", tipo: "marinha", identificador: "", cpf: "", rg: "", telefone: "",
};

export default function Visitantes() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();

  // === Diálogos ===
  const [showEntrada, setShowEntrada] = useState(false);
  const [showCadastro, setShowCadastro] = useState(false);
  const [destino, setDestino] = useState("");

  // === Cadastro de Pessoas ===
  const [pesQuery, setPesQuery] = useState("");
  const [editing, setEditing] = useState<ApiPessoa | null>(null);
  const [form, setForm] = useState<PessoaInput & { identificador: string }>(EMPTY_FORM);
  const [confirmDel, setConfirmDel] = useState<ApiPessoa | null>(null);

  // === Histórico filtro ===
  const [filtroData, setFiltroData] = useState("");

  const { data: visitantes = [], isLoading } = useQuery({
    queryKey: ["visitantes"], queryFn: api.listVisitantes, ...SYNC_OPTIONS,
  });
  const { data: pessoas = [] } = useQuery({
    queryKey: ["pessoas"], queryFn: api.listPessoas, ...SYNC_OPTIONS,
  });

  // === Mutations ===
  const entradaMutation = useMutation({
    mutationFn: async (nip: string) => {
      if (!destino.trim()) throw new Error("Informe o destino antes de capturar a biometria.");
      return api.autenticarBiometria({
        nip, modulo: "visitantes", acao: "entrada",
        cabo: getCaboOnDuty(),
        payload: { local_destino: destino.trim() },
      });
    },
    onSuccess: (resp) => {
      qc.invalidateQueries({ queryKey: ["visitantes"] });
      showAuthConfirm({ nome: resp.nome, nip: resp.nip, descricao: resp.descricao, modulo: "visitantes" });
      setShowEntrada(false); setDestino("");
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const saidaMutation = useMutation({
    mutationFn: (v: ApiVisitante) => api.saidaVisitante(v.id).then(() => v),
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["visitantes"] });
      showAuthConfirm({ nome: v.nome, nip: v.documento, descricao: `${v.nome} registrou saída do quartel.`, modulo: "visitantes" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Pessoa create/update
  const savePessoa = useMutation({
    mutationFn: () => {
      const payload: PessoaInput = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        identificador: form.identificador || undefined,
        cpf: form.cpf || null,
        rg: form.rg || null,
        telefone: form.telefone || null,
      };
      return editing ? api.updatePessoa(editing.id, payload) : api.createPessoa(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pessoas"] });
      toast({ title: editing ? "Pessoa atualizada" : "Pessoa cadastrada" });
      setForm(EMPTY_FORM); setEditing(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removePessoa = useMutation({
    mutationFn: (id: number) => api.deletePessoa(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pessoas"] });
      toast({ title: "Pessoa excluída" });
      setConfirmDel(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  function openEditPessoa(p: ApiPessoa) {
    setEditing(p);
    setForm({
      nome: p.nome, tipo: p.tipo, identificador: p.identificador,
      cpf: p.cpf || "", rg: p.rg || "", telefone: p.telefone || "",
    });
  }

  function handleFormChange(next: Partial<PessoaInput & { identificador: string }>) {
    setForm((prev) => {
      const merged = { ...prev, ...next };
      // Auto-gerar NIP para externo/civil a partir do CPF, caso o usuário não tenha digitado manualmente.
      if (merged.tipo !== "marinha") {
        if (merged.cpf && (!merged.identificador || merged.identificador === nipFromCpf(prev.cpf || ""))) {
          merged.identificador = nipFromCpf(merged.cpf);
        }
      }
      return merged;
    });
  }

  function submitPessoa(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    if (form.tipo === "marinha" && !/^\d{4,10}$/.test(form.identificador || "")) {
      toast({ title: "NIP inválido", description: "Para Militar da Marinha, informe o NIP real.", variant: "destructive" });
      return;
    }
    if (form.tipo !== "marinha" && !/^\d{11}$/.test(onlyDigits(form.cpf || ""))) {
      toast({ title: "CPF inválido", description: "Informe os 11 dígitos do CPF.", variant: "destructive" });
      return;
    }
    savePessoa.mutate();
  }

  // === Dados derivados ===
  const presentes = visitantes.filter((v) => !v.hora_saida);
  const historico = filtroData ? visitantes.filter((v) => v.hora_entrada.startsWith(filtroData)) : visitantes;
  const pessoasFiltradas = useMemo(() => {
    const q = pesQuery.trim().toLowerCase();
    if (!q) return pessoas;
    return pessoas.filter((p) =>
      p.nome.toLowerCase().includes(q) ||
      p.identificador.includes(q) ||
      (p.cpf || "").includes(q) ||
      TIPO_LABEL[p.tipo].toLowerCase().includes(q),
    );
  }, [pessoas, pesQuery]);

  return (
    <div>
      <OperationalDateBanner />

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Visitantes
            {presentes.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-status-borrowed text-white text-xs font-mono font-bold">
                {presentes.length}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pessoas.length} pessoas cadastradas · entrada por biometria (NIP)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { setForm(EMPTY_FORM); setEditing(null); setShowCadastro(true); }} className="gap-2">
            <UserPlus className="w-4 h-4" /> Cadastro de Pessoas
          </Button>
          <Button onClick={() => { setDestino(""); setShowEntrada(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Registrar Entrada
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ativos">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="ativos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            No Quartel
          </TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-3.5 h-3.5 mr-1.5" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ativos">
          <VisitantesTable
            rows={presentes} isLoading={isLoading}
            onSaida={(v) => saidaMutation.mutate(v)}
            saidaPending={saidaMutation.isPending}
            showSaidaBtn
          />
        </TabsContent>

        <TabsContent value="historico">
          <div className="flex items-center gap-3 mb-4">
            <label className="text-xs font-mono text-muted-foreground">FILTRAR POR DATA</label>
            <Input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="bg-secondary border-border w-44" />
            {filtroData && <Button size="sm" variant="outline" onClick={() => setFiltroData("")}>Limpar</Button>}
          </div>
          <VisitantesTable rows={historico} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      {/* ============ Registrar Entrada ============ */}
      <Dialog open={showEntrada} onOpenChange={(v) => { setShowEntrada(v); if (!v) setDestino(""); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Registrar Entrada</DialogTitle>
            <DialogDescription>Informe o destino e posicione o dedo no leitor biométrico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-mono text-muted-foreground mb-1.5 block">DESTINO *</Label>
              <Input
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Local de destino dentro do quartel"
                className="bg-secondary border-border"
                autoFocus
              />
            </div>
            <BiometricCapture
              onCapture={(nip) => entradaMutation.mutate(nip)}
              disabled={entradaMutation.isPending || !destino.trim()}
              label={entradaMutation.isPending ? "PROCESSANDO..." : "AGUARDANDO BIOMETRIA"}
              hint={destino.trim()
                ? "Posicione o dedo no leitor — o NIP será capturado automaticamente."
                : "Preencha o destino antes de capturar a biometria."}
              autoRefocus={!!destino.trim()}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Cadastro de Pessoas ============ */}
      <Dialog open={showCadastro} onOpenChange={(v) => { setShowCadastro(v); if (!v) { setForm(EMPTY_FORM); setEditing(null); } }}>
        <DialogContent className="bg-card border-border max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Cadastro de Pessoas
            </DialogTitle>
            <DialogDescription>
              Marinha, Exército e Civil. Para militares externos e civis, o NIP é gerado automaticamente como
              <span className="font-mono"> 000 + 4 últimos dígitos do CPF</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-5 mt-2">
            {/* Formulário */}
            <form onSubmit={submitPessoa} className="space-y-3">
              <div>
                <Label className="text-xs font-mono text-muted-foreground">NOME *</Label>
                <Input value={form.nome} onChange={(e) => handleFormChange({ nome: e.target.value })} className="bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs font-mono text-muted-foreground">CATEGORIA *</Label>
                <Select value={form.tipo} onValueChange={(t) => handleFormChange({ tipo: t as PessoaTipo, identificador: t === "marinha" ? form.identificador : nipFromCpf(form.cpf || "") })}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marinha">Militar da Marinha</SelectItem>
                    <SelectItem value="exercito">Militar Externo</SelectItem>
                    <SelectItem value="civil">Civil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">CPF</Label>
                  <Input
                    value={form.cpf || ""}
                    onChange={(e) => handleFormChange({ cpf: onlyDigits(e.target.value).slice(0, 11) })}
                    placeholder="00000000000"
                    className="bg-secondary border-border font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-mono text-muted-foreground">RG</Label>
                  <Input
                    value={form.rg || ""}
                    onChange={(e) => handleFormChange({ rg: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-mono text-muted-foreground">TELEFONE</Label>
                <Input
                  value={form.telefone || ""}
                  onChange={(e) => handleFormChange({ telefone: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
              <div>
                <Label className="text-xs font-mono text-muted-foreground">
                  NIP {form.tipo === "marinha" ? "(real, obrigatório)" : "(gerado automaticamente)"}
                </Label>
                <Input
                  value={form.identificador}
                  onChange={(e) => handleFormChange({ identificador: onlyDigits(e.target.value).slice(0, 10) })}
                  placeholder={form.tipo === "marinha" ? "NIP" : "000XXXX"}
                  className="bg-secondary border-border font-mono"
                  readOnly={form.tipo !== "marinha"}
                />
                {form.tipo !== "marinha" && (
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">
                    Será gerado automaticamente a partir do CPF.
                  </p>
                )}
              </div>
              <DialogFooter className="!flex !justify-between !items-center pt-3 mt-2 border-t border-border">
                {editing && (
                  <Button type="button" variant="ghost" onClick={() => { setEditing(null); setForm(EMPTY_FORM); }}>
                    Limpar
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button type="submit" disabled={savePessoa.isPending} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    {savePessoa.isPending ? "Salvando..." : editing ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </DialogFooter>
            </form>

            {/* Lista de pessoas */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={pesQuery}
                  onChange={(e) => setPesQuery(e.target.value)}
                  placeholder="Buscar nome, NIP, CPF..."
                  className="pl-8 bg-secondary border-border"
                />
              </div>
              <div className="border border-border rounded-md max-h-[420px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>NIP</TableHead>
                      <TableHead className="w-20 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pessoasFiltradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6 font-mono">
                          NENHUMA PESSOA
                        </TableCell>
                      </TableRow>
                    )}
                    {pessoasFiltradas.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell>
                          <Badge variant={TIPO_BADGE[p.tipo]}>{TIPO_LABEL[p.tipo]}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{p.identificador}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => openEditPessoa(p)} disabled={!isAdmin}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setConfirmDel(p)} disabled={!isAdmin}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {!isAdmin && (
                <p className="text-[10px] font-mono text-muted-foreground">
                  Edição e exclusão restritas ao perfil administrador.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pessoa?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDel?.nome}</strong> (NIP {confirmDel?.identificador}) será removida do sistema.
              Os registros já lançados serão preservados, mas o NIP deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && removePessoa.mutate(confirmDel.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =================== Subcomponente ===================
function VisitantesTable({
  rows, isLoading, onSaida, saidaPending, showSaidaBtn,
}: {
  rows: ApiVisitante[];
  isLoading: boolean;
  onSaida?: (v: ApiVisitante) => void;
  saidaPending?: boolean;
  showSaidaBtn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            <TableHead className="text-xs font-mono">NOME</TableHead>
            <TableHead className="text-xs font-mono">NIP</TableHead>
            <TableHead className="text-xs font-mono">DESTINO</TableHead>
            <TableHead className="text-xs font-mono">ENTRADA</TableHead>
            <TableHead className="text-xs font-mono">SAÍDA</TableHead>
            {showSaidaBtn && <TableHead className="text-xs font-mono w-32">AÇÃO</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow><TableCell colSpan={showSaidaBtn ? 6 : 5} className="text-center text-xs font-mono text-muted-foreground py-6">CARREGANDO...</TableCell></TableRow>
          )}
          {!isLoading && rows.length === 0 && (
            <TableRow><TableCell colSpan={showSaidaBtn ? 6 : 5} className="text-center text-xs font-mono text-muted-foreground py-6">NENHUM REGISTRO</TableCell></TableRow>
          )}
          {rows.map((v) => (
            <TableRow key={v.id} className="hover:bg-secondary/30">
              <TableCell className="font-medium">{v.nome}</TableCell>
              <TableCell className="text-xs font-mono">{v.documento || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{v.local_destino || "—"}</TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">
                {new Date(v.hora_entrada).toLocaleString("pt-BR")}
              </TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">
                {v.hora_saida ? new Date(v.hora_saida).toLocaleString("pt-BR") : "—"}
              </TableCell>
              {showSaidaBtn && (
                <TableCell>
                  {!v.hora_saida && onSaida && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onSaida(v)} disabled={saidaPending}>
                      <LogOut className="w-3.5 h-3.5" /> Saída
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
