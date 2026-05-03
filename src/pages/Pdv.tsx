import { useEffect, useState } from "react";
import { Plane, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDb, PDV, uid } from "@/lib/localDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const today = () => new Date().toISOString().split("T")[0];

const emptyForm = {
  aeronave: "", piloto: "", copiloto: "", mecanico_voo: "", gsac1: "", gsac2: "", vn: "",
};

const PdvPage = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [form, setForm] = useState(emptyForm);

  const { data: registros = [] } = useQuery({
    queryKey: ["pdv"],
    queryFn: async () => localDb.list<PDV>("pdv").sort((a, b) => b.data.localeCompare(a.data)),
  });

  const current = registros.find((r) => r.data === date);

  useEffect(() => {
    if (current) {
      setForm({
        aeronave: current.aeronave, piloto: current.piloto, copiloto: current.copiloto,
        mecanico_voo: current.mecanico_voo, gsac1: current.gsac1, gsac2: current.gsac2, vn: current.vn,
      });
    } else {
      setForm(emptyForm);
    }
  }, [date, current?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (current) {
        localDb.update<PDV>("pdv", current.id, { ...form });
      } else {
        localDb.insert<PDV>("pdv", { id: uid(), data: date, ...form, created_at: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdv"] });
      toast({ title: "PDV salvo", description: `Plano Diário de Voo de ${new Date(date + "T12:00").toLocaleDateString("pt-BR")} atualizado.` });
    },
  });

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "aeronave", label: "AERONAVE" },
    { key: "piloto", label: "PILOTO" },
    { key: "copiloto", label: "COPILOTO" },
    { key: "mecanico_voo", label: "MECÂNICO DE VOO" },
    { key: "gsac1", label: "GSAC 1" },
    { key: "gsac2", label: "GSAC 2" },
    { key: "vn", label: "VN" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plane className="w-6 h-6 text-primary" /> PDV — Plano Diário de Voo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Escala operacional diária da aeronave</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-secondary border-border w-44" />
          {isAdmin && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" /> {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 mb-6">
        <p className="text-xs font-mono text-primary mb-4">PAINEL OPERACIONAL — {new Date(date + "T12:00").toLocaleDateString("pt-BR")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">{f.label}</label>
              <Input
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="bg-secondary border-border"
                disabled={!isAdmin}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2 bg-secondary/50">
          <p className="text-xs font-mono text-muted-foreground">HISTÓRICO</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead className="text-xs font-mono">DATA</TableHead>
              <TableHead className="text-xs font-mono">AERONAVE</TableHead>
              <TableHead className="text-xs font-mono">PILOTO</TableHead>
              <TableHead className="text-xs font-mono">COPILOTO</TableHead>
              <TableHead className="text-xs font-mono">MEC. VOO</TableHead>
              <TableHead className="text-xs font-mono">GSAC 1</TableHead>
              <TableHead className="text-xs font-mono">GSAC 2</TableHead>
              <TableHead className="text-xs font-mono">VN</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum PDV registrado</TableCell></TableRow>
            ) : registros.map((r) => (
              <TableRow key={r.id} className="hover:bg-secondary/30 cursor-pointer" onClick={() => setDate(r.data)}>
                <TableCell className="text-xs font-mono">{new Date(r.data + "T12:00").toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-sm font-medium">{r.aeronave}</TableCell>
                <TableCell className="text-sm">{r.piloto}</TableCell>
                <TableCell className="text-sm">{r.copiloto}</TableCell>
                <TableCell className="text-sm">{r.mecanico_voo}</TableCell>
                <TableCell className="text-sm">{r.gsac1}</TableCell>
                <TableCell className="text-sm">{r.gsac2}</TableCell>
                <TableCell className="text-sm">{r.vn}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PdvPage;
