import { useState } from "react";
import { Calendar, Plus, Trash2, Clock, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface EscalaCabo {
  id: string;
  data: string;
  cabo_id: number;
  cabo_nome: string;
  blocos: unknown;
}

type BlocoHorario = { inicio: string; fim: string };
const parseBlocos = (blocos: unknown): BlocoHorario[] => {
  if (!Array.isArray(blocos)) return [{ inicio: "08:00", fim: "20:00" }];
  return blocos as BlocoHorario[];
};

const today = new Date().toISOString().split("T")[0];

const Escala = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: escalas = [], isLoading } = useQuery({
    queryKey: ["escala_cabos", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escala_cabos")
        .select("*")
        .eq("data", selectedDate)
        .order("cabo_id");
      if (error) throw error;
      return data as EscalaCabo[];
    },
  });

  // Local state for editing
  const [cabos, setCabos] = useState<{ cabo_id: number; cabo_nome: string; blocos: { inicio: string; fim: string }[] }[]>([]);

  // Sync escalas to cabos when data changes
  const initCabos = () => {
    const initialized = [1, 2].map((cabo_id) => {
      const existing = escalas.find((e) => e.cabo_id === cabo_id);
      return {
        cabo_id,
        cabo_nome: existing?.cabo_nome || "",
        blocos: parseBlocos(existing?.blocos),
      };
    });
    setCabos(initialized);
  };

  // Initialize when escalas load
  useState(() => { initCabos(); });

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const cabo of cabos) {
        if (!cabo.cabo_nome.trim()) continue;
        const { data: existing } = await supabase
          .from("escala_cabos")
          .select("id")
          .eq("data", selectedDate)
          .eq("cabo_id", cabo.cabo_id)
          .single();

        if (existing) {
          await supabase.from("escala_cabos").update({
            cabo_nome: cabo.cabo_nome,
            blocos: cabo.blocos as any,
          }).eq("id", existing.id);
        } else {
          await supabase.from("escala_cabos").insert({
            data: selectedDate,
            cabo_id: cabo.cabo_id,
            cabo_nome: cabo.cabo_nome,
            blocos: cabo.blocos as any,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escala_cabos"] });
      toast({ title: "Escala Salva", description: `Escala de ${new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR")} atualizada.` });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" }),
  });

  const updateCaboNome = (idx: number, nome: string) => {
    setCabos(prev => prev.map((c, i) => i === idx ? { ...c, cabo_nome: nome } : c));
  };

  const updateBloco = (caboIdx: number, blocoIdx: number, field: "inicio" | "fim", value: string) => {
    setCabos(prev => prev.map((c, i) =>
      i === caboIdx ? { ...c, blocos: c.blocos.map((b, bi) => bi === blocoIdx ? { ...b, [field]: value } : b) } : c
    ));
  };

  const addBloco = (caboIdx: number) => {
    setCabos(prev => prev.map((c, i) =>
      i === caboIdx ? { ...c, blocos: [...c.blocos, { inicio: "08:00", fim: "10:00" }] } : c
    ));
  };

  const removeBloco = (caboIdx: number, blocoIdx: number) => {
    setCabos(prev => prev.map((c, i) =>
      i === caboIdx ? { ...c, blocos: c.blocos.filter((_, bi) => bi !== blocoIdx) } : c
    ));
  };

  const getHourBlocks = (blocos: { inicio: string; fim: string }[]) => {
    const active = new Set<number>();
    blocos.forEach((b) => {
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

  // Determine current on-duty from local state
  const getCurrentOnDuty = () => {
    if (selectedDate !== today) return null;
    const curr = new Date().getHours();
    for (const cabo of cabos) {
      const active = getHourBlocks(cabo.blocos);
      if (active.has(curr)) return cabo.cabo_nome || `Cabo ${cabo.cabo_id}`;
    }
    return "Não definido";
  };

  const currentOnDuty = getCurrentOnDuty();

  // Initialize cabos from escalas when query returns
  if (escalas.length > 0 && cabos.length === 0) {
    initCabos();
  }
  if (cabos.length === 0) {
    initCabos();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Escala de Serviço
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Cabos auxiliares em serviço — ciclo 24h</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setCabos([]); }}
            className="bg-secondary border-border w-44"
          />
          {isAdmin && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          )}
        </div>
      </div>

      {/* Em serviço agora */}
      {selectedDate === today && currentOnDuty && (
        <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5">
          <p className="text-xs font-mono text-primary mb-1">EM SERVIÇO AGORA</p>
          <p className="text-lg font-bold text-foreground">{currentOnDuty}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">{new Date().toLocaleTimeString("pt-BR")} — baseado na escala cadastrada</p>
        </div>
      )}

      {/* Timeline visualization */}
      <div className="rounded-lg border border-border p-4 mb-6 bg-card">
        <h3 className="text-xs font-mono text-muted-foreground mb-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> VISUALIZAÇÃO 24H
        </h3>
        <div className="space-y-3">
          {cabos.map((cabo, idx) => {
            const active = getHourBlocks(cabo.blocos);
            const colors = ["bg-primary/70", "bg-accent-foreground/40"];
            return (
              <div key={cabo.cabo_id}>
                <p className="text-xs text-muted-foreground mb-1">{cabo.cabo_nome || `Cabo Auxiliar ${idx + 1}`}</p>
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
          <div className="flex gap-px">
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
        {cabos.map((cabo, idx) => (
          <div key={cabo.cabo_id} className="rounded-lg border border-border p-4 bg-card">
            <div className="mb-3">
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">CABO AUXILIAR {idx + 1}</label>
              <Input
                value={cabo.cabo_nome}
                onChange={(e) => updateCaboNome(idx, e.target.value)}
                placeholder="Nome do cabo auxiliar"
                className="bg-secondary border-border"
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">BLOCOS DE HORÁRIO</label>
              {cabo.blocos.map((bloco, bi) => (
                <div key={bi} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={bloco.inicio}
                    onChange={(e) => updateBloco(idx, bi, "inicio", e.target.value)}
                    className="bg-secondary border-border flex-1"
                    disabled={!isAdmin}
                  />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input
                    type="time"
                    value={bloco.fim}
                    onChange={(e) => updateBloco(idx, bi, "fim", e.target.value)}
                    className="bg-secondary border-border flex-1"
                    disabled={!isAdmin}
                  />
                  {isAdmin && (
                    <Button size="icon" variant="ghost" onClick={() => removeBloco(idx, bi)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => addBloco(idx)} className="gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Adicionar Bloco
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <p className="text-center text-xs text-muted-foreground mt-4 font-mono">Somente administradores podem editar a escala</p>
      )}
    </div>
  );
};

export default Escala;
