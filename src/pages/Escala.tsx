import { useState } from "react";
import { Calendar, Plus, Trash2, Clock } from "lucide-react";
import { escalaMock, type EscalaDia, type CaboAuxiliar } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

const Escala = () => {
  const [escala, setEscala] = useState<EscalaDia>(escalaMock);

  const updateCaboNome = (caboId: string, nome: string) => {
    setEscala((prev) => ({
      ...prev,
      cabos: prev.cabos.map((c) => (c.id === caboId ? { ...c, nome } : c)),
    }));
  };

  const updateBloco = (caboId: string, blocoIdx: number, field: "inicio" | "fim", value: string) => {
    setEscala((prev) => ({
      ...prev,
      cabos: prev.cabos.map((c) =>
        c.id === caboId
          ? { ...c, blocos: c.blocos.map((b, i) => (i === blocoIdx ? { ...b, [field]: value } : b)) }
          : c
      ),
    }));
  };

  const addBloco = (caboId: string) => {
    setEscala((prev) => ({
      ...prev,
      cabos: prev.cabos.map((c) =>
        c.id === caboId ? { ...c, blocos: [...c.blocos, { inicio: "08:00", fim: "10:00" }] } : c
      ),
    }));
  };

  const removeBloco = (caboId: string, blocoIdx: number) => {
    setEscala((prev) => ({
      ...prev,
      cabos: prev.cabos.map((c) =>
        c.id === caboId ? { ...c, blocos: c.blocos.filter((_, i) => i !== blocoIdx) } : c
      ),
    }));
  };

  const salvar = () => {
    toast({ title: "Escala Salva", description: `Escala do dia ${escala.data} atualizada.` });
  };

  // Timeline visualization
  const getHourBlocks = (cabo: CaboAuxiliar) => {
    const active = new Set<number>();
    cabo.blocos.forEach((b) => {
      const start = parseInt(b.inicio.split(":")[0]);
      const end = parseInt(b.fim.split(":")[0]);
      if (start < end) {
        for (let h = start; h < end; h++) active.add(h);
      } else {
        for (let h = start; h < 24; h++) active.add(h);
        for (let h = 0; h < end; h++) active.add(h);
      }
    });
    return active;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Escala do Dia
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastro de cabos auxiliares em serviço</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={escala.data}
            onChange={(e) => setEscala({ ...escala, data: e.target.value })}
            className="bg-secondary border-border w-44"
          />
          <Button onClick={salvar}>Salvar Escala</Button>
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="rounded-lg border border-border p-4 mb-6 bg-card">
        <h3 className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> VISUALIZAÇÃO 24H
        </h3>
        <div className="space-y-2">
          {escala.cabos.map((cabo, idx) => {
            const active = getHourBlocks(cabo);
            const colors = [
              "bg-primary/70",
              "bg-accent-foreground/40",
            ];
            return (
              <div key={cabo.id}>
                <p className="text-xs text-muted-foreground mb-1">{cabo.nome || `Cabo ${idx + 1}`}</p>
                <div className="flex gap-px">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div
                      key={h}
                      className={`h-6 flex-1 rounded-sm transition-colors ${active.has(h) ? colors[idx % colors.length] : "bg-secondary"}`}
                      title={`${String(h).padStart(2, "0")}:00`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <div className="flex gap-px mt-1">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="flex-1 text-[8px] text-center text-muted-foreground font-mono">
                {h % 4 === 0 ? `${String(h).padStart(2, "0")}` : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Cabo forms */}
      <div className="grid md:grid-cols-2 gap-4">
        {escala.cabos.map((cabo, idx) => (
          <div key={cabo.id} className="rounded-lg border border-border p-4 bg-card">
            <div className="mb-3">
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">CABO AUXILIAR {idx + 1}</label>
              <Input
                value={cabo.nome}
                onChange={(e) => updateCaboNome(cabo.id, e.target.value)}
                placeholder="Nome do cabo auxiliar"
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">BLOCOS DE HORÁRIO</label>
              {cabo.blocos.map((bloco, bi) => (
                <div key={bi} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={bloco.inicio}
                    onChange={(e) => updateBloco(cabo.id, bi, "inicio", e.target.value)}
                    className="bg-secondary border-border flex-1"
                  />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input
                    type="time"
                    value={bloco.fim}
                    onChange={(e) => updateBloco(cabo.id, bi, "fim", e.target.value)}
                    className="bg-secondary border-border flex-1"
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeBloco(cabo.id, bi)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => addBloco(cabo.id)} className="gap-1 text-xs">
                <Plus className="w-3 h-3" /> Adicionar Bloco
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Escala;
