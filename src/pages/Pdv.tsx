import { useEffect, useState } from "react";
import { Plane, Save, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDb, PDV, PdvTripulacao, PdvMissao, uid } from "@/lib/localDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const today = () => new Date().toISOString().split("T")[0];

const emptyTripLinha = (): PdvTripulacao => ({
  anv_svc: "", periodo: "", p1: "", p2: "", mcv: "", fiel: "", gsar1: "", gsar2: "", vn: "",
});

const emptyMissao = (): PdvMissao => ({
  id: uid(), evt: "", pmpe: "", anv: "", abast_aut: "", etd: "", eta: "", area: "",
  p1: "", p2: "", ps_xy_fiel: "", observacoes: "",
});

const PdvPage = () => {
  const { user, isAdmin } = useAuth();
  const canEdit = isAdmin || user?.role === "operacoes";
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());

  const [tripulacao, setTripulacao] = useState<PdvTripulacao[]>([emptyTripLinha()]);
  const [configAsd, setConfigAsd] = useState("");
  const [materialGsar, setMaterialGsar] = useState("");
  const [missoes, setMissoes] = useState<PdvMissao[]>([emptyMissao()]);

  const { data: registros = [] } = useQuery({
    queryKey: ["pdv"],
    queryFn: async () => localDb.list<PDV>("pdv").sort((a, b) => b.data.localeCompare(a.data)),
  });

  const current = registros.find((r) => r.data === date);

  useEffect(() => {
    if (current) {
      setTripulacao(current.tripulacao?.length ? current.tripulacao : [emptyTripLinha()]);
      setConfigAsd(current.config_asd || "");
      setMaterialGsar(current.material_gsar || "");
      setMissoes(current.missoes?.length ? current.missoes : [emptyMissao()]);
    } else {
      setTripulacao([emptyTripLinha()]);
      setConfigAsd("");
      setMaterialGsar("");
      setMissoes([emptyMissao()]);
    }
  }, [date, current?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { tripulacao, config_asd: configAsd, material_gsar: materialGsar, missoes };
      if (current) {
        localDb.update<PDV>("pdv", current.id, payload);
      } else {
        localDb.insert<PDV>("pdv", { id: uid(), data: date, ...payload, created_at: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdv"] });
      toast({ title: "PDV salvo", description: `Plano de ${new Date(date + "T12:00").toLocaleDateString("pt-BR")} atualizado.` });
    },
  });

  const updateTrip = (i: number, key: keyof PdvTripulacao, val: string) =>
    setTripulacao((p) => p.map((t, idx) => (idx === i ? { ...t, [key]: val } : t)));
  const addTrip = () => setTripulacao((p) => [...p, emptyTripLinha()]);
  const removeTrip = (i: number) => setTripulacao((p) => p.filter((_, idx) => idx !== i));

  const updateMissao = (i: number, key: keyof PdvMissao, val: string) =>
    setMissoes((p) => p.map((m, idx) => (idx === i ? { ...m, [key]: val } : m)));
  const addMissao = () => setMissoes((p) => [...p, emptyMissao()]);
  const removeMissao = (i: number) => setMissoes((p) => p.filter((_, idx) => idx !== i));

  const tripCols: { key: keyof PdvTripulacao; label: string }[] = [
    { key: "anv_svc", label: "ANV SVC" },
    { key: "periodo", label: "PERÍODO" },
    { key: "p1", label: "1P" },
    { key: "p2", label: "2P" },
    { key: "mcv", label: "McV" },
    { key: "fiel", label: "FIEL" },
    { key: "gsar1", label: "GSAR 1" },
    { key: "gsar2", label: "GSAR 2" },
    { key: "vn", label: "VN" },
  ];

  const missaoCols: { key: keyof PdvMissao; label: string; w?: string }[] = [
    { key: "evt", label: "EVT" },
    { key: "pmpe", label: "PMPE" },
    { key: "anv", label: "ANV" },
    { key: "abast_aut", label: "ABAST AUT." },
    { key: "etd", label: "ETD" },
    { key: "eta", label: "ETA" },
    { key: "area", label: "ÁREA" },
    { key: "p1", label: "1P" },
    { key: "p2", label: "2P" },
    { key: "ps_xy_fiel", label: "PS/XY/FIEL" },
    { key: "observacoes", label: "OBSERVAÇÕES", w: "min-w-[180px]" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plane className="w-6 h-6 text-primary" /> PDV — Plano Diário de Voo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Escala operacional diária da aeronave</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-secondary border-border w-44" />
          {canEdit && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" /> {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </div>
      </div>

      {/* TRIPULAÇÃO */}
      <div className="rounded-lg border border-border bg-card mb-6 overflow-hidden">
        <div className="px-4 py-2 bg-secondary/50 flex items-center justify-between">
          <p className="text-xs font-mono text-primary tracking-wider">TRIPULAÇÃO / SERVIÇO</p>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={addTrip} className="gap-1 h-7 text-xs">
              <Plus className="w-3 h-3" /> Linha
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                {tripCols.map((c) => (
                  <TableHead key={c.key} className="text-[10px] font-mono">{c.label}</TableHead>
                ))}
                {canEdit && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tripulacao.map((t, i) => (
                <TableRow key={i}>
                  {tripCols.map((c) => (
                    <TableCell key={c.key} className="p-1">
                      <Input
                        value={t[c.key]}
                        onChange={(e) => updateTrip(i, c.key, e.target.value)}
                        disabled={!canEdit}
                        className="bg-secondary border-border h-8 text-xs"
                      />
                    </TableCell>
                  ))}
                  {canEdit && (
                    <TableCell className="p-1">
                      {tripulacao.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeTrip(i)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-t border-border">
          <div>
            <label className="text-xs font-mono text-muted-foreground mb-1.5 block">CONFIGURAÇÃO ASD</label>
            <Textarea value={configAsd} onChange={(e) => setConfigAsd(e.target.value)} disabled={!canEdit} className="bg-secondary border-border min-h-[60px]" />
          </div>
          <div>
            <label className="text-xs font-mono text-muted-foreground mb-1.5 block">MATERIAL GSAR</label>
            <Textarea value={materialGsar} onChange={(e) => setMaterialGsar(e.target.value)} disabled={!canEdit} className="bg-secondary border-border min-h-[60px]" />
          </div>
        </div>
      </div>

      {/* MISSÕES */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 bg-secondary/50 flex items-center justify-between">
          <p className="text-xs font-mono text-primary tracking-wider">MISSÕES / EVENTOS</p>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={addMissao} className="gap-1 h-7 text-xs">
              <Plus className="w-3 h-3" /> Missão
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                {missaoCols.map((c) => (
                  <TableHead key={c.key} className={`text-[10px] font-mono ${c.w || ""}`}>{c.label}</TableHead>
                ))}
                {canEdit && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {missoes.map((m, i) => (
                <TableRow key={m.id}>
                  {missaoCols.map((c) => (
                    <TableCell key={c.key} className="p-1">
                      <Input
                        value={m[c.key]}
                        onChange={(e) => updateMissao(i, c.key, e.target.value)}
                        disabled={!canEdit}
                        className={`bg-secondary border-border h-8 text-xs ${c.w || ""}`}
                      />
                    </TableCell>
                  ))}
                  {canEdit && (
                    <TableCell className="p-1">
                      {missoes.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeMissao(i)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default PdvPage;
