import { useEffect, useRef, useState } from "react";
import {
  Users, Plus, LogOut, Eye, History, Fingerprint, ShieldCheck, CheckCircle2,
  Loader2, Search, UserPlus, IdCard, Shield,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api, ApiVisitante, ApiVisitanteCivil, ApiMilitarExterno, SYNC_OPTIONS,
} from "@/lib/api";
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

type Modo = "civil" | "militar_externo" | "avulso";
type FaseBio = "intro" | "coletando" | "sucesso";

const TOTAL_LEITURAS = 5;
const INTERVALO_MS = 900;

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const Visitantes = () => {
  const queryClient = useQueryClient();
  const [showCadastro, setShowCadastro] = useState(false);
  const [showBioAccess, setShowBioAccess] = useState(false);
  const [showCadCivil, setShowCadCivil] = useState(false);
  const [showCadExterno, setShowCadExterno] = useState(false);
  const [detalhes, setDetalhes] = useState<ApiVisitante | null>(null);
  const [filtroData, setFiltroData] = useState("");

  // ===== Form de registro de entrada =====
  const [modo, setModo] = useState<Modo>("civil");
  const [buscaCpf, setBuscaCpf] = useState("");
  const [buscaRg, setBuscaRg] = useState("");
  const [civilSel, setCivilSel] = useState<ApiVisitanteCivil | null>(null);
  const [externoSel, setExternoSel] = useState<ApiMilitarExterno | null>(null);
  const [destino, setDestino] = useState("");
  const [obsEntrada, setObsEntrada] = useState("");
  const [origemId, setOrigemId] = useState<"cpf" | "rg" | "manual" | "biometria">("cpf");

  // Avulso (manual)
  const [avulsoNome, setAvulsoNome] = useState("");
  const [avulsoDoc, setAvulsoDoc] = useState("");
  const [avulsoTel, setAvulsoTel] = useState("");

  // ===== Cadastro Civil =====
  const [novoCivil, setNovoCivil] = useState({
    nome: "", cpf: "", rg: "", telefone: "", empresa: "", observacoes: "",
  });

  // ===== Cadastro Militar Externo =====
  const [novoExterno, setNovoExterno] = useState({
    nome: "", cpf: "", posto_graduacao: "", forca_militar: "", telefone: "",
  });
  const [showBioCadastro, setShowBioCadastro] = useState(false);
  const [faseBio, setFaseBio] = useState<FaseBio>("intro");
  const [leituras, setLeituras] = useState(0);
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef<number | null>(null);

  // ===== Acesso por biometria =====
  const [bioAcessoFase, setBioAcessoFase] = useState<"scan" | "identificado">("scan");
  const [bioIdentificado, setBioIdentificado] = useState<ApiMilitarExterno | null>(null);
  const [bioDestino, setBioDestino] = useState("");
  const [bioConfirmado, setBioConfirmado] = useState<{ militar: ApiMilitarExterno; hora: string } | null>(null);

  const { data: visitantes = [], isLoading } = useQuery({
    queryKey: ["visitantes"], queryFn: api.listVisitantes, ...SYNC_OPTIONS,
  });
  const { data: civis = [] } = useQuery({
    queryKey: ["visitantes-civis"], queryFn: api.listCivis, ...SYNC_OPTIONS,
  });
  const { data: externos = [] } = useQuery({
    queryKey: ["militares-externos"], queryFn: api.listExternos, ...SYNC_OPTIONS,
  });

  function clearTimer() {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }
  useEffect(() => () => clearTimer(), []);

  function resetEntrada() {
    setBuscaCpf(""); setBuscaRg(""); setCivilSel(null); setExternoSel(null);
    setDestino(""); setObsEntrada(""); setAvulsoNome(""); setAvulsoDoc(""); setAvulsoTel("");
    setOrigemId("cpf");
  }

  // ===== Buscas =====
  async function buscarCivil() {
    const cpf = onlyDigits(buscaCpf);
    const rg = buscaRg.trim();
    if (!cpf && !rg) {
      toast({ title: "Informe CPF ou RG", variant: "destructive" }); return;
    }
    let found: ApiVisitanteCivil | null = null;
    if (cpf) { found = await api.getCivilByCpf(cpf); if (found) setOrigemId("cpf"); }
    if (!found && rg) { found = await api.getCivilByRg(rg); if (found) setOrigemId("rg"); }
    if (found) {
      setCivilSel(found);
      toast({ title: "Visitante identificado", description: found.nome });
    } else {
      setCivilSel(null);
      toast({
        title: "Não cadastrado",
        description: "Use 'Cadastrar Civil' abaixo para registrar permanentemente.",
      });
    }
  }

  async function buscarExterno() {
    const cpf = onlyDigits(buscaCpf);
    if (!cpf) { toast({ title: "Informe CPF", variant: "destructive" }); return; }
    const found = await api.getExternoByCpf(cpf);
    if (found) {
      setExternoSel(found);
      setOrigemId("cpf");
      toast({ title: "Militar identificado", description: found.nome });
    } else {
      setExternoSel(null);
      toast({ title: "Não cadastrado", description: "Use 'Cadastrar Militar Externo'." });
    }
  }

  // ===== Mutations de entrada =====
  const entradaCivilMutation = useMutation({
    mutationFn: async () => {
      if (!civilSel) throw new Error("Selecione o civil");
      if (!destino) throw new Error("Informe o destino");
      await api.createVisitante({
        nome: civilSel.nome,
        documento: civilSel.cpf || civilSel.rg || "—",
        militar_responsavel: "",
        local_destino: destino,
        observacoes: obsEntrada || null,
        cabo_registro: getCaboOnDuty(),
        cpf: civilSel.cpf,
        rg: civilSel.rg,
        telefone: civilSel.telefone,
        organizacao: civilSel.empresa,
        civil_id: civilSel.id,
        tipo: "civil",
        origem_identificacao: origemId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitantes"] });
      showOperationConfirm({ nome: civilSel!.nome, acao: "entrou no quartel", variant: "visitante" });
      setShowCadastro(false); resetEntrada();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const entradaExternoMutation = useMutation({
    mutationFn: async () => {
      if (!externoSel) throw new Error("Selecione o militar externo");
      if (!destino) throw new Error("Informe o destino");
      await api.createVisitante({
        nome: externoSel.nome,
        documento: externoSel.cpf || "—",
        militar_responsavel: "",
        local_destino: destino,
        observacoes: obsEntrada || null,
        cabo_registro: getCaboOnDuty(),
        cpf: externoSel.cpf,
        telefone: externoSel.telefone,
        organizacao: externoSel.forca_militar,
        forca_militar: externoSel.forca_militar,
        posto_graduacao: externoSel.posto_graduacao,
        militar_externo_id: externoSel.id,
        tipo: "militar_externo",
        origem_identificacao: origemId,
      });
    },
    onSuccess: () => {
      const nome = `${externoSel?.posto_graduacao || ""} ${externoSel?.nome || ""}`.trim();
      queryClient.invalidateQueries({ queryKey: ["visitantes"] });
      showOperationConfirm({ nome, acao: "entrou no quartel", variant: "visitante" });
      setShowCadastro(false); resetEntrada();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const entradaAvulsoMutation = useMutation({
    mutationFn: async () => {
      if (!avulsoNome || !avulsoDoc || !destino) throw new Error("Preencha nome, documento e destino");
      await api.createVisitante({
        nome: avulsoNome,
        documento: avulsoDoc,
        militar_responsavel: "",
        local_destino: destino,
        observacoes: obsEntrada || null,
        cabo_registro: getCaboOnDuty(),
        telefone: avulsoTel || null,
        tipo: "comum",
        origem_identificacao: "manual",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitantes"] });
      showOperationConfirm({ nome: avulsoNome, acao: "entrou no quartel", variant: "visitante" });
      setShowCadastro(false); resetEntrada();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // ===== Cadastros permanentes =====
  const cadastrarCivilMutation = useMutation({
    mutationFn: async () => {
      if (!novoCivil.nome || !novoCivil.cpf) throw new Error("Nome e CPF obrigatórios");
      await api.createCivil({
        nome: novoCivil.nome,
        cpf: onlyDigits(novoCivil.cpf),
        rg: novoCivil.rg || null,
        telefone: novoCivil.telefone || null,
        empresa: novoCivil.empresa || null,
        observacoes: novoCivil.observacoes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitantes-civis"] });
      toast({ title: "Civil cadastrado" });
      setShowCadCivil(false);
      setNovoCivil({ nome: "", cpf: "", rg: "", telefone: "", empresa: "", observacoes: "" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const cadastrarExternoMutation = useMutation({
    mutationFn: async () => {
      await api.createExterno({
        nome: novoExterno.nome,
        cpf: onlyDigits(novoExterno.cpf),
        posto_graduacao: novoExterno.posto_graduacao || null,
        forca_militar: novoExterno.forca_militar || null,
        telefone: novoExterno.telefone || null,
        biometria_template: JSON.stringify({
          leituras: TOTAL_LEITURAS,
          capturadoEm: new Date().toISOString(),
        }),
        biometria_leituras: TOTAL_LEITURAS,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["militares-externos"] });
      toast({ title: "Militar externo cadastrado", description: "Biometria armazenada." });
      setShowBioCadastro(false); setShowCadExterno(false);
      setNovoExterno({ nome: "", cpf: "", posto_graduacao: "", forca_militar: "", telefone: "" });
      setFaseBio("intro"); setLeituras(0);
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setShowBioCadastro(false); setFaseBio("intro"); setLeituras(0);
    },
  });

  function iniciarCadastroExterno() {
    if (!novoExterno.nome || !novoExterno.cpf || !novoExterno.forca_militar) {
      toast({ title: "Preencha nome, CPF e força", variant: "destructive" }); return;
    }
    setFaseBio("intro"); setLeituras(0); setShowBioCadastro(true);
  }

  function iniciarColetas() {
    setFaseBio("coletando"); setLeituras(0);
    let count = 0;
    timerRef.current = window.setInterval(() => {
      setPulse(true); window.setTimeout(() => setPulse(false), 300);
      count += 1; setLeituras(count);
      if (count >= TOTAL_LEITURAS) {
        clearTimer();
        window.setTimeout(() => {
          setFaseBio("sucesso");
          cadastrarExternoMutation.mutate();
        }, 350);
      }
    }, INTERVALO_MS);
  }

  // ===== Acesso biométrico =====
  const acessoBioMutation = useMutation({
    mutationFn: async () => {
      if (!bioIdentificado) throw new Error("Nenhum militar identificado");
      const dst = bioDestino || "Manutenção / Apoio técnico";
      await api.createVisitante({
        nome: bioIdentificado.nome,
        documento: bioIdentificado.cpf || "—",
        militar_responsavel: "",
        local_destino: dst,
        cabo_registro: getCaboOnDuty(),
        cpf: bioIdentificado.cpf,
        telefone: bioIdentificado.telefone,
        organizacao: bioIdentificado.forca_militar,
        forca_militar: bioIdentificado.forca_militar,
        posto_graduacao: bioIdentificado.posto_graduacao,
        militar_externo_id: bioIdentificado.id,
        tipo: "militar_externo",
        origem_identificacao: "biometria",
      });
      return bioIdentificado;
    },
    onSuccess: (m) => {
      queryClient.invalidateQueries({ queryKey: ["visitantes"] });
      setBioConfirmado({ militar: m, hora: new Date().toLocaleString("pt-BR") });
      setShowBioAccess(false); setBioAcessoFase("scan"); setBioIdentificado(null); setBioDestino("");
      window.setTimeout(() => setBioConfirmado(null), 5000);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  function simularIdentificacao(m: ApiMilitarExterno) {
    setBioIdentificado(m); setBioAcessoFase("identificado");
  }

  const presentes = visitantes.filter((v) => !v.hora_saida);
  const historico = filtroData
    ? visitantes.filter((v) => v.hora_entrada.startsWith(filtroData))
    : visitantes;

  return (
    <div>
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
            {civis.length} civis · {externos.length} militares externos cadastrados
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowCadCivil(true)} className="gap-2">
            <UserPlus className="w-4 h-4" /> Cadastrar Civil
          </Button>
          <Button variant="outline" onClick={() => setShowCadExterno(true)} className="gap-2">
            <Shield className="w-4 h-4" /> Cadastrar Militar Externo
          </Button>
          <Button
            variant="outline"
            onClick={() => { setShowBioAccess(true); setBioAcessoFase("scan"); setBioIdentificado(null); }}
            className="gap-2"
            disabled={externos.length === 0}
            title={externos.length === 0 ? "Nenhum militar externo cadastrado" : "Acesso por biometria"}
          >
            <Fingerprint className="w-4 h-4" /> Acesso por Biometria
          </Button>
          <Button onClick={() => { resetEntrada(); setModo("civil"); setShowCadastro(true); }} className="gap-2">
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
            rows={presentes} isLoading={isLoading}
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
            {filtroData && <Button size="sm" variant="outline" onClick={() => setFiltroData("")}>Limpar</Button>}
          </div>
          <VisitantesTable
            rows={historico} isLoading={isLoading}
            onSaida={(v) => api.saidaVisitante(v.id).then(() => {
              queryClient.invalidateQueries({ queryKey: ["visitantes"] });
              showOperationConfirm({ nome: v.nome, acao: "saiu do quartel", variant: "visitante" });
            })}
            onDetalhes={setDetalhes}
          />
        </TabsContent>
      </Tabs>

      {/* ============ Registrar Entrada ============ */}
      <Dialog open={showCadastro} onOpenChange={(v) => { setShowCadastro(v); if (!v) resetEntrada(); }}>
        <DialogContent className="bg-card border-border max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Registrar Entrada</DialogTitle>
            <DialogDescription>Identifique o visitante e registre o acesso.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <RadioGroup
              value={modo}
              onValueChange={(v) => { setModo(v as Modo); setCivilSel(null); setExternoSel(null); }}
              className="grid grid-cols-3 gap-2"
            >
              <ModoCard active={modo === "civil"} value="civil" icon={<IdCard className="w-3.5 h-3.5" />} label="Civil" sub="CPF / RG" />
              <ModoCard active={modo === "militar_externo"} value="militar_externo" icon={<Shield className="w-3.5 h-3.5" />} label="Militar Externo" sub="CPF + Biometria" />
              <ModoCard active={modo === "avulso"} value="avulso" icon={<Plus className="w-3.5 h-3.5" />} label="Avulso" sub="Sem cadastro" />
            </RadioGroup>

            {modo === "civil" && (
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <Field label="CPF" value={buscaCpf} onChange={(v) => setBuscaCpf(onlyDigits(v).slice(0, 11))} placeholder="00000000000" />
                  <Field label="OU RG" value={buscaRg} onChange={setBuscaRg} placeholder="RG" />
                  <Button onClick={buscarCivil} variant="outline" className="gap-2"><Search className="w-4 h-4" /> Buscar</Button>
                </div>
                {civilSel ? (
                  <div className="rounded-md border border-status-available/40 bg-status-available/5 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-mono text-status-available">
                      <CheckCircle2 className="w-3.5 h-3.5" /> IDENTIFICADO ({origemId.toUpperCase()})
                    </div>
                    <Row k="Nome" v={civilSel.nome} />
                    <Row k="CPF" v={civilSel.cpf || "—"} />
                    <Row k="RG" v={civilSel.rg || "—"} />
                    <Row k="Telefone" v={civilSel.telefone || "—"} />
                    <Row k="Empresa" v={civilSel.empresa || "—"} />
                  </div>
                ) : (
                  <p className="text-xs font-mono text-muted-foreground">
                    Digite CPF ou RG e clique em buscar. Visitantes não cadastrados podem ser registrados via "Cadastrar Civil".
                  </p>
                )}
                <Field label="DESTINO *" value={destino} onChange={setDestino} placeholder="Local de destino" />
                <Field label="OBSERVAÇÕES" value={obsEntrada} onChange={setObsEntrada} placeholder="Opcional" />
                <Button
                  onClick={() => entradaCivilMutation.mutate()}
                  disabled={!civilSel || !destino || entradaCivilMutation.isPending}
                  className="w-full gap-2"
                ><ShieldCheck className="w-4 h-4" /> Registrar Entrada</Button>
              </div>
            )}

            {modo === "militar_externo" && (
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  <Field label="CPF" value={buscaCpf} onChange={(v) => setBuscaCpf(onlyDigits(v).slice(0, 11))} placeholder="00000000000" />
                  <Button onClick={buscarExterno} variant="outline" className="gap-2"><Search className="w-4 h-4" /> Buscar</Button>
                </div>
                {externoSel ? (
                  <div className="rounded-md border border-status-available/40 bg-status-available/5 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-mono text-status-available">
                      <CheckCircle2 className="w-3.5 h-3.5" /> IDENTIFICADO (CPF)
                    </div>
                    <Row k="Nome" v={`${externoSel.posto_graduacao || ""} ${externoSel.nome}`.trim()} />
                    <Row k="Força" v={externoSel.forca_militar || "—"} />
                    <Row k="CPF" v={externoSel.cpf || "—"} />
                    <Row k="Telefone" v={externoSel.telefone || "—"} />
                    <Row k="Biometria" v={externoSel.biometria_leituras > 0 ? "Cadastrada" : "Não cadastrada"} />
                  </div>
                ) : (
                  <p className="text-xs font-mono text-muted-foreground">
                    Digite o CPF do militar. Para primeiro acesso use "Cadastrar Militar Externo".
                  </p>
                )}
                <Field label="DESTINO *" value={destino} onChange={setDestino} placeholder="Local de destino" />
                <Field label="OBSERVAÇÕES" value={obsEntrada} onChange={setObsEntrada} placeholder="Opcional" />
                <Button
                  onClick={() => entradaExternoMutation.mutate()}
                  disabled={!externoSel || !destino || entradaExternoMutation.isPending}
                  className="w-full gap-2"
                ><ShieldCheck className="w-4 h-4" /> Registrar Entrada</Button>
              </div>
            )}

            {modo === "avulso" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="NOME COMPLETO *" value={avulsoNome} onChange={setAvulsoNome} placeholder="Nome do visitante" />
                  <Field label="DOCUMENTO *" value={avulsoDoc} onChange={setAvulsoDoc} placeholder="RG ou CPF" />
                  <Field label="TELEFONE / NÚMERO" value={avulsoTel} onChange={setAvulsoTel} placeholder="(Opcional)" />
                  <Field label="DESTINO *" value={destino} onChange={setDestino} placeholder="Local de destino" />
                </div>
                <Field label="OBSERVAÇÕES" value={obsEntrada} onChange={setObsEntrada} placeholder="Opcional" />
                <Button
                  onClick={() => entradaAvulsoMutation.mutate()}
                  disabled={entradaAvulsoMutation.isPending}
                  className="w-full gap-2"
                ><ShieldCheck className="w-4 h-4" /> Registrar Entrada</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Cadastro Civil ============ */}
      <Dialog open={showCadCivil} onOpenChange={setShowCadCivil}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Cadastrar Civil</DialogTitle>
            <DialogDescription>Cadastro permanente. Será identificado automaticamente em visitas futuras.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Field label="NOME COMPLETO *" value={novoCivil.nome} onChange={(v) => setNovoCivil({ ...novoCivil, nome: v })} placeholder="Nome" />
            <Field label="CPF *" value={novoCivil.cpf} onChange={(v) => setNovoCivil({ ...novoCivil, cpf: onlyDigits(v).slice(0, 11) })} placeholder="00000000000" />
            <Field label="RG" value={novoCivil.rg} onChange={(v) => setNovoCivil({ ...novoCivil, rg: v })} placeholder="RG" />
            <Field label="TELEFONE" value={novoCivil.telefone} onChange={(v) => setNovoCivil({ ...novoCivil, telefone: v })} placeholder="(Opcional)" />
            <div className="col-span-2"><Field label="EMPRESA" value={novoCivil.empresa} onChange={(v) => setNovoCivil({ ...novoCivil, empresa: v })} placeholder="(Opcional)" /></div>
            <div className="col-span-2"><Field label="OBSERVAÇÕES" value={novoCivil.observacoes} onChange={(v) => setNovoCivil({ ...novoCivil, observacoes: v })} placeholder="(Opcional)" /></div>
          </div>
          <Button onClick={() => cadastrarCivilMutation.mutate()} disabled={cadastrarCivilMutation.isPending} className="w-full mt-3 gap-2">
            <UserPlus className="w-4 h-4" /> Salvar Cadastro
          </Button>
        </DialogContent>
      </Dialog>

      {/* ============ Cadastro Militar Externo ============ */}
      <Dialog open={showCadExterno} onOpenChange={setShowCadExterno}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Cadastrar Militar Externo</DialogTitle>
            <DialogDescription>Cadastro permanente com biometria. Identificado por CPF ou biometria.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Field label="NOME COMPLETO *" value={novoExterno.nome} onChange={(v) => setNovoExterno({ ...novoExterno, nome: v })} placeholder="Nome" />
            <Field label="CPF *" value={novoExterno.cpf} onChange={(v) => setNovoExterno({ ...novoExterno, cpf: onlyDigits(v).slice(0, 11) })} placeholder="00000000000" />
            <Field label="POSTO / GRADUAÇÃO" value={novoExterno.posto_graduacao} onChange={(v) => setNovoExterno({ ...novoExterno, posto_graduacao: v })} placeholder="Ex.: Cap, Sgt" />
            <Field label="FORÇA MILITAR *" value={novoExterno.forca_militar} onChange={(v) => setNovoExterno({ ...novoExterno, forca_militar: v })} placeholder="Ex.: Exército - 5º BIS" />
            <div className="col-span-2"><Field label="TELEFONE" value={novoExterno.telefone} onChange={(v) => setNovoExterno({ ...novoExterno, telefone: v })} placeholder="(Opcional)" /></div>
          </div>
          <Button onClick={iniciarCadastroExterno} className="w-full mt-3 gap-2">
            <Fingerprint className="w-4 h-4" /> Cadastrar e coletar biometria
          </Button>
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
              {novoExterno.nome} · {novoExterno.forca_militar}
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
              <p className="text-base font-semibold">Cadastro concluído.</p>
              {cadastrarExternoMutation.isPending && (
                <p className="text-xs font-mono text-muted-foreground">Salvando...</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ Acesso por Biometria ============ */}
      <Dialog open={showBioAccess} onOpenChange={(v) => { setShowBioAccess(v); if (!v) { setBioAcessoFase("scan"); setBioIdentificado(null); setBioDestino(""); } }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono tracking-widest text-sm">
              <Fingerprint className="w-4 h-4 text-primary" /> ACESSO POR BIOMETRIA
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              IDENTIFIQUE O MILITAR EXTERNO
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
                  const m = externos.find((x) => String(x.id) === id);
                  if (m) simularIdentificacao(m);
                }}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione o militar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {externos.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.posto_graduacao ? `${m.posto_graduacao} ` : ""}{m.nome} {m.forca_militar ? `· ${m.forca_militar}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Quando o leitor físico for integrado, esta etapa será automática.
                </p>
              </div>
            </div>
          )}

          {bioAcessoFase === "identificado" && bioIdentificado && (
            <div className="space-y-4 py-2 animate-scale-in">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full border-2 border-status-available bg-status-available/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-status-available" />
                </div>
                <p className="text-xs font-mono tracking-widest text-status-available">MILITAR IDENTIFICADO</p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm space-y-1.5">
                <Row k="Nome" v={`${bioIdentificado.posto_graduacao || ""} ${bioIdentificado.nome}`.trim()} />
                <Row k="Força" v={bioIdentificado.forca_militar || "—"} />
                <Row k="CPF" v={bioIdentificado.cpf || "—"} />
                <Row k="Telefone" v={bioIdentificado.telefone || "—"} />
              </div>
              <div>
                <Label className="text-xs font-mono text-muted-foreground mb-1.5 block">DESTINO</Label>
                <Input
                  value={bioDestino}
                  onChange={(e) => setBioDestino(e.target.value)}
                  placeholder="Manutenção / Apoio técnico"
                  className="bg-secondary border-border"
                />
              </div>
              <Button
                onClick={() => acessoBioMutation.mutate()}
                className="w-full gap-2"
                disabled={acessoBioMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar Entrada
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ Modal grande de confirmação biométrica ============ */}
      <Dialog open={!!bioConfirmado} onOpenChange={(o) => !o && setBioConfirmado(null)}>
        <DialogContent className="bg-card border-status-available max-w-lg">
          <div className="text-center py-6 space-y-4 animate-scale-in">
            <div className="w-24 h-24 mx-auto rounded-full border-4 border-status-available bg-status-available/10 flex items-center justify-center">
              <CheckCircle2 className="w-14 h-14 text-status-available" />
            </div>
            <div className="text-3xl font-bold tracking-wider text-status-available">ACESSO CONFIRMADO</div>
            {bioConfirmado && (
              <>
                <div className="text-2xl font-bold">
                  {bioConfirmado.militar.posto_graduacao} {bioConfirmado.militar.nome}
                </div>
                <div className="text-base text-muted-foreground">{bioConfirmado.militar.forca_militar}</div>
                <div className="text-sm font-mono text-muted-foreground pt-2 border-t border-border">{bioConfirmado.hora}</div>
              </>
            )}
          </div>
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
              <Row k="Tipo" v={tipoLabel(detalhes.tipo)} />
              <Row k="Nome" v={detalhes.nome} />
              {detalhes.posto_graduacao && <Row k="Posto" v={detalhes.posto_graduacao} />}
              {detalhes.forca_militar && <Row k="Força" v={detalhes.forca_militar} />}
              <Row k="Documento" v={detalhes.documento} />
              {detalhes.organizacao && <Row k="Organização" v={detalhes.organizacao} />}
              {detalhes.cpf && <Row k="CPF" v={detalhes.cpf} />}
              {detalhes.rg && <Row k="RG" v={detalhes.rg} />}
              {detalhes.telefone && <Row k="Telefone" v={detalhes.telefone} />}
              <Row k="Destino" v={detalhes.local_destino} />
              <Row k="Origem" v={(detalhes.origem_identificacao || "manual").toUpperCase()} />
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

function tipoLabel(t?: string) {
  if (t === "civil") return "Civil";
  if (t === "militar_externo") return "Militar Externo";
  if (t === "recorrente") return "Recorrente (legado)";
  return "Comum";
}

const ModoCard = ({ active, value, icon, label, sub }: { active: boolean; value: string; icon: React.ReactNode; label: string; sub: string }) => (
  <label className={`flex items-start gap-2 rounded-md border p-3 cursor-pointer transition ${active ? "border-primary bg-primary/5" : "border-border"}`}>
    <RadioGroupItem value={value} className="mt-0.5" />
    <div>
      <div className="text-sm font-semibold flex items-center gap-1">{icon} {label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  </label>
);

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
          <TableHead className="text-xs font-mono">TELEFONE</TableHead>
          <TableHead className="text-xs font-mono">DESTINO</TableHead>
          <TableHead className="text-xs font-mono">ORIGEM</TableHead>
          <TableHead className="text-xs font-mono">ENTRADA</TableHead>
          <TableHead className="text-xs font-mono">SAÍDA</TableHead>
          <TableHead className="text-xs font-mono">AÇÃO</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
        ) : rows.length === 0 ? (
          <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
        ) : rows.map((v) => (
          <TableRow key={v.id} className="hover:bg-secondary/30">
            <TableCell>
              {v.tipo === "militar_externo" ? (
                <Badge className="bg-primary/20 text-primary border-0 gap-1"><Shield className="w-3 h-3" />MIL</Badge>
              ) : v.tipo === "civil" ? (
                <Badge className="bg-status-available/20 text-status-available border-0 gap-1"><IdCard className="w-3 h-3" />CIV</Badge>
              ) : v.tipo === "recorrente" ? (
                <Badge className="bg-primary/20 text-primary border-0 gap-1"><Fingerprint className="w-3 h-3" />REC</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">COMUM</Badge>
              )}
            </TableCell>
            <TableCell className="text-sm font-medium">
              {v.posto_graduacao ? `${v.posto_graduacao} ` : ""}{v.nome}
            </TableCell>
            <TableCell className="text-xs font-mono text-muted-foreground">
              {v.organizacao || v.forca_militar || v.documento}
            </TableCell>
            <TableCell className="text-xs font-mono text-muted-foreground">{v.telefone || "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{v.local_destino}</TableCell>
            <TableCell className="text-xs font-mono">
              {(v.origem_identificacao || "manual").toUpperCase()}
            </TableCell>
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
