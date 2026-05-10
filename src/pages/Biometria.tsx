import { useEffect, useRef, useState } from "react";
import { Fingerprint, Trash2, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDb, uid, BiometriaRecord } from "@/lib/localDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const TOTAL_LEITURAS = 5;
const INTERVALO_MS = 1100;

type Fase = "intro" | "coletando" | "sucesso";

const Biometria = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [identificacao, setIdentificacao] = useState("");
  const [nip, setNip] = useState("");

  const [open, setOpen] = useState(false);
  const [fase, setFase] = useState<Fase>("intro");
  const [leituras, setLeituras] = useState(0);
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef<number | null>(null);

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: registros = [] } = useQuery({
    queryKey: ["biometrias"],
    queryFn: async () =>
      localDb
        .list<BiometriaRecord>("biometrias")
        .sort((a, b) => (b.data_cadastro || "").localeCompare(a.data_cadastro || "")),
  });

  function clearTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => () => clearTimer(), []);

  function resetarFluxo() {
    clearTimer();
    setFase("intro");
    setLeituras(0);
    setPulse(false);
  }

  function iniciarCadastro() {
    if (!identificacao.trim()) {
      toast({ title: "Informe a identificação do militar", variant: "destructive" });
      return;
    }
    if (!/^\d{8}$/.test(nip.trim())) {
      toast({ title: "NIP deve ter exatamente 8 dígitos", variant: "destructive" });
      return;
    }
    const exists = localDb
      .list<BiometriaRecord>("biometrias")
      .some((b) => b.nip === nip.trim() && b.status === "ativa");
    if (exists) {
      toast({
        title: "Biometria já cadastrada",
        description: `Já existe biometria ativa para o NIP ${nip.trim()}.`,
        variant: "destructive",
      });
      return;
    }
    resetarFluxo();
    setOpen(true);
  }

  function iniciarColetas() {
    setFase("coletando");
    setLeituras(0);
    let count = 0;
    timerRef.current = window.setInterval(() => {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 350);
      count += 1;
      setLeituras(count);
      if (count >= TOTAL_LEITURAS) {
        clearTimer();
        // grava ao final das 5 coletas
        const template = JSON.stringify({
          leituras: TOTAL_LEITURAS,
          capturadoEm: new Date().toISOString(),
          hash: null, // futuro hardware preencherá
        });
        localDb.insert<BiometriaRecord>("biometrias", {
          id: uid(),
          identificacao: identificacao.trim(),
          nip: nip.trim(),
          template,
          leituras: TOTAL_LEITURAS,
          status: "ativa",
          data_cadastro: new Date().toISOString(),
        });
        queryClient.invalidateQueries({ queryKey: ["biometrias"] });
        window.setTimeout(() => setFase("sucesso"), 400);
      }
    }, INTERVALO_MS);
  }

  function finalizar() {
    toast({
      title: "Biometria cadastrada",
      description: `${identificacao.trim()} (NIP ${nip.trim()})`,
    });
    setOpen(false);
    setIdentificacao("");
    setNip("");
    resetarFluxo();
  }

  const removeMutation = useMutation({
    mutationFn: async (id: string) => localDb.remove("biometrias", id),
    onSuccess: () => {
      toast({ title: "Biometria removida" });
      queryClient.invalidateQueries({ queryKey: ["biometrias"] });
    },
  });

  const progresso = (leituras / TOTAL_LEITURAS) * 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Fingerprint className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-wide">BIOMETRIA</h1>
          <p className="text-xs font-mono text-muted-foreground tracking-widest">
            CADASTRO BIOMÉTRICO DE MILITARES
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono tracking-widest text-muted-foreground">
            NOVO CADASTRO
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ident">Identificação do militar</Label>
              <Input
                id="ident"
                placeholder="Ex.: MN ÍTALO"
                value={identificacao}
                onChange={(e) => setIdentificacao(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nip">NIP (8 dígitos)</Label>
              <Input
                id="nip"
                inputMode="numeric"
                maxLength={8}
                placeholder="00000000"
                value={nip}
                onChange={(e) => setNip(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
            </div>
          </div>

          <Button onClick={iniciarCadastro} className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            Cadastrar Biometria
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono tracking-widest text-muted-foreground">
            REGISTROS ({registros.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identificação</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Leituras</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6 font-mono text-xs">
                    NENHUMA BIOMETRIA CADASTRADA
                  </TableCell>
                </TableRow>
              )}
              {registros.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.identificacao}</TableCell>
                  <TableCell className="font-mono">{r.nip}</TableCell>
                  <TableCell className="font-mono">
                    {r.leituras}/{TOTAL_LEITURAS}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "ativa" ? "default" : "secondary"}>
                      {r.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {new Date(r.data_cadastro).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMutation.mutate(r.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ============== Fluxo de coleta ============== */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v && fase === "coletando") return; // bloqueia fechar durante coleta
          setOpen(v);
          if (!v) resetarFluxo();
        }}
      >
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono tracking-widest text-sm">
              <Fingerprint className="w-4 h-4 text-primary" />
              COLETA BIOMÉTRICA
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {identificacao.trim()} · NIP {nip.trim()}
            </DialogDescription>
          </DialogHeader>

          {fase === "intro" && (
            <div className="space-y-5 py-2 animate-fade-in">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-20 h-20 rounded-full border-2 border-primary/40 flex items-center justify-center bg-primary/5">
                  <Fingerprint className="w-10 h-10 text-primary" />
                </div>
                <p className="text-sm">
                  Realize <span className="font-bold text-primary">5 coletas</span> da
                  biometria para concluir o cadastro.
                </p>
                <p className="text-xs font-mono text-muted-foreground tracking-wide">
                  POSICIONE O DEDO NO LEITOR A CADA COLETA
                </p>
              </div>
              <Button onClick={iniciarColetas} className="w-full gap-2">
                <Fingerprint className="w-4 h-4" />
                Iniciar Coleta
              </Button>
            </div>
          )}

          {fase === "coletando" && (
            <div className="space-y-5 py-2 animate-fade-in">
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`w-24 h-24 rounded-full border-2 border-primary flex items-center justify-center transition-all ${
                    pulse ? "scale-110 bg-primary/20" : "bg-primary/5"
                  }`}
                >
                  <Fingerprint
                    className={`w-12 h-12 text-primary ${pulse ? "" : "animate-pulse"}`}
                  />
                </div>
                <div className="text-center">
                  <div className="text-xs font-mono tracking-widest text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    CAPTURANDO LEITURA
                  </div>
                  <div className="text-2xl font-bold font-mono mt-1">
                    {leituras}/{TOTAL_LEITURAS}
                  </div>
                </div>
              </div>

              {/* barra de progresso */}
              <div className="h-2 w-full bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progresso}%` }}
                />
              </div>

              {/* lista de coletas */}
              <ul className="space-y-1.5 font-mono text-xs">
                {Array.from({ length: TOTAL_LEITURAS }).map((_, i) => {
                  const n = i + 1;
                  const concluida = n <= leituras;
                  const ativa = n === leituras + 1 && leituras < TOTAL_LEITURAS;
                  return (
                    <li
                      key={n}
                      className={`flex items-center gap-2 transition-colors ${
                        concluida
                          ? "text-status-available"
                          : ativa
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {concluida ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : ativa ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span className="w-3.5 h-3.5 inline-block rounded-full border border-muted-foreground/40" />
                      )}
                      {concluida
                        ? `Coleta ${n}/${TOTAL_LEITURAS} concluída`
                        : `Coleta ${n}/${TOTAL_LEITURAS}`}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {fase === "sucesso" && (
            <div className="space-y-5 py-2 text-center animate-scale-in">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full border-2 border-status-available bg-status-available/10 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-status-available" />
                </div>
                <p className="text-base font-semibold">
                  Biometria cadastrada com sucesso.
                </p>
                <div className="rounded-md border border-border bg-muted/30 px-4 py-3 w-full text-left font-mono text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">IDENTIFICAÇÃO: </span>
                    <span className="text-foreground">{identificacao.trim()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">NIP: </span>
                    <span className="text-foreground">{nip.trim()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">COLETAS: </span>
                    <span className="text-status-available">
                      {TOTAL_LEITURAS}/{TOTAL_LEITURAS}
                    </span>
                  </div>
                </div>
              </div>
              <Button onClick={finalizar} className="w-full">
                Concluir
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Biometria;
