import { useState } from "react";
import { Users, Plus, LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface Visitante {
  id: string;
  nome: string;
  documento: string;
  militar_responsavel: string;
  local_destino: string;
  hora_entrada: string;
  hora_saida: string | null;
  observacoes: string | null;
  cabo_registro: string | null;
}

const getCaboOnDuty = async (): Promise<string> => {
  const { data } = await supabase.rpc("get_cabo_on_duty" as any);
  return (data as string) || "Não identificado";
};

const Visitantes = () => {
  const queryClient = useQueryClient();
  const [showCadastro, setShowCadastro] = useState(false);
  const [form, setForm] = useState({ nome: "", documento: "", militarResponsavel: "", localDestino: "", observacoes: "" });

  const { data: visitantes = [], isLoading } = useQuery({
    queryKey: ["visitantes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitantes")
        .select("*")
        .order("hora_entrada", { ascending: false });
      if (error) throw error;
      return data as Visitante[];
    },
  });

  const cadastroMutation = useMutation({
    mutationFn: async (cabo: string) => {
      const { error } = await supabase.from("visitantes").insert({
        nome: form.nome,
        documento: form.documento,
        militar_responsavel: form.militarResponsavel,
        local_destino: form.localDestino,
        observacoes: form.observacoes || null,
        cabo_registro: cabo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitantes"] });
      toast({ title: "Visitante Registrado", description: `${form.nome} cadastrado com sucesso.` });
      setForm({ nome: "", documento: "", militarResponsavel: "", localDestino: "", observacoes: "" });
      setShowCadastro(false);
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar.", variant: "destructive" }),
  });

  const saidaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("visitantes").update({
        hora_saida: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitantes"] });
      toast({ title: "Saída Registrada" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar.", variant: "destructive" }),
  });

  const handleCadastro = async () => {
    if (!form.nome || !form.documento || !form.militarResponsavel || !form.localDestino) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    const cabo = await getCaboOnDuty();
    cadastroMutation.mutate(cabo);
  };

  const presentes = visitantes.filter(v => !v.hora_saida).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Visitantes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro de entrada e saída
            {presentes > 0 && <span className="ml-2 text-status-borrowed font-mono">• {presentes} no quartel</span>}
          </p>
        </div>
        <Button onClick={() => setShowCadastro(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Registrar Entrada
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs font-mono">NOME</TableHead>
              <TableHead className="text-xs font-mono">DOCUMENTO</TableHead>
              <TableHead className="text-xs font-mono">MILITAR RESP.</TableHead>
              <TableHead className="text-xs font-mono">DESTINO</TableHead>
              <TableHead className="text-xs font-mono">ENTRADA</TableHead>
              <TableHead className="text-xs font-mono">SAÍDA</TableHead>
              <TableHead className="text-xs font-mono">AÇÃO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : visitantes.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum visitante registrado hoje</TableCell></TableRow>
            ) : visitantes.map((v) => (
              <TableRow key={v.id} className="hover:bg-secondary/30">
                <TableCell className="text-sm font-medium">{v.nome}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{v.documento}</TableCell>
                <TableCell className="text-sm">{v.militar_responsavel}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.local_destino}</TableCell>
                <TableCell className="text-xs font-mono">{new Date(v.hora_entrada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                <TableCell className="text-xs font-mono">
                  {v.hora_saida ? new Date(v.hora_saida).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                </TableCell>
                <TableCell>
                  {!v.hora_saida ? (
                    <Button size="sm" variant="outline" onClick={() => saidaMutation.mutate(v.id)} className="gap-1 text-xs h-7">
                      <LogOut className="w-3 h-3" /> Saída
                    </Button>
                  ) : (
                    <Badge className="bg-primary/20 text-primary border-0">Concluído</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showCadastro} onOpenChange={setShowCadastro}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Registrar Entrada</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { label: "NOME COMPLETO *", key: "nome" as const, placeholder: "Nome do visitante" },
              { label: "DOCUMENTO *", key: "documento" as const, placeholder: "RG ou CPF" },
              { label: "MILITAR RESPONSÁVEL *", key: "militarResponsavel" as const, placeholder: "Posto/Grad Nome" },
              { label: "LOCAL DE DESTINO *", key: "localDestino" as const, placeholder: "Local de destino" },
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
    </div>
  );
};

export default Visitantes;
