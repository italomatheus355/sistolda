import { useState } from "react";
import { Package, Search, Plus, Fingerprint, RotateCcw, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Material {
  id: string;
  nome: string;
  descricao: string | null;
  status: string;
  militar_responsavel: string | null;
}

interface HistoricoMaterial {
  id: string;
  material_nome: string;
  militar: string;
  data_saida: string;
  data_retorno: string | null;
  cabo_saida: string | null;
  cabo_retorno: string | null;
  status: string;
}

const getCaboOnDuty = async (): Promise<string> => {
  const { data } = await supabase.rpc("get_cabo_on_duty" as any);
  return (data as string) || "Não identificado";
};

const MaterialPage = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [selected, setSelected] = useState<Material | null>(null);
  const [dialogType, setDialogType] = useState<"retirada" | "devolucao" | "cadastro" | null>(null);
  const [nomeMilitar, setNomeMilitar] = useState("");
  const [matricula, setMatricula] = useState("");
  const [novoMaterial, setNovoMaterial] = useState({ nome: "", descricao: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const { data: materiais = [], isLoading } = useQuery({
    queryKey: ["materiais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("materiais").select("*").order("nome");
      if (error) throw error;
      return data as Material[];
    },
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["historico_materiais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_materiais")
        .select("*")
        .order("data_saida", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as HistoricoMaterial[];
    },
  });

  const cadastroMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("materiais").insert({
        nome: novoMaterial.nome,
        descricao: novoMaterial.descricao || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
      toast({ title: "Material Cadastrado", description: `${novoMaterial.nome} adicionado.` });
      setNovoMaterial({ nome: "", descricao: "" });
      setDialogType(null);
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível cadastrar.", variant: "destructive" }),
  });

  const retiradaMutation = useMutation({
    mutationFn: async ({ material, cabo }: { material: Material; cabo: string }) => {
      await supabase.from("materiais").update({
        status: "emprestado",
        militar_responsavel: `${nomeMilitar} (Mat. ${matricula})`,
      }).eq("id", material.id);

      await supabase.from("historico_materiais").insert({
        material_id: material.id,
        material_nome: material.nome,
        militar: `${nomeMilitar} (Mat. ${matricula})`,
        matricula,
        cabo_saida: cabo,
        status: "em_uso",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
      queryClient.invalidateQueries({ queryKey: ["historico_materiais"] });
      toast({ title: "Saída Registrada", description: `${selected?.nome} retirado.` });
      setDialogType(null);
      setNomeMilitar(""); setMatricula("");
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar.", variant: "destructive" }),
  });

  const devolucaoMutation = useMutation({
    mutationFn: async ({ material, cabo }: { material: Material; cabo: string }) => {
      await supabase.from("materiais").update({
        status: "disponivel",
        militar_responsavel: null,
      }).eq("id", material.id);

      const { data: hist } = await supabase
        .from("historico_materiais")
        .select("id")
        .eq("material_id", material.id)
        .eq("status", "em_uso")
        .order("data_saida", { ascending: false })
        .limit(1)
        .single();

      if (hist) {
        await supabase.from("historico_materiais").update({
          data_retorno: new Date().toISOString(),
          cabo_retorno: cabo,
          status: "devolvido",
        }).eq("id", hist.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
      queryClient.invalidateQueries({ queryKey: ["historico_materiais"] });
      toast({ title: "Devolução Registrada", description: `${selected?.nome} devolvido.` });
      setDialogType(null);
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar.", variant: "destructive" }),
  });

  const handleClick = (m: Material) => {
    setSelected(m);
    setDialogType(m.status === "disponivel" ? "retirada" : "devolucao");
    setNomeMilitar(""); setMatricula("");
  };

  const handleRetirada = async () => {
    if (!nomeMilitar.trim() || !matricula.trim()) {
      toast({ title: "Erro", description: "Informe nome e matrícula.", variant: "destructive" });
      return;
    }
    const cabo = await getCaboOnDuty();
    retiradaMutation.mutate({ material: selected!, cabo });
  };

  const handleDevolucao = async () => {
    const cabo = await getCaboOnDuty();
    devolucaoMutation.mutate({ material: selected!, cabo });
  };

  const filtered = materiais.filter(m =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.descricao || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Material
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de materiais e ferramentas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="status-dot-available" /> {materiais.filter(m => m.status === "disponivel").length}</span>
            <span className="flex items-center gap-1.5"><span className="status-dot-borrowed" /> {materiais.filter(m => m.status === "emprestado").length}</span>
          </div>
          {isAdmin && (
            <Button onClick={() => setDialogType("cadastro")} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Cadastrar
            </Button>
          )}
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
            <Input placeholder="Buscar material..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-12 font-mono text-sm">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">
              {isAdmin ? "Nenhum material cadastrado. Clique em Cadastrar para adicionar." : "Nenhum material encontrado."}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleClick(m)}
                  className={`relative p-4 rounded-lg border bg-card transition-all duration-200 text-left hover:scale-[1.02] ${
                    m.status === "disponivel"
                      ? "border-status-available/30 hover:border-status-available/60 card-glow"
                      : "border-status-borrowed/30 hover:border-status-borrowed/60"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={m.status === "disponivel" ? "status-dot-available" : "status-dot-borrowed"} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{m.nome}</h3>
                  {m.descricao && <p className="text-xs text-muted-foreground mt-1">{m.descricao}</p>}
                  {m.militar_responsavel && (
                    <p className="text-[10px] text-status-borrowed mt-2 font-mono truncate">{m.militar_responsavel}</p>
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
                  <TableHead className="text-xs font-mono">MATERIAL</TableHead>
                  <TableHead className="text-xs font-mono">MILITAR</TableHead>
                  <TableHead className="text-xs font-mono">SAÍDA</TableHead>
                  <TableHead className="text-xs font-mono">RETORNO</TableHead>
                  <TableHead className="text-xs font-mono">CABO SAÍDA</TableHead>
                  <TableHead className="text-xs font-mono">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((h) => (
                  <TableRow key={h.id} className="hover:bg-secondary/30">
                    <TableCell className="text-sm font-medium">{h.material_nome}</TableCell>
                    <TableCell className="text-sm">{h.militar}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{new Date(h.data_saida).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{h.data_retorno ? new Date(h.data_retorno).toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-sm">{h.cabo_saida || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={h.status === "devolvido" ? "default" : "destructive"} className={h.status === "devolvido" ? "bg-primary/20 text-primary border-0" : ""}>
                        {h.status === "devolvido" ? "Devolvido" : "Em uso"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {historico.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Cadastro (admin only) */}
      <Dialog open={dialogType === "cadastro"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Cadastrar Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NOME DO MATERIAL *</label>
              <Input value={novoMaterial.nome} onChange={(e) => setNovoMaterial({ ...novoMaterial, nome: e.target.value })} placeholder="Ex: Furadeira, Esmerilhadeira" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">DESCRIÇÃO (opcional)</label>
              <Input value={novoMaterial.descricao} onChange={(e) => setNovoMaterial({ ...novoMaterial, descricao: e.target.value })} placeholder="Detalhes adicionais" className="bg-secondary border-border" />
            </div>
            <Button onClick={() => cadastroMutation.mutate()} className="w-full" disabled={cadastroMutation.isPending || !novoMaterial.nome.trim()}>
              {cadastroMutation.isPending ? "Cadastrando..." : "Cadastrar Material"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Retirada */}
      <Dialog open={dialogType === "retirada"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Retirada de Material</DialogTitle>
            <DialogDescription>{selected?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NOME DO MILITAR</label>
              <Input value={nomeMilitar} onChange={(e) => setNomeMilitar(e.target.value)} placeholder="Ex: Sd João Silva" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">MATRÍCULA</label>
              <Input value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ex: 12345" className="bg-secondary border-border" />
            </div>
            <Button className="w-full gap-2" variant="outline" disabled><Fingerprint className="w-4 h-4" /> Ler Biometria (integração futura)</Button>
            <Button onClick={handleRetirada} className="w-full" disabled={retiradaMutation.isPending}>
              {retiradaMutation.isPending ? "Registrando..." : "Confirmar Retirada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Devolução */}
      <Dialog open={dialogType === "devolucao"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Devolução de Material</DialogTitle>
            <DialogDescription>{selected?.nome} — Em uso por {selected?.militar_responsavel}</DialogDescription>
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

export default MaterialPage;
