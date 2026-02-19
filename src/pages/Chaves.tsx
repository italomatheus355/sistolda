import { useState } from "react";
import { Key, History, Search, Fingerprint, RotateCcw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

interface Chave {
  id: string;
  numero: number;
  nome: string;
  departamento: string | null;
  codigo: string;
  status: string;
  militar_responsavel: string | null;
}

interface HistoricoChave {
  id: string;
  chave_nome: string;
  militar: string;
  matricula: string | null;
  data_retirada: string;
  data_devolucao: string | null;
  cabo_retirada: string | null;
  cabo_devolucao: string | null;
  status: string;
}

const getCaboOnDuty = async (): Promise<string> => {
  const { data, error } = await supabase.rpc("get_cabo_on_duty" as any);
  if (error) return "Não identificado";
  return data as string;
};

const Chaves = () => {
  const queryClient = useQueryClient();
  const [selectedChave, setSelectedChave] = useState<Chave | null>(null);
  const [dialogType, setDialogType] = useState<"retirada" | "devolucao" | null>(null);
  const [matricula, setMatricula] = useState("");
  const [nomeMilitar, setNomeMilitar] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: chaves = [], isLoading } = useQuery({
    queryKey: ["chaves"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chaves")
        .select("*")
        .order("numero");
      if (error) throw error;
      return data as Chave[];
    },
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["historico_chaves"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_chaves")
        .select("*")
        .order("data_retirada", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as HistoricoChave[];
    },
  });

  const retiradaMutation = useMutation({
    mutationFn: async ({ chave, militar, mat, cabo }: { chave: Chave; militar: string; mat: string; cabo: string }) => {
      await supabase.from("chaves").update({
        status: "emprestada",
        militar_responsavel: `${militar} (Mat. ${mat})`,
      }).eq("id", chave.id);

      await supabase.from("historico_chaves").insert({
        chave_id: chave.id,
        chave_nome: chave.nome,
        militar: `${militar} (Mat. ${mat})`,
        matricula: mat,
        cabo_retirada: cabo,
        status: "em_uso",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chaves"] });
      queryClient.invalidateQueries({ queryKey: ["historico_chaves"] });
      toast({ title: "Chave Retirada", description: `${selectedChave?.nome} registrada.` });
      setDialogType(null);
      setSelectedChave(null);
      setMatricula("");
      setNomeMilitar("");
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar.", variant: "destructive" }),
  });

  const devolucaoMutation = useMutation({
    mutationFn: async ({ chave, cabo }: { chave: Chave; cabo: string }) => {
      await supabase.from("chaves").update({
        status: "disponivel",
        militar_responsavel: null,
      }).eq("id", chave.id);

      const { data: hist } = await supabase
        .from("historico_chaves")
        .select("id")
        .eq("chave_id", chave.id)
        .eq("status", "em_uso")
        .order("data_retirada", { ascending: false })
        .limit(1)
        .single();

      if (hist) {
        await supabase.from("historico_chaves").update({
          data_devolucao: new Date().toISOString(),
          cabo_devolucao: cabo,
          status: "devolvida",
        }).eq("id", hist.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chaves"] });
      queryClient.invalidateQueries({ queryKey: ["historico_chaves"] });
      toast({ title: "Chave Devolvida", description: `${selectedChave?.nome} devolvida.` });
      setDialogType(null);
      setSelectedChave(null);
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar.", variant: "destructive" }),
  });

  const handleCardClick = (chave: Chave) => {
    setSelectedChave(chave);
    setDialogType(chave.status === "disponivel" ? "retirada" : "devolucao");
    setMatricula("");
    setNomeMilitar("");
  };

  const handleRetirada = async () => {
    if (!nomeMilitar.trim() || !matricula.trim()) {
      toast({ title: "Erro", description: "Informe nome e matrícula do militar.", variant: "destructive" });
      return;
    }
    const cabo = await getCaboOnDuty();
    retiradaMutation.mutate({ chave: selectedChave!, militar: nomeMilitar, mat: matricula, cabo });
  };

  const handleDevolucao = async () => {
    const cabo = await getCaboOnDuty();
    devolucaoMutation.mutate({ chave: selectedChave!, cabo });
  };

  const filtered = chaves.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.departamento || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const disponiveisCount = chaves.filter(c => c.status === "disponivel").length;
  const emprestadas = chaves.filter(c => c.status === "emprestada").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" />
            Chaves
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de retirada e devolução — {chaves.length} chaves cadastradas</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="status-dot-available" /> {disponiveisCount} disponíveis</span>
          <span className="flex items-center gap-1.5"><span className="status-dot-borrowed" /> {emprestadas} emprestadas</span>
        </div>
      </div>

      <Tabs defaultValue="visao-geral">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="visao-geral" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Visão Geral</TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-3.5 h-3.5 mr-1.5" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar chave, departamento ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-12 font-mono text-sm">Carregando chaves...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((chave) => (
                <button
                  key={chave.id}
                  onClick={() => handleCardClick(chave)}
                  className={`relative p-4 rounded-lg border transition-all duration-200 text-left hover:scale-[1.02] ${
                    chave.status === "disponivel"
                      ? "bg-card border-status-available/30 hover:border-status-available/60 card-glow"
                      : "bg-card border-status-borrowed/30 hover:border-status-borrowed/60"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={chave.status === "disponivel" ? "status-dot-available" : "status-dot-borrowed"} />
                    <span className="text-[10px] font-mono text-muted-foreground">{chave.codigo}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate">{chave.nome}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{chave.departamento}</p>
                  {chave.militar_responsavel && (
                    <p className="text-[10px] text-status-borrowed mt-2 font-mono truncate">{chave.militar_responsavel}</p>
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
                  <TableHead className="text-xs font-mono">CHAVE</TableHead>
                  <TableHead className="text-xs font-mono">MILITAR</TableHead>
                  <TableHead className="text-xs font-mono">RETIRADA</TableHead>
                  <TableHead className="text-xs font-mono">DEVOLUÇÃO</TableHead>
                  <TableHead className="text-xs font-mono">CABO RETIRADA</TableHead>
                  <TableHead className="text-xs font-mono">CABO DEVOLUÇÃO</TableHead>
                  <TableHead className="text-xs font-mono">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((h) => (
                  <TableRow key={h.id} className="hover:bg-secondary/30">
                    <TableCell className="text-sm font-medium">{h.chave_nome}</TableCell>
                    <TableCell className="text-sm">{h.militar}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {new Date(h.data_retirada).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {h.data_devolucao ? new Date(h.data_devolucao).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{h.cabo_retirada || "—"}</TableCell>
                    <TableCell className="text-sm">{h.cabo_devolucao || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={h.status === "devolvida" ? "default" : "destructive"}
                        className={h.status === "devolvida" ? "bg-primary/20 text-primary border-0" : ""}>
                        {h.status === "devolvida" ? "Devolvida" : "Em uso"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {historico.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">Nenhum registro encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Retirada Dialog */}
      <Dialog open={dialogType === "retirada"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Retirada de Chave
            </DialogTitle>
            <DialogDescription>
              {selectedChave?.codigo} — {selectedChave?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NOME DO MILITAR</label>
              <Input
                value={nomeMilitar}
                onChange={(e) => setNomeMilitar(e.target.value)}
                placeholder="Ex: Sd João Silva"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">MATRÍCULA</label>
              <Input
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: 12345"
                className="bg-secondary border-border"
              />
            </div>
            <Button className="w-full gap-2" variant="outline" disabled>
              <Fingerprint className="w-4 h-4" />
              Ler Biometria (integração futura)
            </Button>
            <Button onClick={handleRetirada} className="w-full" disabled={retiradaMutation.isPending}>
              {retiradaMutation.isPending ? "Registrando..." : "Confirmar Retirada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Devolução Dialog */}
      <Dialog open={dialogType === "devolucao"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              Devolução de Chave
            </DialogTitle>
            <DialogDescription>
              {selectedChave?.nome} — Em uso por {selectedChave?.militar_responsavel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-md bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground font-mono">CABO AUXILIAR EM SERVIÇO</p>
              <p className="text-sm font-semibold text-foreground mt-1">Identificado automaticamente pela escala</p>
            </div>
            <Button onClick={handleDevolucao} className="w-full" disabled={devolucaoMutation.isPending}>
              {devolucaoMutation.isPending ? "Registrando..." : "Confirmar Devolução"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chaves;
