import { useState } from "react";
import { Fingerprint, Trash2, ShieldCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDb, uid } from "@/lib/localDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export interface BiometriaRecord {
  id: string;
  identificacao: string;
  nip: string;
  template: string | null;
  leituras: number;
  status: "ativa" | "inativa";
  data_cadastro: string;
}

const TOTAL_LEITURAS = 5;

const Biometria = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [identificacao, setIdentificacao] = useState("");
  const [nip, setNip] = useState("");
  const [capturando, setCapturando] = useState(false);
  const [leiturasFeitas, setLeiturasFeitas] = useState(0);

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: registros = [] } = useQuery({
    queryKey: ["biometrias"],
    queryFn: async () =>
      localDb
        .list<BiometriaRecord>("biometrias" as any)
        .sort((a, b) => (b.data_cadastro || "").localeCompare(a.data_cadastro || "")),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const exists = localDb
        .list<BiometriaRecord>("biometrias" as any)
        .some((b) => b.nip === nip.trim() && b.status === "ativa");
      if (exists) throw new Error("Já existe biometria ativa para este NIP");

      // Estrutura preparada para futura integração com leitor biométrico físico.
      // Neste momento, simulamos a captura de 5 leituras da digital.
      const template = JSON.stringify({
        leituras: TOTAL_LEITURAS,
        capturadoEm: new Date().toISOString(),
        // placeholder — futuro hardware preencherá com hash do template
        hash: null,
      });

      localDb.insert<BiometriaRecord>("biometrias" as any, {
        id: uid(),
        identificacao: identificacao.trim(),
        nip: nip.trim(),
        template,
        leituras: TOTAL_LEITURAS,
        status: "ativa",
        data_cadastro: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast({ title: "Biometria cadastrada", description: `${identificacao} (${nip})` });
      queryClient.invalidateQueries({ queryKey: ["biometrias"] });
      setIdentificacao("");
      setNip("");
      setLeiturasFeitas(0);
      setCapturando(false);
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => localDb.remove("biometrias" as any, id),
    onSuccess: () => {
      toast({ title: "Biometria removida" });
      queryClient.invalidateQueries({ queryKey: ["biometrias"] });
    },
  });

  function handleCadastrar() {
    if (!identificacao.trim()) {
      toast({ title: "Informe a identificação do militar", variant: "destructive" });
      return;
    }
    if (!/^\d{8}$/.test(nip.trim())) {
      toast({ title: "NIP deve ter exatamente 8 dígitos", variant: "destructive" });
      return;
    }

    // Simulação preparada para integração futura com hardware:
    // realiza 5 "leituras" sequenciais antes de gravar o template.
    setCapturando(true);
    setLeiturasFeitas(0);
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      setLeiturasFeitas(count);
      if (count >= TOTAL_LEITURAS) {
        clearInterval(interval);
        createMutation.mutate();
      }
    }, 350);
  }

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
                placeholder="Ex.: CB ÍTALO"
                value={identificacao}
                onChange={(e) => setIdentificacao(e.target.value)}
                disabled={capturando}
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
                disabled={capturando}
              />
            </div>
          </div>

          {capturando && (
            <div className="rounded-md border border-border bg-muted/30 p-3 font-mono text-xs">
              <div className="flex items-center gap-2 mb-2">
                <Fingerprint className="w-4 h-4 text-primary animate-pulse" />
                CAPTURANDO LEITURA {leiturasFeitas} / {TOTAL_LEITURAS}
              </div>
              <div className="h-1.5 w-full bg-border rounded overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(leiturasFeitas / TOTAL_LEITURAS) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Button onClick={handleCadastrar} disabled={capturando} className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            {capturando ? "Capturando..." : "Cadastrar Biometria"}
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
                  <TableCell className="font-mono">{r.leituras}/{TOTAL_LEITURAS}</TableCell>
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
    </div>
  );
};

export default Biometria;
