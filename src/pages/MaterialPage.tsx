import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Search, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiMaterial, SYNC_OPTIONS, nomeDoMilitarPorNip } from "@/lib/api";
import { getCaboOnDuty } from "@/lib/localDb";
import { showOperationConfirm } from "@/components/OperationConfirm";
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
  const [militarReconhecido, setMilitarReconhecido] = useState<string | null>(null);

  const [fMaterial, setFMaterial] = useState("");
  const [fMilitar, setFMilitar] = useState("");
  const [fDestino, setFDestino] = useState("");
  const [fIni, setFIni] = useState("");
  const [fFim, setFFim] = useState("");

  const { data: registros = [] } = useQuery({
    queryKey: ["registros_materiais"], queryFn: api.listMateriais, ...SYNC_OPTIONS,
  });

  // Resolve nome a partir do NIP (debounced)
  useEffect(() => {
    const nip = form.nip.trim();
    if (!nip) { setMilitarReconhecido(null); return; }
    let cancel = false;
    const t = setTimeout(async () => {
      const m = await api.getMilitarByNip(nip);
      if (cancel) return;
      if (m?.nome) {
        setMilitarReconhecido(m.nome);
        setForm((f) => ({ ...f, militar: m.nome }));
      } else {
        setMilitarReconhecido(null);
      }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [form.nip]);

  const insertMutation = useMutation({
    mutationFn: async () => {
      const militar = form.militar.trim() || (await nomeDoMilitarPorNip(form.nip));
      await api.createMaterial({
        nome_material: form.nome_material,
        militar,
        nip: form.nip,
        destino: form.destino,
        cabo_registro: getCaboOnDuty(),
      });
      return { militar, material: form.nome_material };
    },
    onSuccess: ({ militar, material }) => {
      queryClient.invalidateQueries({ queryKey: ["registros_materiais"] });
      showOperationConfirm({ nome: militar, acao: "registrou material", detalhe: material, variant: "material" });
      setForm({ nome_material: "", militar: "", nip: "", destino: "" });
      setMilitarReconhecido(null);
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!form.nome_material.trim() || !form.nip.trim() || !form.destino.trim()) {
      toast({ title: "Erro", description: "Preencha material, NIP e destino.", variant: "destructive" });
      return;
    }
    insertMutation.mutate();
  };

  const filtered = useMemo(() => registros.filter((r) => {
    const txt = [r.nome_material, r.militar, r.nip, r.destino].join(" ").toLowerCase();
    if (search && !txt.includes(search.toLowerCase())) return false;
    if (fMaterial && !r.nome_material.toLowerCase().includes(fMaterial.toLowerCase())) return false;
    if (fMilitar && !(r.militar.toLowerCase().includes(fMilitar.toLowerCase()) || r.nip.includes(fMilitar))) return false;
    if (fDestino && !r.destino.toLowerCase().includes(fDestino.toLowerCase())) return false;
    const d = r.data_registro.slice(0, 10);
    if (fIni && d < fIni) return false;
    if (fFim && d > fFim) return false;
    return true;
  }), [registros, search, fMaterial, fMilitar, fDestino, fIni, fFim]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Material
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Registro de saída de material</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Registro
        </Button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Busca rápida..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
      </div>

      <div className="rounded-lg border border-border p-3 mb-4 bg-card">
        <div className="flex items-center gap-2 mb-3 text-xs font-mono text-muted-foreground"><Filter className="w-3.5 h-3.5" /> FILTROS</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Input placeholder="Material" value={fMaterial} onChange={(e) => setFMaterial(e.target.value)} className="bg-secondary border-border" />
          <Input placeholder="Militar / NIP" value={fMilitar} onChange={(e) => setFMilitar(e.target.value)} className="bg-secondary border-border" />
          <Input placeholder="Destino" value={fDestino} onChange={(e) => setFDestino(e.target.value)} className="bg-secondary border-border" />
          <Input type="date" value={fIni} onChange={(e) => setFIni(e.target.value)} className="bg-secondary border-border" />
          <Input type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} className="bg-secondary border-border" />
        </div>
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
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">NIP</label>
              <Input
                value={form.nip}
                onChange={(e) => setForm({ ...form, nip: e.target.value })}
                className="bg-secondary border-border"
                placeholder="Digite o NIP"
              />
              {militarReconhecido && (
                <p className="text-[10px] font-mono text-status-available mt-1">
                  ✓ MILITAR IDENTIFICADO: {militarReconhecido}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">MILITAR RESPONSÁVEL</label>
              <Input value={form.militar} onChange={(e) => setForm({ ...form, militar: e.target.value })} placeholder="Auto preenchido pelo NIP" className="bg-secondary border-border" />
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
