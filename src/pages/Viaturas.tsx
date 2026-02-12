import { useState } from "react";
import { Car, Search, Fingerprint, RotateCcw } from "lucide-react";
import { viaturasMock, type Viatura } from "@/data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const statusLabel = { disponivel: "Disponível", em_uso: "Em Uso", manutencao: "Manutenção" } as const;
const statusDot = { disponivel: "status-dot-available", em_uso: "status-dot-borrowed", manutencao: "status-dot-maintenance" } as const;
const statusBorder = {
  disponivel: "border-status-available/30 hover:border-status-available/60 card-glow",
  em_uso: "border-status-borrowed/30 hover:border-status-borrowed/60",
  manutencao: "border-status-maintenance/30 hover:border-status-maintenance/60",
} as const;

const Viaturas = () => {
  const [viaturas, setViaturas] = useState(viaturasMock);
  const [selected, setSelected] = useState<Viatura | null>(null);
  const [dialogType, setDialogType] = useState<"retirada" | "devolucao" | null>(null);
  const [matricula, setMatricula] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = viaturas.filter(
    (v) =>
      v.prefixo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.setor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClick = (v: Viatura) => {
    if (v.status === "manutencao") return;
    setSelected(v);
    setDialogType(v.status === "disponivel" ? "retirada" : "devolucao");
    setMatricula("");
  };

  const handleRetirada = () => {
    if (!matricula.trim()) { toast({ title: "Erro", description: "Informe a matrícula.", variant: "destructive" }); return; }
    setViaturas((prev) => prev.map((v) => v.id === selected?.id ? { ...v, status: "em_uso" as const, militarResponsavel: `Mat. ${matricula}` } : v));
    toast({ title: "Viatura Retirada", description: `${selected?.prefixo} registrada.` });
    setDialogType(null);
  };

  const handleDevolucao = () => {
    setViaturas((prev) => prev.map((v) => v.id === selected?.id ? { ...v, status: "disponivel" as const, militarResponsavel: undefined } : v));
    toast({ title: "Viatura Devolvida", description: `${selected?.prefixo} devolvida.` });
    setDialogType(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Car className="w-6 h-6 text-primary" />
            Viaturas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de viaturas do quartel</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="status-dot-available" /> {viaturas.filter(v => v.status === "disponivel").length}</span>
          <span className="flex items-center gap-1.5"><span className="status-dot-borrowed" /> {viaturas.filter(v => v.status === "em_uso").length}</span>
          <span className="flex items-center gap-1.5"><span className="status-dot-maintenance" /> {viaturas.filter(v => v.status === "manutencao").length}</span>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar viatura..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-secondary border-border" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((v) => (
          <button
            key={v.id}
            onClick={() => handleClick(v)}
            disabled={v.status === "manutencao"}
            className={`relative p-4 rounded-lg border bg-card transition-all duration-200 text-left hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed ${statusBorder[v.status]}`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className={statusDot[v.status]} />
              <span className="text-[10px] font-mono text-muted-foreground">{statusLabel[v.status]}</span>
            </div>
            <h3 className="text-sm font-bold text-foreground font-mono">{v.prefixo}</h3>
            <p className="text-xs text-muted-foreground mt-1">{v.modelo}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{v.setor}</p>
            {v.militarResponsavel && (
              <p className="text-[10px] text-status-borrowed mt-2 font-mono">{v.militarResponsavel}</p>
            )}
          </button>
        ))}
      </div>

      <Dialog open={dialogType === "retirada"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Car className="w-5 h-5 text-primary" /> Retirada de Viatura</DialogTitle>
            <DialogDescription>{selected?.prefixo} — {selected?.modelo}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">MATRÍCULA / ID</label>
              <Input value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ex: 12345" className="bg-secondary border-border" />
            </div>
            <Button className="w-full gap-2" variant="outline" disabled><Fingerprint className="w-4 h-4" /> Ler Biometria</Button>
            <Button onClick={handleRetirada} className="w-full">Confirmar Retirada</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogType === "devolucao"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Devolução de Viatura</DialogTitle>
            <DialogDescription>{selected?.prefixo} — Em uso por {selected?.militarResponsavel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-md bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground font-mono">CABO AUXILIAR EM SERVIÇO</p>
              <p className="text-sm font-semibold text-foreground mt-1">Cb Pereira (auto-identificado)</p>
            </div>
            <Button onClick={handleDevolucao} className="w-full">Confirmar Devolução</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Viaturas;
