import { useState } from "react";
import { Users, Plus, LogOut } from "lucide-react";
import { visitantesMock, type Visitante } from "@/data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const Visitantes = () => {
  const [visitantes, setVisitantes] = useState(visitantesMock);
  const [showCadastro, setShowCadastro] = useState(false);
  const [form, setForm] = useState({ nome: "", documento: "", militarResponsavel: "", localDestino: "" });

  const handleCadastro = () => {
    if (!form.nome || !form.documento || !form.militarResponsavel || !form.localDestino) {
      toast({ title: "Erro", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }
    const now = new Date();
    const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setVisitantes((prev) => [
      ...prev,
      { id: String(Date.now()), ...form, horaEntrada: hora },
    ]);
    toast({ title: "Visitante Registrado", description: `${form.nome} cadastrado com sucesso.` });
    setForm({ nome: "", documento: "", militarResponsavel: "", localDestino: "" });
    setShowCadastro(false);
  };

  const handleSaida = (id: string) => {
    const now = new Date();
    const hora = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setVisitantes((prev) => prev.map((v) => v.id === id ? { ...v, horaSaida: hora } : v));
    toast({ title: "Saída Registrada" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Visitantes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Registro de entrada e saída de visitantes</p>
        </div>
        <Button onClick={() => setShowCadastro(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Visitante
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
            {visitantes.map((v) => (
              <TableRow key={v.id} className="hover:bg-secondary/30">
                <TableCell className="text-sm font-medium">{v.nome}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{v.documento}</TableCell>
                <TableCell className="text-sm">{v.militarResponsavel}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.localDestino}</TableCell>
                <TableCell className="text-xs font-mono">{v.horaEntrada}</TableCell>
                <TableCell className="text-xs font-mono">{v.horaSaida || "—"}</TableCell>
                <TableCell>
                  {!v.horaSaida ? (
                    <Button size="sm" variant="outline" onClick={() => handleSaida(v.id)} className="gap-1 text-xs h-7">
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
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Cadastrar Visitante</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { label: "NOME COMPLETO", key: "nome" as const, placeholder: "Nome do visitante" },
              { label: "DOCUMENTO", key: "documento" as const, placeholder: "RG ou CPF" },
              { label: "MILITAR RESPONSÁVEL", key: "militarResponsavel" as const, placeholder: "Posto/Grad Nome" },
              { label: "SETOR DESTINO", key: "localDestino" as const, placeholder: "Local de destino" },
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
            <Button onClick={handleCadastro} className="w-full mt-2">Registrar Entrada</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Visitantes;
