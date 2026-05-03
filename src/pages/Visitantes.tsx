import { useState } from "react";
import { Users, Plus, LogOut, Eye, History } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDb, getCaboOnDuty, Visitante, uid } from "@/lib/localDb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const Visitantes = () => {
  const queryClient = useQueryClient();
  const [showCadastro, setShowCadastro] = useState(false);
  const [detalhes, setDetalhes] = useState<Visitante | null>(null);
  const [filtroData, setFiltroData] = useState("");
  const [form, setForm] = useState({ nome: "", documento: "", localDestino: "", observacoes: "" });

  const { data: visitantes = [], isLoading } = useQuery({
    queryKey: ["visitantes"],
    queryFn: async () =>
      localDb.list<Visitante>("visitantes").sort((a, b) => b.hora_entrada.localeCompare(a.hora_entrada)),
  });

  const cadastroMutation = useMutation({
    mutationFn: async (cabo: string) => {
      localDb.insert<Visitante>("visitantes", {
        id: uid(),
        nome: form.nome,
        documento: form.documento,
        militar_responsavel: "",
        local_destino: form.localDestino,
        hora_entrada: new Date().toISOString(),
        hora_saida: null,
        observacoes: form.observacoes || null,
        cabo_registro: cabo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitantes"] });
      toast({ title: "Visitante registrado", description: `${form.nome} cadastrado.` });
      setForm({ nome: "", documento: "", localDestino: "", observacoes: "" });
      setShowCadastro(false);
    },
  });

  const saidaMutation = useMutation({
    mutationFn: async (id: string) => {
      localDb.update<Visitante>("visitantes", id, { hora_saida: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitantes"] });
      toast({ title: "Saída registrada" });
    },
  });

  const handleCadastro = () => {
    if (!form.nome || !form.documento || !form.localDestino) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }
    cadastroMutation.mutate(getCaboOnDuty());
  };

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
          <p className="text-sm text-muted-foreground mt-1">Registro de entrada e saída</p>
        </div>
        <Button onClick={() => setShowCadastro(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Registrar Entrada
        </Button>
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
            rows={visitantes}
            isLoading={isLoading}
            onSaida={(id) => saidaMutation.mutate(id)}
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
            onSaida={(id) => saidaMutation.mutate(id)}
            onDetalhes={setDetalhes}
          />
        </TabsContent>
      </Tabs>

      {/* Cadastro */}
      <Dialog open={showCadastro} onOpenChange={setShowCadastro}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Registrar Entrada</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { label: "NOME COMPLETO *", key: "nome" as const, placeholder: "Nome do visitante" },
              { label: "DOCUMENTO *", key: "documento" as const, placeholder: "RG ou CPF" },
              { label: "DESTINO *", key: "localDestino" as const, placeholder: "Local de destino" },
              { label: "OBSERVAÇÕES", key: "observacoes" as const, placeholder: "Opcional" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs font-mono text-muted-foreground mb-1.5 block">{field.label}</label>
                <Input
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="bg-secondary border-border"
                />
              </div>
            ))}
            <Button onClick={handleCadastro} className="w-full mt-2" disabled={cadastroMutation.isPending}>
              {cadastroMutation.isPending ? "Registrando..." : "Registrar Entrada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detalhes */}
      <Dialog open={!!detalhes} onOpenChange={(o) => !o && setDetalhes(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" /> Detalhes do Visitante</DialogTitle>
          </DialogHeader>
          {detalhes && (
            <div className="space-y-3 text-sm mt-2">
              <Row label="Nome" value={detalhes.nome} />
              <Row label="Documento" value={detalhes.documento} />
              <Row label="Destino" value={detalhes.local_destino} />
              <Row label="Entrada" value={new Date(detalhes.hora_entrada).toLocaleString("pt-BR")} />
              <Row label="Saída" value={detalhes.hora_saida ? new Date(detalhes.hora_saida).toLocaleString("pt-BR") : "Ainda no quartel"} />
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

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
    <span className="text-xs font-mono text-muted-foreground uppercase">{label}</span>
    <span className="text-sm text-foreground text-right">{value}</span>
  </div>
);

const VisitantesTable = ({
  rows, isLoading, onSaida, onDetalhes,
}: {
  rows: Visitante[]; isLoading: boolean; onSaida: (id: string) => void; onDetalhes: (v: Visitante) => void;
}) => (
  <div className="rounded-lg border border-border overflow-hidden">
    <Table>
      <TableHeader>
        <TableRow className="bg-secondary/50 hover:bg-secondary/50">
          <TableHead className="text-xs font-mono">NOME</TableHead>
          <TableHead className="text-xs font-mono">DOCUMENTO</TableHead>
          <TableHead className="text-xs font-mono">DESTINO</TableHead>
          <TableHead className="text-xs font-mono">ENTRADA</TableHead>
          <TableHead className="text-xs font-mono">SAÍDA</TableHead>
          <TableHead className="text-xs font-mono">AÇÃO</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
        ) : rows.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
        ) : rows.map((v) => (
          <TableRow key={v.id} className="hover:bg-secondary/30">
            <TableCell className="text-sm font-medium">{v.nome}</TableCell>
            <TableCell className="text-xs font-mono text-muted-foreground">{v.documento}</TableCell>
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
                  <Button size="sm" variant="outline" onClick={() => onSaida(v.id)} className="gap-1 text-xs h-7">
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
