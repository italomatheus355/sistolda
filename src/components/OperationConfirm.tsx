// Confirmação operacional centralizada — usada para retirada/devolução/saída/retorno.
// Mostra apenas o NOME do militar (sem NIP), em destaque, com auto-dismiss.

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Car, Package, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "chave" | "viatura" | "material" | "visitante";
interface Payload {
  id: string;
  nome: string;        // só o nome do militar
  acao: string;        // ex: "retirou a chave", "devolveu a chave"
  detalhe?: string;    // ex: "Nº 12 — CPD"
  variant?: Variant;
}

const TARGET = "sistolda:operation-confirm";

export function showOperationConfirm(p: Omit<Payload, "id">) {
  const detail: Payload = { id: Math.random().toString(36).slice(2), ...p };
  window.dispatchEvent(new CustomEvent(TARGET, { detail }));
}

const ICONS: Record<Variant, any> = {
  chave: KeyRound, viatura: Car, material: Package, visitante: Users,
};

export function OperationConfirm() {
  const [item, setItem] = useState<Payload | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Payload>).detail;
      if (!detail) return;
      setItem(detail);
      const t = setTimeout(() => setItem((cur) => (cur?.id === detail.id ? null : cur)), 3200);
      return () => clearTimeout(t);
    };
    window.addEventListener(TARGET, handler);
    return () => window.removeEventListener(TARGET, handler);
  }, []);

  if (!item) return null;
  const Icon = ICONS[item.variant || "chave"];

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center p-6">
      <div
        key={item.id}
        className={cn(
          "pointer-events-none relative flex flex-col items-center text-center",
          "px-10 py-8 rounded-2xl border border-primary/40",
          "bg-card/95 backdrop-blur-md shadow-2xl shadow-primary/20",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
        style={{ minWidth: 380, maxWidth: 560 }}
      >
        <div className="absolute -inset-px rounded-2xl border border-status-available/20 pointer-events-none" />
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-status-available/15 border border-status-available/40 mb-4">
          <CheckCircle2 className="w-9 h-9 text-status-available" strokeWidth={2.2} />
        </div>

        <p className="text-[11px] font-mono tracking-[0.25em] text-muted-foreground uppercase mb-2">
          OPERAÇÃO CONFIRMADA
        </p>

        <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
          {item.nome}
        </h2>

        <p className="mt-3 text-base text-muted-foreground flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span>{item.acao}</span>
        </p>

        {item.detalhe && (
          <p className="mt-1 text-xs font-mono tracking-wider text-primary/80 uppercase">
            {item.detalhe}
          </p>
        )}
      </div>
    </div>
  );
}
