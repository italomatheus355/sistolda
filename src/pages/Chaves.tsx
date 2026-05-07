import { useState } from "react";
import { Key, History, Search, Fingerprint, RotateCcw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDb, getCaboOnDuty, Chave, HistoricoChave, uid } from "@/lib/localDb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

// Simulação de identificação por NIP (substituir por integração biométrica futura)
function identificarMilitarPorNip(nip: string): string {
  const trimmed = nip.trim();
  if (!trimmed) return "";
  // Mock: retorna nome simulado a partir do NIP
  return `Sgt Fulano [NIP ${trimmed}]`;
}

const Chaves = () => {
  const queryClient = useQueryClient();
  const [selectedChave, setSelectedChave] = useState<Chave | null>(null);
  const [dialogType, setDialogType] = useState<"retirada" | "devolucao" | null>(null);
  const [nip, setNip] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: chaves = [], isLoading } = useQuery({
    queryKey: ["chaves"],
    queryFn: async () => localDb.list<Chave>("chaves").sort((a, b) => a.numero - b.numero),
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["historico_chaves"],
    queryFn: async () =>
      localDb.list<HistoricoChave>("historico_chaves")
        .sort((a, b) => b.data_retirada.localeCompare(a.data_retirada))
        .slice(0, 100),
  });

  const retiradaMutation = useMutation({
    mutationFn: async ({ chave, militar, nipVal, cabo }: { chave: Chave; militar: string; nipVal: string; cabo: string }) => {
      localDb.update<Chave>("chaves", chave.id, {
        status: "emprestada",
        militar_responsavel: `${militar}`,
      });
      localDb.insert<HistoricoChave>("historico_chaves", {
        id: uid(),
        chave_id: chave.id,
        chave_numero: chave.numero,
        chave_nome: chave.nome,
        militar,
        matricula: nipVal,
        data_retirada: new Date().toISOString(),
        data_devolucao: null,
        cabo_retirada: cabo,
        cabo_devolucao: null,
        status: "em_uso",
      });
      return militar;
    },
    onSuccess: (militar) => {
      queryClient.invalidateQueries({ queryKey: ["chaves"] });
      queryClient.invalidateQueries({ queryKey: ["historico_chaves"] });
      toast({ title: "Retirada confirmada", description: `${militar} retirou a chave ${selectedChave?.nome}.` });
      setDialogType(null); setSelectedChave(null); setNip("");
    },
  });

  const devolucaoMutation = useMutation({
    mutationFn: async ({ chave, cabo }: { chave: Chave; cabo: string }) => {
      localDb.update<Chave>("chaves", chave.id, { status: "disponivel", militar_responsavel: null });
      const hist = localDb.list<HistoricoChave>("historico_chaves")
        .filter((h) => h.chave_id === chave.id && h.status === "em_uso")
        .sort((a, b) => b.data_retirada.localeCompare(a.data_retirada))[0];
      if (hist) {
        localDb.update<HistoricoChave>("historico_chaves", hist.id, {
          data_devolucao: new Date().toISOString(),
          cabo_devolucao: cabo,
          status: "devolvida",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chaves"] });
      queryClient.invalidateQueries({ queryKey: ["historico_chaves"] });
      toast({ title: "Devolução confirmada", description: `${selectedChave?.nome} devolvida.` });
      setDialogType(null); setSelectedChave(null);
    },
  });

  const handleCardClick = (chave: Chave) => {
    setSelectedChave(chave);
    setDialogType(chave.status === "disponivel" ? "retirada" : "devolucao");
    setNip("");
  };

  const handleRetirada = () => {
    if (!nip.trim()) {
      toast({ title: "Erro", description: "Informe o NIP do militar.", variant: "destructive" });
      return;
    }
    const militar = identificarMilitarPorNip(nip);
    retiradaMutation.mutate({ chave: selectedChave!, militar, nipVal: nip, cabo: getCaboOnDuty() });
  };

  const handleDevolucao = () => {
    devolucaoMutation.mutate({ chave: selectedChave!, cabo: getCaboOnDuty() });
  };

  const filtered = chaves.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.numero).includes(searchTerm)
  );

  const disponiveisCount = chaves.filter((c) => c.status === "disponivel").length;
  const emprestadas = chaves.filter((c) => c.status === "emprestada").length;

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

      <Tabs defaultValue="secretas">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="secretas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Chaves Secretas</TabsTrigger>
          <TabsTrigger value="gerais" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Chaves Gerais</TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-3.5 h-3.5 mr-1.5" /> Histórico
          </TabsTrigger>
        </TabsList>

        {(["secretas", "gerais"] as const).map((tab) => {
          const cat = tab === "secretas" ? "secreta" : "geral";
          const list = filtered.filter((c) => c.categoria === cat);
          return (
            <TabsContent key={tab} value={tab}>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar chave ou número..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-secondary border-border" />
              </div>

              {isLoading ? (
                <div className="text-center text-muted-foreground py-12 font-mono text-sm">Carregando chaves...</div>
              ) : (
                <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 ${tab === "secretas" ? "p-4 rounded-lg border border-status-borrowed/30 bg-status-borrowed/5" : ""}`}>
                  {list.map((chave) => (
                    <button
                      key={chave.id}
                      onClick={() => handleCardClick(chave)}
                      className={`relative p-3 rounded-lg border transition-all duration-200 text-left hover:scale-[1.02] ${
                        chave.status === "disponivel"
                          ? "bg-card border-status-available/40 hover:border-status-available card-glow"
                          : "bg-card border-status-borrowed/40 hover:border-status-borrowed"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={chave.status === "disponivel" ? "status-dot-available" : "status-dot-borrowed"} />
                        <span className="text-base font-mono font-bold text-foreground/90 leading-none">Nº {String(chave.numero).padStart(2, "0")}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground truncate">{chave.nome}</h3>
                      {chave.militar_responsavel && (
                        <p className="text-[10px] text-status-borrowed mt-2 font-mono truncate">{chave.militar_responsavel}</p>
                      )}
                    </button>
                  ))}
                  {list.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-8 text-sm">Nenhuma chave encontrada</div>
                  )}
                </div>
              )}
            </TabsContent>
          );
        })}

        <TabsContent value="historico">
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
                {historico.map((h) => (
                  <TableRow key={h.id} className="hover:bg-secondary/30">
                    <TableCell className="text-sm font-medium">{h.chave_nome}</TableCell>
                    <TableCell className="text-sm">{h.militar}</TableCell>
                    <TableCell className="text-xs font-mono">{h.matricula || "—"}</TableCell>
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
                {historico.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">Nenhum registro</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Retirada — pequeno e simples (apenas NIP) */}
      <Dialog open={dialogType === "retirada"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-primary" /> Retirada — {selectedChave?.nome}</DialogTitle>
            <DialogDescription>Chave Nº {selectedChave?.numero}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NIP</label>
              <Input
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRetirada()}
                placeholder="Digite o NIP"
                className="bg-secondary border-border"
                autoFocus
              />
            </div>
            <Button className="w-full gap-2" variant="outline" disabled>
              <Fingerprint className="w-4 h-4" /> Coletar biometria
            </Button>
            <Button onClick={handleRetirada} className="w-full" disabled={retiradaMutation.isPending}>
              {retiradaMutation.isPending ? "Registrando..." : "Confirmar retirada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Devolução — Cabo Auxiliar de Serviço + biometria */}
      <Dialog open={dialogType === "devolucao"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Devolução — {selectedChave?.nome}</DialogTitle>
            <DialogDescription>Em uso por {selectedChave?.militar_responsavel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="p-3 rounded-md bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground font-mono">CABO AUXILIAR DE SERVIÇO</p>
              <p className="text-sm font-semibold text-foreground mt-1">{getCaboOnDuty()}</p>
            </div>
            <Button className="w-full gap-2" variant="outline" disabled>
              <Fingerprint className="w-4 h-4" /> Coletar biometria
            </Button>
            <Button onClick={handleDevolucao} className="w-full" disabled={devolucaoMutation.isPending}>
              {devolucaoMutation.isPending ? "Registrando..." : "Confirmar devolução"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chaves;
