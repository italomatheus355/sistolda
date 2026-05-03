import { useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDb, getCaboOnDuty, RegistroMaterial, uid } from "@/lib/localDb";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

const MaterialPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome_material: "", militar: "", nip: "", destino: "" });
  const [search, setSearch] = useState("");

  const { data: registros = [] } = useQuery({
    queryKey: ["registros_materiais"],
    queryFn: async () =>
      localDb.list<RegistroMaterial>("registros_materiais")
        .sort((a, b) => b.data_registro.localeCompare(a.data_registro)),
  });

  const insertMutation = useMutation({
    mutationFn: async () => {
      localDb.insert<RegistroMaterial>("registros_materiais", {
        id: uid(),
        nome_material: form.nome_material,
        militar: form.militar,
        nip: form.nip,
        destino: form.destino,
        data_registro: new Date().toISOString(),
        cabo_registro: getCaboOnDuty(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registros_materiais"] });
      toast({ title: "Material registrado", description: `${form.nome_material} registrado com sucesso.` });
      setForm({ nome_material: "", militar: "", nip: "", destino: "" });
      setOpen(false);
    },
  });

  const handleSubmit = () => {
    if (!form.nome_material.trim() || !form.militar.trim() || !form.nip.trim() || !form.destino.trim()) {
      toast({ title: "Erro", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }
    insertMutation.mutate();
  };

  const filtered = registros.filter((r) =>
    [r.nome_material, r.militar, r.nip, r.destino].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Material
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Registro simples de saída de material</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Registro
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs font-mono">MATERIAL</TableHead>
              <TableHead className="text-xs font-mono">MILITAR</TableHead>
              <TableHead className="text-xs font-mono">NIP</TableHead>
              <TableHead className="text-xs font-mono">DESTINO</TableHead>
              <TableHead className="text-xs font-mono">DATA / HORA</TableHead>
              <TableHead className="text-xs font-mono">CABO AUX.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id} className="hover:bg-secondary/30">
                <TableCell className="text-sm font-medium">{r.nome_material}</TableCell>
                <TableCell className="text-sm">{r.militar}</TableCell>
                <TableCell className="text-xs font-mono">{r.nip}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.destino}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{new Date(r.data_registro).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-sm">{r.cabo_registro || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Registrar Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NOME DO MATERIAL</label>
              <Input value={form.nome_material} onChange={(e) => setForm({ ...form, nome_material: e.target.value })} className="bg-secondary border-border" autoFocus />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">MILITAR RESPONSÁVEL</label>
              <Input value={form.militar} onChange={(e) => setForm({ ...form, militar: e.target.value })} placeholder="Posto/Grad Nome" className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NIP</label>
              <Input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">DESTINO DO MATERIAL</label>
              <Input value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} className="bg-secondary border-border" />
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={insertMutation.isPending}>
              {insertMutation.isPending ? "Registrando..." : "Confirmar Registro"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialPage;
