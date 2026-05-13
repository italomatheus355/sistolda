import { useEffect, useRef, useState } from "react";
import { Users, Plus, LogOut, Eye, History, Fingerprint, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiVisitante, ApiVisitanteRecorrente, SYNC_OPTIONS } from "@/lib/api";
import { getCaboOnDuty } from "@/lib/localDb";
import { showOperationConfirm } from "@/components/OperationConfirm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

type Tipo = "comum" | "recorrente";
type FaseBio = "intro" | "coletando" | "sucesso";

const TOTAL_LEITURAS = 5;
const INTERVALO_MS = 900;

const emptyForm = {
  tipo: "comum" as Tipo,
  nome: "",
  documento: "",
  localDestino: "",
  observacoes: "",
  cpf: "",
  rg: "",
  telefone: "",
  organizacao: "",
};

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const Visitantes = () => {
  const queryClient = useQueryClient();
  const [showCadastro, setShowCadastro] = useState(false);
  const [showBioAccess, setShowBioAccess] = useState(false);
  const [detalhes, setDetalhes] = useState<ApiVisitante | null>(null);
  const [filtroData, setFiltroData] = useState("");
  const [form, setForm] = useState(emptyForm);

  // Biometria de cadastro (5 coletas)
  const [faseBio, setFaseBio] = useState<FaseBio>("intro");
  const [leituras, setLeituras] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [showBioCadastro, setShowBioCadastro] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Biometria de acesso
  const [bioAcessoFase, setBioAcessoFase] = useState<"scan" | "identificado">("scan");
  const [recorrenteSelecionado, setRecorrenteSelecionado] = useState<ApiVisitanteRecorrente | null>(null);

  const { data: visitantes = [], isLoading } = useQuery({
    queryKey: ["visitantes"], queryFn: api.listVisitantes, ...SYNC_OPTIONS,
  });
  const { data: recorrentes = [] } = useQuery({
    queryKey: ["visitantes-recorrentes"], queryFn: api.listRecorrentes, ...SYNC_OPTIONS,
  });

  function clearTimer() {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }
  useEffect(() => () => clearTimer(), []);

  const cadastroComumMutation = useMutation({
    mutationFn: async (cabo: string) => {
      await api.createVisitante({
        nome: form.nome,
        documento: form.documento,
        militar_responsavel: "",
        local_destino: form.localDestino,
        observacoes: form.observacoes || null,
        cabo_registro: cabo,
        tipo: "comum",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitantes"] });
      showOperationConfirm({ nome: form.nome, acao: "entrou no quartel", variant: "visitante" });
      setForm(emptyForm);
      setShowCadastro(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const cadastroRecorrenteMutation = useMutation({
    mutationFn: async (cabo: string) => {
      // 1. Cria recorrente (com biometria)
      const cpfDigits = onlyDigits(form.cpf);
      const exists = await api.getRecorrenteByCpf(cpfDigits);
      let recorrenteId: number;
      if (exists) {
        recorrenteId = exists.id;
      } else {
        const created = await api.createRecorrente({
          nome: form.nome,
          cpf: cpfDigits,
          rg: form.rg || null,
          telefone: form.telefone || null,
          organizacao: form.organizacao || null,
          observacoes: form.observacoes || null,
          biometria_template: JSON.stringify({
            leituras: TOTAL_LEITURAS,
            capturadoEm: new Date().toISOString(),
            hash: null,
          }),
          biometria_leituras: TOTAL_LEITURAS,
        });
        recorrenteId = created.id;
      }
      // 2. Registra entrada
      await api.createVisitante({
        nome: form.nome,
        documento: form.rg || cpfDigits,
        militar_responsavel: "",
        local_destino: form.localDestino,
        observacoes: form.observacoes || null,
        cabo_registro: cabo,
        cpf: cpfDigits,
        rg: form.rg || null,
        telefone: form.telefone || null,
        organizacao: form.organizacao || null,
        recorrente_id: recorrenteId,
        tipo: "recorrente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitantes"] });
      queryClient.invalidateQueries({ queryKey: ["visitantes-recorrentes"] });
      showOperationConfirm({
        nome: `${form.organizacao ? form.organizacao + " - " : ""}${form.nome}`,
        acao: "entrou no quartel (biometria cadastrada)",
        variant: "visitante",
      });
      setForm(emptyForm);
      setShowBioCadastro(false);
      setShowCadastro(false);
      setFaseBio("intro");
      setLeituras(0);
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setShowBioCadastro(false);
      setFaseBio("intro");
      setLeituras(0);
    },
  });

  const acessoBioMutation = useMutation({
    mutationFn: async ({ rec, cabo }: { rec: ApiVisitanteRecorrente; cabo: string }) => {
      await api.createVisitante({
        nome: rec.nome,
        documento: rec.rg || rec.cpf || "—",
        militar_responsavel: "",
        local_destino: form.localDestino || "Manutenção / Apoio técnico",
        observacoes: rec.observacoes || null,
        cabo_registro: cabo,
        cpf: rec.cpf,
        rg: rec.rg,
        telefone: rec.telefone,
        organizacao: rec.organizacao,
        recorrente_id: rec.id,
        tipo: "recorrente",
      });
      return rec;
    },
    onSuccess: (rec) => {
      queryClient.invalidateQueries({ queryKey: ["visitantes"] });
      showOperationConfirm({
        nome: `${rec.organizacao ? rec.organizacao + " - " : ""}${rec.nome}`,
        acao: "entrou no quartel (biometria)",
        variant: "visitante",
      });
      setShowBioAccess(false);
      setBioAcessoFase("scan");
      setRecorrenteSelecionado(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  function iniciarCadastro() {
    if (!form.nome || !form.localDestino) {
      toast({ title: "Erro", description: "Preencha nome e destino.", variant: "destructive" });
      return;
    }
    if (form.tipo === "comum") {
      if (!form.documento) {
        toast({ title: "Erro", description: "Informe o documento.", variant: "destructive" });
        return;
      }
      cadastroComumMutation.mutate(getCaboOnDuty());
    } else {
      const cpfDigits = onlyDigits(form.cpf);
      if (cpfDigits.length < 11) {
        toast({ title: "Erro", description: "CPF inválido.", variant: "destructive" });
        return;
      }
      if (!form.organizacao) {
        toast({ title: "Erro", description: "Informe a organização/força.", variant: "destructive" });
        return;
      }
      // Inicia coleta biométrica
      setFaseBio("intro");
      setLeituras(0);
      setShowBioCadastro(true);
    }
  }

  function iniciarColetas() {
    setFaseBio("coletando");
    setLeituras(0);
    let count = 0;
    timerRef.current = window.setInterval(() => {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 300);
      count += 1;
      setLeituras(count);
      if (count >= TOTAL_LEITURAS) {
        clearTimer();
        window.setTimeout(() => {
          setFaseBio("sucesso");
          cadastroRecorrenteMutation.mutate(getCaboOnDuty());
        }, 350);
      }
    }, INTERVALO_MS);
  }

  function simularIdentificacao(rec: ApiVisitanteRecorrente) {
    setRecorrenteSelecionado(rec);
    setBioAcessoFase("identificado");
  }

  const presentes = visitantes.filter((v) => !v.hora_saida);
  const historico = filtroData
    ? visitantes.filter((v) => v.hora_entrada.startsWith(filtroData))
    : visitantes;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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
            Registro de entrada e saída · {recorrentes.length} cadastro(s) recorrente(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setShowBioAccess(true); setBioAcessoFase("scan"); setRecorrenteSelecionado(null); }}
            className="gap-2"
            disabled={recorrentes.length === 0}
            title={recorrentes.length === 0 ? "Nenhum recorrente cadastrado ainda" : "Acesso por biometria"}
          >
            <Fingerprint className="w-4 h-4" /> Acesso por Biometria
          </Button>
          <Button onClick={() => { setForm(emptyForm); setShowCadastro(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Registrar Entrada
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ativos">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="ativos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">No Quartel</TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-3.5 h-3.5 mr-1.5" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ativos">
          <VisitantesTable
            rows={visitantes.filter((v) => !v.hora_saida)}
            isLoading={isLoading}
            onSaida={(v) => api.saidaVisitante(v.id).then(() => {
              queryClient.invalidateQueries({ queryKey: ["visitantes"] });
              showOperationConfirm({ nome: v.nome, acao: "saiu do quartel", variant: "visitante" });
            })}
            onDetalhes={setDetalhes}
          />
        </TabsContent>

        <TabsContent value="historico">
          <div className="flex items-center gap-3 mb-4">
            <label className="text-xs font-mono text-muted-foreground">FILTRAR POR DATA</label>
            <Input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="bg-secondary border-border w-44" />
            {filtroData && (
              <Button size="sm" variant="outline" onClick={() => setFiltroData("")}>Limpar</Button>
            )}
          </div>
          <VisitantesTable
            rows={historico}
            isLoading={isLoading}
            onSaida={(v) => api.saidaVisitante(v.id).then(() => {
              queryClient.invalidateQueries({ queryKey: ["visitantes"] });
              showOperationConfirm({ nome: v.nome, acao: "saiu do quartel", variant: "visitante" });
            })}
            onDetalhes={setDetalhes}
          />
        </TabsContent>
      </Tabs>

      {/* ============ Cadastro ============ */}
      <Dialog open={showCadastro} onOpenChange={setShowCadastro}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Registrar Entrada</DialogTitle>
            <DialogDescription>Selecione o tipo de visitante.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <RadioGroup
              value={form.tipo}
              onValueChange={(v) => setForm({ ...form, tipo: v as Tipo })}
              className="grid grid-cols-2 gap-3"
            >
              <label className={`flex items-start gap-2 rounded-md border p-3 cursor-pointer transition ${form.tipo === "comum" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="comum" id="t-comum" className="mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">Visitante comum</div>
                  <div className="text-xs text-muted-foreground">Civil ou ocasional</div>
                </div>
              </label>
              <label className={`flex items-start gap-2 rounded-md border p-3 cursor-pointer transition ${form.tipo === "recorrente" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="recorrente" id="t-rec" className="mt-0.5" />
                <div>
                  <div className="text-sm font-semibold flex items-center gap-1">
                    <Fingerprint className="w-3.5 h-3.5" /> Recorrente c/ biometria
                  </div>
                  <div className="text-xs text-muted-foreground">Militar de outra força</div>
                </div>
              </label>
            </RadioGroup>

            <div className="grid grid-cols-2 gap-3">
              <Field label="NOME COMPLETO *" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Nome do visitante" />
              <Field label="DESTINO *" value={form.localDestino} onChange={(v) => setForm({ ...form, localDestino: v })} placeholder="Local de destino" />

              {form.tipo === "comum" ? (
                <Field label="DOCUMENTO *" value={form.documento} onChange={(v) => setForm({ ...form, documento: v })} placeholder="RG ou CPF" />
              ) : (
                <>
                  <Field label="CPF *" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: onlyDigits(v).slice(0, 11) })} placeholder="00000000000" />
                  <Field label="RG" value={form.rg} onChange={(v) => setForm({ ...form, rg: v })} placeholder="RG" />
                  <Field label="TELEFONE" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} placeholder="(00) 00000-0000" />
                  <Field label="ORGANIZAÇÃO / FORÇA *" value={form.organizacao} onChange={(v) => setForm({ ...form, organizacao: v })} placeholder="Ex.: Exército - 5º BIS" />
                </>
              )}
              <div className="col-span-2">
                <Field label="OBSERVAÇÕES" value={form.observacoes} onChange={(v) => setForm({ ...form, observacoes: v })} placeholder="Opcional" />
              </div>
            </div>

            <Button onClick={iniciarCadastro} className="w-full mt-2 gap-2" disabled={cadastroComumMutation.isPending}>
              {form.tipo === "recorrente" ? <Fingerprint className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              {form.tipo === "recorrente" ? "Cadastrar e coletar biometria" : "Registrar Entrada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Coleta biométrica (cadastro) ============ */}
      <Dialog
        open={showBioCadastro}
        onOpenChange={(v) => {
          if (!v && faseBio === "coletando") return;
          setShowBioCadastro(v);
          if (!v) { clearTimer(); setFaseBio("intro"); setLeituras(0); }
        }}
      >
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono tracking-widest text-sm">
              <Fingerprint className="w-4 h-4 text-primary" /> COLETA BIOMÉTRICA
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {form.nome} · {form.organizacao}
            </DialogDescription>
          </DialogHeader>

          {faseBio === "intro" && (
            <div className="space-y-5 py-2 animate-fade-in">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-20 h-20 rounded-full border-2 border-primary/40 flex items-center justify-center bg-primary/5">
                  <Fingerprint className="w-10 h-10 text-primary" />
                </div>
                <p className="text-sm">
                  Realize <span className="font-bold text-primary">{TOTAL_LEITURAS} coletas</span> da biometria.
                </p>
                <p className="text-xs font-mono text-muted-foreground tracking-wide">
                  POSICIONE O DEDO NO LEITOR A CADA COLETA
                </p>
              </div>
              <Button onClick={iniciarColetas} className="w-full gap-2">
                <Fingerprint className="w-4 h-4" /> Iniciar Coleta
              </Button>
            </div>
          )}

          {faseBio === "coletando" && (
            <div className="space-y-5 py-2 animate-fade-in">
              <div className="flex flex-col items-center gap-3">
                <div className={`w-24 h-24 rounded-full border-2 border-primary flex items-center justify-center transition-all ${pulse ? "scale-110 bg-primary/20" : "bg-primary/5"}`}>
                  <Fingerprint className={`w-12 h-12 text-primary ${pulse ? "" : "animate-pulse"}`} />
                </div>
                <div className="text-center">
                  <div className="text-xs font-mono tracking-widest text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> CAPTURANDO LEITURA
                  </div>
                  <div className="text-2xl font-bold font-mono mt-1">{leituras}/{TOTAL_LEITURAS}</div>
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(leituras / TOTAL_LEITURAS) * 100}%` }} />
              </div>
            </div>
          )}

          {faseBio === "sucesso" && (
            <div className="space-y-5 py-2 text-center animate-scale-in">
              <div className="w-20 h-20 mx-auto rounded-full border-2 border-status-available bg-status-available/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-status-available" />
              </div>
              <p className="text-base font-semibold">Biometria cadastrada e entrada registrada.</p>
              {cadastroRecorrenteMutation.isPending && (
                <p className="text-xs font-mono text-muted-foreground">Salvando...</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ Acesso por Biometria ============ */}
      <Dialog open={showBioAccess} onOpenChange={(v) => { setShowBioAccess(v); if (!v) { setBioAcessoFase("scan"); setRecorrenteSelecionado(null); } }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono tracking-widest text-sm">
              <Fingerprint className="w-4 h-4 text-primary" /> ACESSO POR BIOMETRIA
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              IDENTIFIQUE O VISITANTE RECORRENTE
            </DialogDescription>
          </DialogHeader>

          {bioAcessoFase === "scan" && (
            <div className="space-y-5 py-2 animate-fade-in">
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full border-2 border-primary flex items-center justify-center bg-primary/5 animate-pulse">
                  <Fingerprint className="w-12 h-12 text-primary" />
                </div>
                <p className="text-xs font-mono tracking-widest text-muted-foreground">
                  AGUARDANDO LEITURA BIOMÉTRICA
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">
                  IDENTIFICAÇÃO MANUAL (HARDWARE FUTURO)
                </Label>
                <Select onValueChange={(id) => {
                  const r = recorrentes.find((x) => String(x.id) === id);
                  if (r) simularIdentificacao(r);
                }}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione o visitante recorrente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {recorrentes.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.nome} {r.organizacao ? `· ${r.organizacao}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Quando o leitor biométrico físico estiver integrado, esta etapa será automática.
                </p>
              </div>
            </div>
          )}

          {bioAcessoFase === "identificado" && recorrenteSelecionado && (
            <div className="space-y-4 py-2 animate-scale-in">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full border-2 border-status-available bg-status-available/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-status-available" />
                </div>
                <p className="text-xs font-mono tracking-widest text-status-available">VISITANTE IDENTIFICADO</p>
              </div>

              <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm space-y-1.5">
                <Row k="Nome" v={recorrenteSelecionado.nome} />
                <Row k="Organização" v={recorrenteSelecionado.organizacao || "—"} />
                <Row k="CPF" v={recorrenteSelecionado.cpf || "—"} />
                <Row k="RG" v={recorrenteSelecionado.rg || "—"} />
                <Row k="Telefone" v={recorrenteSelecionado.telefone || "—"} />
              </div>

              <div>
                <Label className="text-xs font-mono text-muted-foreground mb-1.5 block">DESTINO</Label>
                <Input
                  value={form.localDestino}
                  onChange={(e) => setForm({ ...form, localDestino: e.target.value })}
                  placeholder="Manutenção / Apoio técnico"
                  className="bg-secondary border-border"
                />
              </div>

              <Button
                onClick={() => acessoBioMutation.mutate({ rec: recorrenteSelecionado, cabo: getCaboOnDuty() })}
                className="w-full gap-2"
                disabled={acessoBioMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar Entrada
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ Detalhes ============ */}
      <Dialog open={!!detalhes} onOpenChange={(o) => !o && setDetalhes(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" /> Detalhes do Visitante</DialogTitle>
          </DialogHeader>
          {detalhes && (
            <div className="space-y-2 text-sm mt-2">
              <Row k="Tipo" v={detalhes.tipo === "recorrente" ? "Recorrente (biometria)" : "Comum"} />
              <Row k="Nome" v={detalhes.nome} />
              <Row k="Documento" v={detalhes.documento} />
              {detalhes.organizacao && <Row k="Organização" v={detalhes.organizacao} />}
              {detalhes.cpf && <Row k="CPF" v={detalhes.cpf} />}
              {detalhes.rg && <Row k="RG" v={detalhes.rg} />}
              {detalhes.telefone && <Row k="Telefone" v={detalhes.telefone} />}
              <Row k="Destino" v={detalhes.local_destino} />
              <Row k="Entrada" v={new Date(detalhes.hora_entrada).toLocaleString("pt-BR")} />
              <Row k="Saída" v={detalhes.hora_saida ? new Date(detalhes.hora_saida).toLocaleString("pt-BR") : "Ainda no quartel"} />
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{detalhes.observacoes || "—"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label className="text-xs font-mono text-muted-foreground mb-1.5 block">{label}</label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-secondary border-border" />
  </div>
);

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-4 border-b border-border/50 pb-1.5">
    <span className="text-xs font-mono text-muted-foreground uppercase">{k}</span>
    <span className="text-sm text-foreground text-right">{v}</span>
  </div>
);

const VisitantesTable = ({
  rows, isLoading, onSaida, onDetalhes,
}: {
  rows: ApiVisitante[]; isLoading: boolean; onSaida: (v: ApiVisitante) => void; onDetalhes: (v: ApiVisitante) => void;
}) => (
  <div className="rounded-lg border border-border overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow className="bg-secondary/50 hover:bg-secondary/50">
          <TableHead className="text-xs font-mono">TIPO</TableHead>
          <TableHead className="text-xs font-mono">NOME</TableHead>
          <TableHead className="text-xs font-mono">ORG / DOC</TableHead>
          <TableHead className="text-xs font-mono">DESTINO</TableHead>
          <TableHead className="text-xs font-mono">ENTRADA</TableHead>
          <TableHead className="text-xs font-mono">SAÍDA</TableHead>
          <TableHead className="text-xs font-mono">AÇÃO</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
        ) : rows.length === 0 ? (
          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
        ) : rows.map((v) => (
          <TableRow key={v.id} className="hover:bg-secondary/30">
            <TableCell>
              {v.tipo === "recorrente" ? (
                <Badge className="bg-primary/20 text-primary border-0 gap-1"><Fingerprint className="w-3 h-3" />REC</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">COMUM</Badge>
              )}
            </TableCell>
            <TableCell className="text-sm font-medium">{v.nome}</TableCell>
            <TableCell className="text-xs font-mono text-muted-foreground">
              {v.organizacao || v.documento}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{v.local_destino}</TableCell>
            <TableCell className="text-xs font-mono">{new Date(v.hora_entrada).toLocaleString("pt-BR")}</TableCell>
            <TableCell className="text-xs font-mono">
              {v.hora_saida ? new Date(v.hora_saida).toLocaleString("pt-BR") : "—"}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => onDetalhes(v)} className="h-7 px-2">
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                {!v.hora_saida ? (
                  <Button size="sm" variant="outline" onClick={() => onSaida(v)} className="gap-1 text-xs h-7">
                    <LogOut className="w-3 h-3" /> Saída
                  </Button>
                ) : (
                  <Badge className="bg-primary/20 text-primary border-0">Concluído</Badge>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default Visitantes;
