// SISTOLDA — Painel administrativo: relatórios sob demanda
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { FileText, PlayCircle, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

function todayIso() {
  const d = new Date(); const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function Relatorios() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<string>(todayIso());
  const [last, setLast] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!isAdmin) return <Navigate to="/" replace />;

  const gerar = useMutation({
    mutationFn: () =>
      data === todayIso() ? api.gerarRelatorioHoje() : api.gerarRelatorioData(data),
    onSuccess: (r: any) => {
      const msg = `Relatório gerado em ${r?.dir || "destino"}.`;
      setLast({ ok: true, msg });
      toast({ title: "Relatório gerado", description: msg });
    },
    onError: (e: Error) => {
      setLast({ ok: false, msg: e.message });
      toast({ title: "Falha ao gerar relatório", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-wide">RELATÓRIOS OPERACIONAIS</h1>
          <p className="text-xs font-mono text-muted-foreground tracking-widest">
            ADMINISTRAÇÃO · GERAÇÃO MANUAL
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono tracking-widest text-muted-foreground">
            GERAR RELATÓRIO AGORA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Executa imediatamente a mesma rotina do agendador das 20:00. Gera PDF e XLSX,
            cria a pasta do dia caso não exista e registra auditoria.
          </p>

          <div className="grid gap-4 md:grid-cols-[200px_auto] items-end">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Data de referência
              </Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                max={todayIso()}
              />
            </div>
            <Button
              size="lg"
              onClick={() => gerar.mutate()}
              disabled={gerar.isPending}
              className="gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              {gerar.isPending ? "Gerando..." : "Gerar Relatório Agora"}
            </Button>
          </div>

          {last && (
            <div
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                last.ok
                  ? "border-status-available/40 bg-status-available/5 text-status-available"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              {last.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
              <span>{last.msg}</span>
            </div>
          )}

          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs font-mono text-muted-foreground space-y-1">
            <p>• Destino: compartilhamento de rede SMB (com fallback local automático em caso de indisponibilidade).</p>
            <p>• Em caso de falha de rede, o sistema agenda novas tentativas automaticamente.</p>
            <p>• Cada execução fica registrada no módulo Auditoria.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
