import { useMemo, useState } from "react";
import { Key, History, Search, Fingerprint, RotateCcw, Filter, CheckSquare, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiChave, SYNC_OPTIONS, nomeDoMilitarPorNip } from "@/lib/api";
import { getCaboOnDuty } from "@/lib/localDb";
import { showOperationConfirm } from "@/components/OperationConfirm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const Chaves = () => {
  const queryClient = useQueryClient();
  const [selectedChave, setSelectedChave] = useState<ApiChave | null>(null);
  const [dialogType, setDialogType] = useState<"retirada" | "devolucao" | "multipla" | null>(null);
  const [nip, setNip] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modo seleção múltipla
  const [multiMode, setMultiMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [multiNip, setMultiNip] = useState("");

  // filtros
  const [fData, setFData] = useState("");
  const [fDataFim, setFDataFim] = useState("");
  const [fMilitar, setFMilitar] = useState("");
  const [fChave, setFChave] = useState("todas");
  const [fStatus, setFStatus] = useState<"todos" | "em_uso" | "devolvida">("todos");

  const { data: chaves = [], isLoading } = useQuery({
    queryKey: ["chaves"],
    queryFn: api.listChaves,
    ...SYNC_OPTIONS,
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["historico_chaves"],
    queryFn: api.historicoChaves,
    ...SYNC_OPTIONS,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["chaves"] });
    queryClient.invalidateQueries({ queryKey: ["historico_chaves"] });
  };

  const retiradaMutation = useMutation({
    mutationFn: async ({ chave, nipVal, cabo }: { chave: ApiChave; nipVal: string; cabo: string }) => {
      const militar = await nomeDoMilitarPorNip(nipVal);
      await api.retiradaChave({ chave_id: chave.id, militar, nip: nipVal, cabo });
      return { militar, chave };
    },
    onSuccess: ({ militar, chave }) => {
      invalidateAll();
      showOperationConfirm({
        nome: militar,
        acao: "retirou a chave",
        detalhe: `Nº ${String(chave.numero).padStart(2, "0")} — ${chave.nome}`,
        variant: "chave",
      });
      setDialogType(null); setSelectedChave(null); setNip("");
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const devolucaoMutation = useMutation({
    mutationFn: async ({ chave, cabo }: { chave: ApiChave; cabo: string }) => {
      await api.devolucaoChave({ chave_id: chave.id, cabo });
      return chave;
    },
    onSuccess: (chave) => {
      const nome = chave.militar_responsavel || "Militar";
      invalidateAll();
      showOperationConfirm({
        nome,
        acao: "devolveu a chave",
        detalhe: `Nº ${String(chave.numero).padStart(2, "0")} — ${chave.nome}`,
        variant: "chave",
      });
      setDialogType(null); setSelectedChave(null);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const retiradaMultiplaMutation = useMutation({
    mutationFn: async ({ ids, nipVal, cabo }: { ids: number[]; nipVal: string; cabo: string }) => {
      const militar = await nomeDoMilitarPorNip(nipVal);
      const selecionadas = chaves.filter((c) => ids.includes(c.id));
      for (const chave of selecionadas) {
        await api.retiradaChave({ chave_id: chave.id, militar, nip: nipVal, cabo });
      }
      return { militar, selecionadas };
    },
    onSuccess: ({ militar, selecionadas }) => {
      invalidateAll();
      const detalhe = selecionadas
        .map((c) => `Nº ${String(c.numero).padStart(2, "0")}`)
        .join(" • ");
      showOperationConfirm({
        nome: militar,
        acao: `retirou ${selecionadas.length} chaves`,
        detalhe,
        variant: "chave",
      });
      setDialogType(null);
      setSelectedIds([]);
      setMultiNip("");
      setMultiMode(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleSelect = (chave: ApiChave) => {
    if (chave.status !== "disponivel") {
      toast({ title: "Indisponível", description: "Essa chave já está emprestada.", variant: "destructive" });
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(chave.id) ? prev.filter((i) => i !== chave.id) : [...prev, chave.id]
    );
  };

  const handleCardClick = (chave: ApiChave) => {
    if (multiMode) {
      toggleSelect(chave);
      return;
    }
    setSelectedChave(chave);
    setDialogType(chave.status === "disponivel" ? "retirada" : "devolucao");
    setNip("");
  };

  const handleRetirada = () => {
    if (!nip.trim()) { toast({ title: "Erro", description: "Informe o NIP do militar.", variant: "destructive" }); return; }
    retiradaMutation.mutate({ chave: selectedChave!, nipVal: nip, cabo: getCaboOnDuty() });
  };

  const handleDevolucao = () => devolucaoMutation.mutate({ chave: selectedChave!, cabo: getCaboOnDuty() });

  const handleRetiradaMultipla = () => {
    if (!multiNip.trim()) { toast({ title: "Erro", description: "Informe o NIP do militar.", variant: "destructive" }); return; }
    if (selectedIds.length === 0) { toast({ title: "Erro", description: "Selecione ao menos uma chave.", variant: "destructive" }); return; }
    retiradaMultiplaMutation.mutate({ ids: selectedIds, nipVal: multiNip, cabo: getCaboOnDuty() });
  };

  const filtered = chaves.filter(
    (c) => c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || String(c.numero).includes(searchTerm)
  );

  const filteredHistorico = useMemo(() => {
    return historico.filter((h) => {
      const d = h.data_retirada.slice(0, 10);
      if (fData && d < fData) return false;
      if (fDataFim && d > fDataFim) return false;
      if (fMilitar && !(h.militar.toLowerCase().includes(fMilitar.toLowerCase()) || (h.nip || "").includes(fMilitar))) return false;
      if (fChave !== "todas" && String(h.chave_id) !== fChave) return false;
      if (fStatus !== "todos" && h.status !== fStatus) return false;
      return true;
    });
  }, [historico, fData, fDataFim, fMilitar, fChave, fStatus]);

  const disponiveisCount = chaves.filter((c) => c.status === "disponivel").length;
  const emprestadas = chaves.filter((c) => c.status === "emprestada").length;
  const selecionadasObj = chaves.filter((c) => selectedIds.includes(c.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" /> Chaves
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de retirada e devolução — {chaves.length} chaves</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="status-dot-available" /> {disponiveisCount} disponíveis</span>
          <span className="flex items-center gap-1.5"><span className="status-dot-borrowed" /> {emprestadas} indisponíveis</span>
        </div>
      </div>

      <Tabs defaultValue="chaves">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="chaves" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Chaves
          </TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-3.5 h-3.5 mr-1.5" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chaves">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar chave ou número..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-secondary border-border" />
            </div>
            <div className="flex items-center gap-2">
              {multiMode ? (
                <>
                  <Badge variant="secondary" className="font-mono">
                    {selectedIds.length} selecionada{selectedIds.length === 1 ? "" : "s"}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => setDialogType("multipla")}
                    disabled={selectedIds.length === 0}
                    className="gap-1.5"
                  >
                    <Fingerprint className="w-4 h-4" /> Confirmar retirada
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setMultiMode(false); setSelectedIds([]); }}
                    className="gap-1.5"
                  >
                    <X className="w-4 h-4" /> Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setMultiMode(true)} className="gap-1.5">
                  <CheckSquare className="w-4 h-4" /> Retirada múltipla
                </Button>
              )}
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                {filtered.length} CHAVES
              </span>
            </div>
          </div>

          {multiMode && (
            <div className="mb-3 p-2.5 rounded-md border border-primary/30 bg-primary/5 text-xs font-mono text-primary">
              MODO SELEÇÃO MÚLTIPLA — toque nas chaves disponíveis para incluir. Apenas UMA biometria liberará todas.
            </div>
          )}

          {isLoading ? (
            <div className="text-center text-muted-foreground py-12 font-mono text-sm">Carregando chaves...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {filtered.map((chave) => {
                const isSecreta = chave.categoria === "secreta";
                const isSelected = selectedIds.includes(chave.id);
                return (
                  <button
                    key={chave.id}
                    onClick={() => handleCardClick(chave)}
                    className={`relative p-3 rounded-lg border transition-all duration-200 text-left hover:scale-[1.02] ${
                      isSelected
                        ? "bg-primary/10 border-primary ring-2 ring-primary/60"
                        : isSecreta
                          ? chave.status === "disponivel"
                            ? "bg-status-borrowed/5 border-status-borrowed/50 hover:border-status-borrowed"
                            : "bg-status-borrowed/10 border-status-borrowed/60"
                          : chave.status === "disponivel"
                            ? "bg-card border-status-available/40 hover:border-status-available card-glow"
                            : "bg-card border-status-borrowed/40 hover:border-status-borrowed"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      {multiMode && chave.status === "disponivel" ? (
                        <span className={`w-3 h-3 rounded-sm border ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/50"}`} />
                      ) : (
                        <span className={chave.status === "disponivel" ? "status-dot-available" : "status-dot-borrowed"} />
                      )}
                      <span className="text-base font-mono font-bold text-foreground/90 leading-none">Nº {String(chave.numero).padStart(2, "0")}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground truncate">{chave.nome}</h3>
                    {isSecreta && (
                      <p className="text-[9px] text-status-borrowed font-mono tracking-widest mt-1">SECRETA</p>
                    )}
                    {chave.militar_responsavel && (
                      <p className="text-[10px] text-status-borrowed mt-2 font-mono truncate">{chave.militar_responsavel}</p>
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8 text-sm">Nenhuma chave encontrada</div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico">
          <div className="rounded-lg border border-border p-3 mb-4 bg-card">
            <div className="flex items-center gap-2 mb-3 text-xs font-mono text-muted-foreground">
              <Filter className="w-3.5 h-3.5" /> FILTROS
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Input type="date" value={fData} onChange={(e) => setFData(e.target.value)} className="bg-secondary border-border" />
              <Input type="date" value={fDataFim} onChange={(e) => setFDataFim(e.target.value)} className="bg-secondary border-border" />
              <Input value={fMilitar} onChange={(e) => setFMilitar(e.target.value)} placeholder="Militar / NIP" className="bg-secondary border-border" />
              <Select value={fChave} onValueChange={setFChave}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Chave" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as chaves</SelectItem>
                  {chaves.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>Nº {String(c.numero).padStart(2, "0")} — {c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={(v) => setFStatus(v as any)}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="em_uso">Em uso</SelectItem>
                  <SelectItem value="devolvida">Devolvida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(fData || fDataFim || fMilitar || fChave !== "todas" || fStatus !== "todos") && (
              <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs" onClick={() => { setFData(""); setFDataFim(""); setFMilitar(""); setFChave("todas"); setFStatus("todos"); }}>
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="text-xs font-mono">CHAVE</TableHead>
                  <TableHead className="text-xs font-mono">MILITAR</TableHead>
                  <TableHead className="text-xs font-mono">NIP</TableHead>
                  <TableHead className="text-xs font-mono">RETIRADA</TableHead>
                  <TableHead className="text-xs font-mono">DEVOLUÇÃO</TableHead>
                  <TableHead className="text-xs font-mono">CABO AUX.</TableHead>
                  <TableHead className="text-xs font-mono">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistorico.map((h) => (
                  <TableRow key={h.id} className="hover:bg-secondary/30">
                    <TableCell className="text-sm">
                      <span className="font-mono font-bold text-primary">CHAVE {String(h.chave_numero ?? "").padStart(2, "0")}</span>
                      <span className="text-muted-foreground"> — </span>
                      <span className="font-medium">{h.chave_nome}</span>
                    </TableCell>
                    <TableCell className="text-sm">{h.militar}</TableCell>
                    <TableCell className="text-xs font-mono">{h.nip || "—"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{new Date(h.data_retirada).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{h.data_devolucao ? new Date(h.data_devolucao).toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-sm">{h.cabo_devolucao || h.cabo_retirada || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={h.status === "devolvida" ? "default" : "destructive"} className={h.status === "devolvida" ? "bg-primary/20 text-primary border-0" : ""}>
                        {h.status === "devolvida" ? "Devolvida" : "Em uso"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredHistorico.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">Nenhum registro</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Retirada */}
      <Dialog open={dialogType === "retirada"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-primary" /> Retirada — {selectedChave?.nome}</DialogTitle>
            <DialogDescription>Chave Nº {selectedChave?.numero}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NIP DO MILITAR</label>
              <Input value={nip} onChange={(e) => setNip(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRetirada()} placeholder="Digite o NIP" className="bg-secondary border-border" autoFocus />
            </div>
            <Button className="w-full gap-2" variant="outline" disabled>
              <Fingerprint className="w-4 h-4" /> Coletar biometria (futuro)
            </Button>
            <Button onClick={handleRetirada} className="w-full" disabled={retiradaMutation.isPending}>
              {retiradaMutation.isPending ? "Registrando..." : "Confirmar retirada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Devolução */}
      <Dialog open={dialogType === "devolucao"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Devolução — {selectedChave?.nome}</DialogTitle>
            <DialogDescription>Em uso por {selectedChave?.militar_responsavel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="p-3 rounded-md bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground font-mono">CABO AUXILIAR DE SERVIÇO</p>
              <div className="mt-2 h-9 rounded border border-dashed border-border bg-background/50 flex items-center justify-center">
                <span className="text-xs font-mono text-muted-foreground/60">Aguardando biometria...</span>
              </div>
            </div>
            <Button onClick={handleDevolucao} className="w-full gap-2" disabled={devolucaoMutation.isPending}>
              <Fingerprint className="w-4 h-4" />
              {devolucaoMutation.isPending ? "Registrando..." : "Coletar biometria e confirmar devolução"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Retirada Múltipla */}
      <Dialog open={dialogType === "multipla"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" /> Retirada múltipla
            </DialogTitle>
            <DialogDescription>
              {selecionadasObj.length} chave{selecionadasObj.length === 1 ? "" : "s"} — uma única biometria libera todas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="max-h-40 overflow-auto rounded-md border border-border bg-secondary/40 p-2 space-y-1">
              {selecionadasObj.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-foreground">
                    Nº {String(c.numero).padStart(2, "0")} — {c.nome}
                  </span>
                  {c.categoria === "secreta" && (
                    <span className="text-status-borrowed tracking-wider">SECRETA</span>
                  )}
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NIP DO MILITAR</label>
              <Input
                value={multiNip}
                onChange={(e) => setMultiNip(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRetiradaMultipla()}
                placeholder="Digite o NIP"
                className="bg-secondary border-border"
                autoFocus
              />
            </div>
            <Button className="w-full gap-2" variant="outline" disabled>
              <Fingerprint className="w-4 h-4" /> Coletar biometria (futuro)
            </Button>
            <Button onClick={handleRetiradaMultipla} className="w-full gap-2" disabled={retiradaMultiplaMutation.isPending}>
              <Fingerprint className="w-4 h-4" />
              {retiradaMultiplaMutation.isPending
                ? "Registrando..."
                : `Confirmar retirada (${selecionadasObj.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chaves;
