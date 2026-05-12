import { useMemo, useState } from "react";
import { Car, History, Search, Fingerprint, RotateCcw, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiViatura, ApiHistoricoViatura, SYNC_OPTIONS, nomeDoMilitarPorNip } from "@/lib/api";
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

const statusDot = { disponivel: "status-dot-available", em_uso: "status-dot-borrowed", manutencao: "status-dot-maintenance" } as const;
const statusLabel = { disponivel: "Disponível", em_uso: "Em Uso", manutencao: "Manutenção" } as const;
const statusBorder = {
  disponivel: "border-status-available/30 hover:border-status-available/60 card-glow",
  em_uso: "border-status-borrowed/30 hover:border-status-borrowed/60",
  manutencao: "border-status-maintenance/30 hover:border-status-maintenance/60",
} as const;

const Viaturas = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ApiViatura | null>(null);
  const [dialogType, setDialogType] = useState<"saida" | "retorno" | null>(null);

  const [nipMotorista, setNipMotorista] = useState("");
  const [destino, setDestino] = useState("");

  const [kmRetorno, setKmRetorno] = useState("");
  const [autonomia, setAutonomia] = useState("");
  const [nipCabo, setNipCabo] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [fIni, setFIni] = useState("");
  const [fFim, setFFim] = useState("");
  const [fVtr, setFVtr] = useState("todas");
  const [fMot, setFMot] = useState("");

  const { data: viaturas = [], isLoading } = useQuery({
    queryKey: ["viaturas"], queryFn: api.listViaturas, ...SYNC_OPTIONS,
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["historico_viaturas"], queryFn: api.historicoViaturas, ...SYNC_OPTIONS,
  });

  // Resolver militar_responsavel a partir do histórico em aberto
  const motoristaAtual = (v: ApiViatura): string | null => {
    if (v.militar_responsavel) return v.militar_responsavel;
    const open = historico.find((h) => h.viatura_id === v.id && h.status === "em_uso");
    return open?.motorista || null;
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["viaturas"] });
    queryClient.invalidateQueries({ queryKey: ["historico_viaturas"] });
  };

  const saidaMutation = useMutation({
    mutationFn: async ({ viatura, cabo }: { viatura: ApiViatura; cabo: string }) => {
      const motorista = await nomeDoMilitarPorNip(nipMotorista);
      await api.saidaViatura({ viatura_id: viatura.id, motorista, nip: nipMotorista, destino, cabo });
      return { motorista, viatura };
    },
    onSuccess: ({ motorista, viatura }) => {
      invalidate();
      showOperationConfirm({
        nome: motorista,
        acao: "saiu com a viatura",
        detalhe: viatura.prefixo,
        variant: "viatura",
      });
      setDialogType(null); setSelected(null);
      setNipMotorista(""); setDestino("");
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const retornoMutation = useMutation({
    mutationFn: async ({ viatura, cabo }: { viatura: ApiViatura; cabo: string }) => {
      await api.retornoViatura({
        viatura_id: viatura.id,
        km_retorno: parseInt(kmRetorno) || 0,
        autonomia: autonomia || null,
        cabo,
      });
      return viatura;
    },
    onSuccess: (viatura) => {
      const nome = motoristaAtual(viatura) || "Militar";
      invalidate();
      showOperationConfirm({
        nome,
        acao: "retornou com a viatura",
        detalhe: viatura.prefixo,
        variant: "viatura",
      });
      setDialogType(null); setSelected(null); setKmRetorno(""); setAutonomia(""); setNipCabo("");
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleClick = (v: ApiViatura) => {
    if (v.status === "manutencao") return;
    setSelected(v);
    setDialogType(v.status === "disponivel" ? "saida" : "retorno");
  };

  const handleSaida = () => {
    if (!nipMotorista.trim() || !destino.trim()) {
      toast({ title: "Erro", description: "Informe NIP do motorista e destino.", variant: "destructive" });
      return;
    }
    saidaMutation.mutate({ viatura: selected!, cabo: getCaboOnDuty() });
  };

  const handleRetorno = async () => {
    if (!kmRetorno.trim()) { toast({ title: "Erro", description: "Informe a quilometragem.", variant: "destructive" }); return; }
    const cabo = nipCabo ? await nomeDoMilitarPorNip(nipCabo) : getCaboOnDuty();
    retornoMutation.mutate({ viatura: selected!, cabo });
  };

  const filtered = viaturas.filter((v) =>
    v.prefixo.toLowerCase().includes(searchTerm.toLowerCase()) || v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHist = useMemo(() => historico.filter((h) => {
    const d = h.data_saida.slice(0, 10);
    if (fIni && d < fIni) return false;
    if (fFim && d > fFim) return false;
    if (fVtr !== "todas" && String(h.viatura_id) !== fVtr) return false;
    if (fMot && !(h.motorista.toLowerCase().includes(fMot.toLowerCase()) || (h.nip || "").includes(fMot))) return false;
    return true;
  }), [historico, fIni, fFim, fVtr, fMot]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Car className="w-6 h-6 text-primary" /> Viaturas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de saída e retorno das viaturas</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="status-dot-available" /> {viaturas.filter((v) => v.status === "disponivel").length}</span>
          <span className="flex items-center gap-1.5"><span className="status-dot-borrowed" /> {viaturas.filter((v) => v.status === "em_uso").length}</span>
          <span className="flex items-center gap-1.5"><span className="status-dot-maintenance" /> {viaturas.filter((v) => v.status === "manutencao").length}</span>
        </div>
      </div>

      <Tabs defaultValue="status">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="status" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Status</TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-3.5 h-3.5 mr-1.5" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar viatura..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-12 font-mono text-sm">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((v) => {
                const motorista = motoristaAtual(v);
                return (
                  <button key={v.id} onClick={() => handleClick(v)} disabled={v.status === "manutencao"}
                    className={`relative p-5 rounded-lg border bg-card transition-all duration-200 text-left hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed ${statusBorder[v.status]}`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className={statusDot[v.status]} />
                      <span className="text-[10px] font-mono text-muted-foreground">{statusLabel[v.status]}</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{v.prefixo}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{v.modelo}</p>
                    {v.km_atual !== null && <p className="text-[10px] text-muted-foreground mt-1 font-mono">KM: {v.km_atual.toLocaleString("pt-BR")}</p>}
                    {motorista && (
                      <p className="text-xs text-status-borrowed mt-2 font-mono">{motorista}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico">
          <div className="rounded-lg border border-border p-3 mb-4 bg-card">
            <div className="flex items-center gap-2 mb-3 text-xs font-mono text-muted-foreground"><Filter className="w-3.5 h-3.5" /> FILTROS</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Input type="date" value={fIni} onChange={(e) => setFIni(e.target.value)} className="bg-secondary border-border" />
              <Input type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} className="bg-secondary border-border" />
              <Select value={fVtr} onValueChange={setFVtr}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Viatura" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas viaturas</SelectItem>
                  {viaturas.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.prefixo}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={fMot} onChange={(e) => setFMot(e.target.value)} placeholder="Motorista / NIP" className="bg-secondary border-border" />
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="text-xs font-mono">VIATURA</TableHead>
                  <TableHead className="text-xs font-mono">MOTORISTA</TableHead>
                  <TableHead className="text-xs font-mono">DESTINO</TableHead>
                  <TableHead className="text-xs font-mono">SAÍDA</TableHead>
                  <TableHead className="text-xs font-mono">RETORNO</TableHead>
                  <TableHead className="text-xs font-mono">KM SAÍDA</TableHead>
                  <TableHead className="text-xs font-mono">KM RETORNO</TableHead>
                  <TableHead className="text-xs font-mono">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHist.map((h) => (
                  <TableRow key={h.id} className="hover:bg-secondary/30">
                    <TableCell className="text-sm font-bold font-mono">{h.viatura_prefixo}</TableCell>
                    <TableCell className="text-sm">{h.motorista}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.destino}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{new Date(h.data_saida).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{h.data_retorno ? new Date(h.data_retorno).toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{h.km_saida != null ? `${h.km_saida.toLocaleString("pt-BR")} km` : "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{h.km_retorno != null ? `${h.km_retorno.toLocaleString("pt-BR")} km` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={h.status === "retornada" ? "default" : "destructive"} className={h.status === "retornada" ? "bg-primary/20 text-primary border-0" : ""}>
                        {h.status === "retornada" ? "Retornou" : "Em uso"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredHist.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-8">Nenhum registro</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogType === "saida"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Car className="w-5 h-5 text-primary" /> Saída — {selected?.prefixo}</DialogTitle>
            <DialogDescription>{selected?.modelo}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="p-3 rounded-md bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground font-mono mb-1">KM INICIAL (automático)</p>
              <p className="text-lg font-bold font-mono text-foreground">{selected?.km_atual?.toLocaleString("pt-BR") || 0} km</p>
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NIP DO MOTORISTA</label>
              <Input value={nipMotorista} onChange={(e) => setNipMotorista(e.target.value)} placeholder="Digite o NIP" className="bg-secondary border-border" autoFocus />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">DESTINO</label>
              <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Local de destino" className="bg-secondary border-border" />
            </div>
            <Button className="w-full gap-2" variant="outline" disabled>
              <Fingerprint className="w-4 h-4" /> Coletar biometria (futuro)
            </Button>
            <Button onClick={handleSaida} className="w-full" disabled={saidaMutation.isPending}>
              {saidaMutation.isPending ? "Registrando..." : "Confirmar Saída"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === "retorno"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Retorno — {selected?.prefixo}</DialogTitle>
            <DialogDescription>{selected ? motoristaAtual(selected) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">QUILOMETRAGEM ATUAL</label>
              <Input type="number" value={kmRetorno} onChange={(e) => setKmRetorno(e.target.value)} placeholder="km" className="bg-secondary border-border" autoFocus />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">AUTONOMIA</label>
              <Input value={autonomia} onChange={(e) => setAutonomia(e.target.value)} placeholder="ex: 1/2 tanque" className="bg-secondary border-border" />
            </div>
            <div className="p-3 rounded-md bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground font-mono">CABO AUXILIAR DE SERVIÇO</p>
              <Input value={nipCabo} onChange={(e) => setNipCabo(e.target.value)} placeholder="NIP (biometria futura)" className="bg-background border-border mt-2 h-8 text-xs" />
            </div>
            <Button onClick={handleRetorno} className="w-full gap-2" disabled={retornoMutation.isPending}>
              <Fingerprint className="w-4 h-4" />
              {retornoMutation.isPending ? "Registrando..." : "Coletar biometria e confirmar retorno"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Viaturas;
