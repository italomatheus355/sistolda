import { useState } from "react";
import { Car, History, Search, Fingerprint, RotateCcw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

interface Viatura {
  id: string;
  numero: number;
  prefixo: string;
  modelo: string;
  placa: string | null;
  status: string;
  militar_responsavel: string | null;
  km_atual: number | null;
}

interface HistoricoViatura {
  id: string;
  viatura_prefixo: string;
  motorista: string;
  destino: string;
  km_saida: number | null;
  km_retorno: number | null;
  km_rodado: number | null;
  data_saida: string;
  data_retorno: string | null;
  cabo_saida: string | null;
  cabo_retorno: string | null;
  status: string;
}

const statusDot = { disponivel: "status-dot-available", em_uso: "status-dot-borrowed", manutencao: "status-dot-maintenance" } as const;
const statusLabel = { disponivel: "Disponível", em_uso: "Em Uso", manutencao: "Manutenção" } as const;
const statusBorder = {
  disponivel: "border-status-available/30 hover:border-status-available/60 card-glow",
  em_uso: "border-status-borrowed/30 hover:border-status-borrowed/60",
  manutencao: "border-status-maintenance/30 hover:border-status-maintenance/60",
} as const;

const getCaboOnDuty = async (): Promise<string> => {
  const { data } = await supabase.rpc("get_cabo_on_duty" as any);
  return (data as string) || "Não identificado";
};

const Viaturas = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Viatura | null>(null);
  const [dialogType, setDialogType] = useState<"saida" | "retorno" | null>(null);
  const [motorista, setMotorista] = useState("");
  const [matricula, setMatricula] = useState("");
  const [destino, setDestino] = useState("");
  const [kmSaida, setKmSaida] = useState("");
  const [kmRetorno, setKmRetorno] = useState("");
  const [autonomia, setAutonomia] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: viaturas = [], isLoading } = useQuery({
    queryKey: ["viaturas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("viaturas").select("*").order("numero");
      if (error) throw error;
      return data as Viatura[];
    },
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["historico_viaturas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_viaturas")
        .select("*")
        .order("data_saida", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as HistoricoViatura[];
    },
  });

  const saidaMutation = useMutation({
    mutationFn: async ({ viatura, cabo }: { viatura: Viatura; cabo: string }) => {
      await supabase.from("viaturas").update({
        status: "em_uso",
        militar_responsavel: `${motorista} (Mat. ${matricula})`,
        km_atual: kmSaida ? parseInt(kmSaida) : viatura.km_atual,
      }).eq("id", viatura.id);

      await supabase.from("historico_viaturas").insert({
        viatura_id: viatura.id,
        viatura_prefixo: viatura.prefixo,
        motorista: `${motorista} (Mat. ${matricula})`,
        matricula,
        destino,
        km_saida: kmSaida ? parseInt(kmSaida) : null,
        cabo_saida: cabo,
        status: "em_uso",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viaturas"] });
      queryClient.invalidateQueries({ queryKey: ["historico_viaturas"] });
      toast({ title: "Saída Registrada", description: `${selected?.prefixo} saiu às ${new Date().toLocaleTimeString("pt-BR")}.` });
      setDialogType(null);
      setSelected(null);
      setMotorista(""); setMatricula(""); setDestino(""); setKmSaida("");
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar.", variant: "destructive" }),
  });

  const retornoMutation = useMutation({
    mutationFn: async ({ viatura, cabo }: { viatura: Viatura; cabo: string }) => {
      await supabase.from("viaturas").update({
        status: "disponivel",
        militar_responsavel: null,
        km_atual: kmRetorno ? parseInt(kmRetorno) : viatura.km_atual,
      }).eq("id", viatura.id);

      const { data: hist } = await supabase
        .from("historico_viaturas")
        .select("id")
        .eq("viatura_id", viatura.id)
        .eq("status", "em_uso")
        .order("data_saida", { ascending: false })
        .limit(1)
        .single();

      if (hist) {
        await supabase.from("historico_viaturas").update({
          data_retorno: new Date().toISOString(),
          km_retorno: kmRetorno ? parseInt(kmRetorno) : null,
          autonomia_informada: autonomia || null,
          cabo_retorno: cabo,
          status: "retornada",
        }).eq("id", hist.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["viaturas"] });
      queryClient.invalidateQueries({ queryKey: ["historico_viaturas"] });
      toast({ title: "Retorno Registrado", description: `${selected?.prefixo} retornou.` });
      setDialogType(null);
      setSelected(null);
      setKmRetorno(""); setAutonomia("");
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar.", variant: "destructive" }),
  });

  const handleClick = (v: Viatura) => {
    if (v.status === "manutencao") return;
    setSelected(v);
    setDialogType(v.status === "disponivel" ? "saida" : "retorno");
  };

  const handleSaida = async () => {
    if (!motorista.trim() || !matricula.trim() || !destino.trim()) {
      toast({ title: "Erro", description: "Informe motorista, matrícula e destino.", variant: "destructive" });
      return;
    }
    const cabo = await getCaboOnDuty();
    saidaMutation.mutate({ viatura: selected!, cabo });
  };

  const handleRetorno = async () => {
    const cabo = await getCaboOnDuty();
    retornoMutation.mutate({ viatura: selected!, cabo });
  };

  const filtered = viaturas.filter(v =>
    v.prefixo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Car className="w-6 h-6 text-primary" />
            Viaturas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de saída e retorno das viaturas</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="status-dot-available" /> {viaturas.filter(v => v.status === "disponivel").length}</span>
          <span className="flex items-center gap-1.5"><span className="status-dot-borrowed" /> {viaturas.filter(v => v.status === "em_uso").length}</span>
          <span className="flex items-center gap-1.5"><span className="status-dot-maintenance" /> {viaturas.filter(v => v.status === "manutencao").length}</span>
        </div>
      </div>

      <Tabs defaultValue="status">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="status" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Status</TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-3.5 h-3.5 mr-1.5" />
            Histórico
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
              {filtered.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleClick(v)}
                  disabled={v.status === "manutencao"}
                  className={`relative p-5 rounded-lg border bg-card transition-all duration-200 text-left hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed ${statusBorder[v.status as keyof typeof statusBorder]}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={statusDot[v.status as keyof typeof statusDot]} />
                    <span className="text-[10px] font-mono text-muted-foreground">{statusLabel[v.status as keyof typeof statusLabel]}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground font-mono">{v.prefixo}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{v.modelo}</p>
                  {v.km_atual !== null && <p className="text-[10px] text-muted-foreground mt-1 font-mono">KM: {v.km_atual.toLocaleString("pt-BR")}</p>}
                  {v.militar_responsavel && (
                    <p className="text-xs text-status-borrowed mt-2 font-mono">{v.militar_responsavel}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="text-xs font-mono">VIATURA</TableHead>
                  <TableHead className="text-xs font-mono">MOTORISTA</TableHead>
                  <TableHead className="text-xs font-mono">DESTINO</TableHead>
                  <TableHead className="text-xs font-mono">SAÍDA</TableHead>
                  <TableHead className="text-xs font-mono">RETORNO</TableHead>
                  <TableHead className="text-xs font-mono">KM</TableHead>
                  <TableHead className="text-xs font-mono">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((h) => (
                  <TableRow key={h.id} className="hover:bg-secondary/30">
                    <TableCell className="text-sm font-bold font-mono">{h.viatura_prefixo}</TableCell>
                    <TableCell className="text-sm">{h.motorista}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.destino}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{new Date(h.data_saida).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{h.data_retorno ? new Date(h.data_retorno).toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{h.km_rodado != null ? `${h.km_rodado} km` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={h.status === "retornada" ? "default" : "destructive"} className={h.status === "retornada" ? "bg-primary/20 text-primary border-0" : ""}>
                        {h.status === "retornada" ? "Retornou" : "Em uso"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {historico.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">Nenhum registro</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Saída Dialog */}
      <Dialog open={dialogType === "saida"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Car className="w-5 h-5 text-primary" /> Saída de Viatura</DialogTitle>
            <DialogDescription>{selected?.prefixo} — {selected?.modelo}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NOME DO MOTORISTA</label>
              <Input value={motorista} onChange={(e) => setMotorista(e.target.value)} placeholder="Ex: Sd João Silva" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">MATRÍCULA</label>
              <Input value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ex: 12345" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">DESTINO</label>
              <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Local de destino" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">KM SAÍDA</label>
              <Input type="number" value={kmSaida} onChange={(e) => setKmSaida(e.target.value)} placeholder={`Atual: ${selected?.km_atual || 0}`} className="bg-secondary border-border" />
            </div>
            <Button className="w-full gap-2" variant="outline" disabled><Fingerprint className="w-4 h-4" /> Ler Biometria (integração futura)</Button>
            <Button onClick={handleSaida} className="w-full" disabled={saidaMutation.isPending}>
              {saidaMutation.isPending ? "Registrando..." : "Confirmar Saída"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Retorno Dialog */}
      <Dialog open={dialogType === "retorno"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Retorno de Viatura</DialogTitle>
            <DialogDescription>{selected?.prefixo} — {selected?.militar_responsavel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">KM RETORNO</label>
              <Input type="number" value={kmRetorno} onChange={(e) => setKmRetorno(e.target.value)} placeholder="KM atual" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">AUTONOMIA INFORMADA (opcional)</label>
              <Input value={autonomia} onChange={(e) => setAutonomia(e.target.value)} placeholder="Ex: 1/4 de tanque" className="bg-secondary border-border" />
            </div>
            <div className="p-3 rounded-md bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground font-mono">CABO AUXILIAR EM SERVIÇO</p>
              <p className="text-sm font-semibold text-foreground mt-1">Identificado automaticamente pela escala</p>
            </div>
            <Button onClick={handleRetorno} className="w-full" disabled={retornoMutation.isPending}>
              {retornoMutation.isPending ? "Registrando..." : "Confirmar Retorno"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Viaturas;
