import { useState } from "react";
import { Package, Search, Fingerprint, RotateCcw } from "lucide-react";
import { materiaisMock, type Material } from "@/data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const MaterialPage = () => {
  const [materiais, setMateriais] = useState(materiaisMock);
  const [selected, setSelected] = useState<Material | null>(null);
  const [dialogType, setDialogType] = useState<"retirada" | "devolucao" | null>(null);
  const [matricula, setMatricula] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = materiais.filter(
    (m) =>
      m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.codigoPatrimonio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.setor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClick = (m: Material) => {
    setSelected(m);
    setDialogType(m.status === "disponivel" ? "retirada" : "devolucao");
    setMatricula("");
  };

  const handleRetirada = () => {
    if (!matricula.trim()) { toast({ title: "Erro", description: "Informe a matrícula.", variant: "destructive" }); return; }
    setMateriais((prev) => prev.map((m) => m.id === selected?.id ? { ...m, status: "emprestado" as const, militarResponsavel: `Mat. ${matricula}` } : m));
    toast({ title: "Material Retirado", description: `${selected?.nome} registrado.` });
    setDialogType(null);
  };

  const handleDevolucao = () => {
    setMateriais((prev) => prev.map((m) => m.id === selected?.id ? { ...m, status: "disponivel" as const, militarResponsavel: undefined } : m));
    toast({ title: "Material Devolvido", description: `${selected?.nome} devolvido.` });
    setDialogType(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Material
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de materiais e equipamentos</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="status-dot-available" /> {materiais.filter(m => m.status === "disponivel").length}</span>
          <span className="flex items-center gap-1.5"><span className="status-dot-borrowed" /> {materiais.filter(m => m.status === "emprestado").length}</span>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar material..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-secondary border-border" />
      </div>

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
              <span className="text-[10px] font-mono text-muted-foreground">{m.codigoPatrimonio}</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground truncate">{m.nome}</h3>
            <p className="text-xs text-muted-foreground mt-1">{m.setor}</p>
            {m.militarResponsavel && (
              <p className="text-[10px] text-status-borrowed mt-2 font-mono truncate">{m.militarResponsavel}</p>
            )}
          </button>
        ))}
      </div>

      <Dialog open={dialogType === "retirada"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Retirada de Material</DialogTitle>
            <DialogDescription>{selected?.nome} — {selected?.setor}</DialogDescription>
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
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Devolução de Material</DialogTitle>
            <DialogDescription>{selected?.nome} — Em uso por {selected?.militarResponsavel}</DialogDescription>
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

export default MaterialPage;
