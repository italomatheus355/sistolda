// SISTOLDA — Controle de Viaturas (saída/retorno por biometria).
import { useMemo, useState } from "react";
import { Car, History, Search, RotateCcw, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiViatura, SYNC_OPTIONS } from "@/lib/api";
import { getCaboOnDuty } from "@/lib/localDb";
import { showAuthConfirm } from "@/components/AuthConfirm";
import { BiometricCapture } from "@/components/BiometricCapture";
import { OperationalDateBanner } from "@/components/OperationalDateBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function Viaturas() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<ApiViatura | null>(null);
  const [dialogType, setDialogType] = useState<"saida" | "retorno" | null>(null);

  // Form saída
  const [destino, setDestino] = useState("");

  // Form retorno
  const [kmRetorno, setKmRetorno] = useState("");
  const [autonomia, setAutonomia] = useState("");

  // Biometria só inicia quando o operador aciona explicitamente
  const [capturaAtiva, setCapturaAtiva] = useState(false);

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

  const motoristaAtual = (v: ApiViatura): string | null => {
    if (v.militar_responsavel) return v.militar_responsavel;
    const open = historico.find((h) => h.viatura_id === v.id && h.status === "em_uso");
    return open?.motorista || null;
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["viaturas"] });
    queryClient.invalidateQueries({ queryKey: ["historico_viaturas"] });
  };

  const autenticarMutation = useMutation({
    mutationFn: async (vars: { nip: string; acao: "saida" | "retorno"; viatura: ApiViatura }) => {
      const payload =
        vars.acao === "saida"
          ? { destino: destino.trim() }
          : { km_retorno: kmRetorno.trim() !== "" ? parseInt(kmRetorno) : 0, autonomia: autonomia.trim() !== "" ? autonomia : null };
      const resp = await api.autenticarBiometria({
        nip: vars.nip,
        modulo: "viaturas",
        acao: vars.acao,
        itens: [vars.viatura.id],
        cabo: getCaboOnDuty(),
        payload,
      });
      return { resp, viatura: vars.viatura };
    },
    onSuccess: ({ resp, viatura }) => {
      invalidate();
      showAuthConfirm({
        nome: resp.nome,
        nip: resp.nip,
        descricao: resp.descricao || `Operação na viatura ${viatura.prefixo}`,
        modulo: "viaturas",
      });
      setDialogType(null); setSelected(null); setCapturaAtiva(false);
      setDestino(""); setKmRetorno(""); setAutonomia("");
    },
    onError: (e: Error) => toast({ title: "Falha na autenticação", description: e.message, variant: "destructive" }),
  });

  const handleClick = (v: ApiViatura) => {
    if (v.status === "manutencao") return;
    setSelected(v);
    setCapturaAtiva(false);
    setDialogType(v.status === "disponivel" ? "saida" : "retorno");
  };

  const onBiometriaSaida = (nip: string) => {
    if (!destino.trim()) {
      toast({ title: "Destino obrigatório", description: "Informe o destino antes da biometria.", variant: "destructive" });
      return;
    }
    if (!selected) return;
    autenticarMutation.mutate({ nip, acao: "saida", viatura: selected });
  };
  const onBiometriaRetorno = (nip: string) => {
    if (!kmRetorno.trim()) {
      toast({ title: "Quilometragem obrigatória", description: "Informe a KM antes da biometria.", variant: "destructive" });
      return;
    }
    if (!selected) return;
    autenticarMutation.mutate({ nip, acao: "retorno", viatura: selected });
  };

  const filtered = viaturas.filter((v) =>
    v.prefixo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modelo.toLowerCase().includes(searchTerm.toLowerCase()),
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
      <OperationalDateBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Car className="w-6 h-6 text-primary" /> Viaturas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de saída e retorno por biometria.</p>
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
                    <div className="flex items-center justify-between mb-3">
                      <span className={statusDot[v.status]} />
                      <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider">{statusLabel[v.status]}</span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-white text-center tracking-tight uppercase my-2">{v.prefixo}</h3>
                    <p className="text-sm text-white/80 text-center">{v.modelo}</p>
                    {v.km_atual !== null && <p className="text-[11px] text-white/70 mt-2 font-mono text-center">KM: {v.km_atual.toLocaleString("pt-BR")}</p>}
                    {motorista && (
                      <p className="text-xs text-white mt-2 font-mono text-center truncate">{motorista}</p>
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
                    <TableCell className="text-sm">
                      {h.motorista}
                      {h.pessoa_tipo === "exercito" ? " (EB)" : h.pessoa_tipo === "civil" ? " (Civil)" : ""}
                    </TableCell>
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

      {/* ===== Saída ===== */}
      <Dialog open={dialogType === "saida"} onOpenChange={() => { setDialogType(null); setDestino(""); setCapturaAtiva(false); }}>
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
              <Label className="text-xs font-mono text-muted-foreground mb-1.5 block">DESTINO *</Label>
              <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Local de destino" className="bg-secondary border-border" autoFocus />
            </div>
            {!capturaAtiva ? (
              <Button
                type="button"
                className="w-full"
                disabled={!destino.trim() || autenticarMutation.isPending}
                onClick={() => setCapturaAtiva(true)}
              >
                Iniciar biometria
              </Button>
            ) : (
              <BiometricCapture
                onCapture={onBiometriaSaida}
                disabled={autenticarMutation.isPending || !destino.trim()}
                label={autenticarMutation.isPending ? "PROCESSANDO..." : "AGUARDANDO BIOMETRIA"}
                hint="Posicione o dedo no leitor para confirmar a saída."
                autoRefocus={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Retorno ===== */}
      <Dialog open={dialogType === "retorno"} onOpenChange={() => { setDialogType(null); setKmRetorno(""); setAutonomia(""); setCapturaAtiva(false); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Retorno — {selected?.prefixo}</DialogTitle>
            <DialogDescription>{selected ? motoristaAtual(selected) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs font-mono text-muted-foreground mb-1.5 block">QUILOMETRAGEM ATUAL *</Label>
              <Input type="number" value={kmRetorno} onChange={(e) => setKmRetorno(e.target.value)} placeholder="km" className="bg-secondary border-border" autoFocus />
            </div>
            <div>
              <Label className="text-xs font-mono text-muted-foreground mb-1.5 block">AUTONOMIA</Label>
              <Input value={autonomia} onChange={(e) => setAutonomia(e.target.value)} placeholder="ex: 1/2 tanque" className="bg-secondary border-border" />
            </div>
            {!capturaAtiva ? (
              <Button
                type="button"
                className="w-full"
                disabled={!kmRetorno.trim() || autenticarMutation.isPending}
                onClick={() => setCapturaAtiva(true)}
              >
                Iniciar biometria
              </Button>
            ) : (
              <BiometricCapture
                onCapture={onBiometriaRetorno}
                disabled={autenticarMutation.isPending || !kmRetorno.trim()}
                label={autenticarMutation.isPending ? "PROCESSANDO..." : "AGUARDANDO BIOMETRIA"}
                hint="Posicione o dedo no leitor para confirmar o retorno."
                autoRefocus={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
