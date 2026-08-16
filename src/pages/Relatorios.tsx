// SISTOLDA — Painel administrativo: relatórios sob demanda e backups
import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText, PlayCircle, CheckCircle2, AlertTriangle, Calendar, Database, Download, Eye, Server, Network, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiBackupArquivo, SYNC_OPTIONS } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

function todayIso() {
  const d = new Date(); const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function brDateTime(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Relatorios() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<string>(todayIso());
  const [last, setLast] = useState<{ ok: boolean; msg: string } | null>(null);

  const { data: backupsData, isLoading: loadingBackups } = useQuery({
    queryKey: ["backups"],
    queryFn: api.listBackups,
    ...SYNC_OPTIONS,
  });

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

  const downloadBackup = async (arquivo: ApiBackupArquivo) => {
    try {
      toast({ title: "Iniciando download", description: arquivo.nome });
      const blob = await api.fetchBackupBlob(arquivo.caminho);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = arquivo.nome;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      toast({ title: "Erro no download", description: e.message, variant: "destructive" });
    }
  };

  const visualizarBackup = async (arquivo: ApiBackupArquivo) => {
    try {
      const blob = await api.fetchBackupBlob(arquivo.caminho, true);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e: any) {
      toast({ title: "Erro ao visualizar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-wide">RELATÓRIOS E BACKUPS</h1>
          <p className="text-xs font-mono text-muted-foreground tracking-widest">
            ADMINISTRAÇÃO · GERAÇÃO E VISUALIZAÇÃO
          </p>
        </div>
      </div>

      <Tabs defaultValue="geracao" className="w-full">
        <TabsList className="bg-secondary/50 border border-border">
          <TabsTrigger value="geracao" className="gap-2">
            <PlayCircle className="w-4 h-4" /> Geração Manual
          </TabsTrigger>
          <TabsTrigger value="backups" className="gap-2">
            <Database className="w-4 h-4" /> Backups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geracao" className="mt-4">
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
                    className="bg-secondary border-border"
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
                <p>• Destino: Servidor Local e caminhos de rede configurados.</p>
                <p>• Em caso de falha de rede, o backup local é priorizado.</p>
                <p>• Cada execução fica registrada no módulo Auditoria.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backups" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-sm font-mono tracking-widest text-muted-foreground">
                  HISTÓRICO DE BACKUPS
                </CardTitle>
                <div className="flex gap-2 items-center flex-wrap">
                  {backupsData?.bases.map(b => (
                    <Badge key={b.key} variant="outline" className="font-mono text-[10px] gap-1 px-2">
                      {b.key === 'local' ? <Server className="w-3 h-3" /> : <Network className="w-3 h-3" />}
                      {b.label}: {b.caminho || "indisponível"}
                    </Badge>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={executarBackup.isPending}
                    onClick={() => executarBackup.mutate()}
                  >
                    <PlayCircle className="w-4 h-4" />
                    {executarBackup.isPending ? "Executando..." : "Executar backup agora (teste)"}
                  </Button>
                </div>
              </div>
              {resultadoBackup.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {resultadoBackup.map(d => (
                    <Badge
                      key={d.key}
                      variant="outline"
                      className={`font-mono text-[10px] gap-1 px-2 ${d.ok ? "text-status-available border-status-available/50" : "text-destructive border-destructive/50"}`}
                    >
                      {d.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {d.label}: {d.ok ? "SUCESSO" : `ERRO — ${d.error}`}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent>
              {loadingBackups ? (
                <div className="py-10 text-center font-mono text-sm text-muted-foreground animate-pulse">
                  Carregando lista de arquivos...
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-secondary/30">
                      <TableRow>
                        <TableHead className="w-[300px]">Backup</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backupsData?.arquivos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            Nenhum arquivo de backup encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        backupsData?.arquivos.map((arq, idx) => (
                          <TableRow key={`${arq.origem}-${arq.caminho}-${idx}`}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="truncate max-w-[280px]" title={arq.nome}>{arq.nome}</span>
                                <span className="text-[10px] text-muted-foreground font-mono uppercase">
                                  {arq.categoria} · {formatSize(arq.tamanho)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {brDateTime(arq.modificado_em)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] uppercase">
                                {arq.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                                {arq.origem === "local" ? <Server className="w-3 h-3" /> : <Network className="w-3 h-3" />}
                                {arq.origem_label}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary"
                                  title="Visualizar"
                                  onClick={() => visualizarBackup(arq)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary"
                                  title="Baixar"
                                  onClick={() => downloadBackup(arq)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}