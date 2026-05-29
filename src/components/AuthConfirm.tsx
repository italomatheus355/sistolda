// SISTOLDA — Modal centralizado de confirmação após autenticação biométrica.
// Mostra Nome + NIP + Data/Hora. Fecha automaticamente após alguns segundos.

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export interface AuthConfirmPayload {
  nome: string;
  nip: string;
  descricao?: string;
  modulo?: string;
}

const TARGET = "sistolda:auth-confirm";
const AUTO_DISMISS_MS = 3500;

export function showAuthConfirm(p: AuthConfirmPayload) {
  window.dispatchEvent(new CustomEvent(TARGET, { detail: p }));
}

export function AuthConfirm() {
  const [item, setItem] = useState<(AuthConfirmPayload & { ts: string; id: string }) | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AuthConfirmPayload>).detail;
      if (!detail) return;
      const id = Math.random().toString(36).slice(2);
      setItem({ ...detail, ts: new Date().toLocaleString("pt-BR"), id });
      const t = setTimeout(
        () => setItem((cur) => (cur?.id === id ? null : cur)),
        AUTO_DISMISS_MS,
      );
      return () => clearTimeout(t);
    };
    window.addEventListener(TARGET, handler);
    return () => window.removeEventListener(TARGET, handler);
  }, []);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[210] pointer-events-none flex items-center justify-center p-6">
      <div
        key={item.id}
        className="pointer-events-none relative flex flex-col items-center text-center px-12 py-10 rounded-2xl border border-status-available/40 bg-card/95 backdrop-blur-md shadow-2xl shadow-status-available/20 animate-in fade-in zoom-in-95 duration-200"
        style={{ minWidth: 420, maxWidth: 620 }}
      >
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-status-available/15 border border-status-available/40 mb-4">
          <CheckCircle2 className="w-9 h-9 text-status-available" strokeWidth={2.2} />
        </div>

        <p className="text-[11px] font-mono tracking-[0.3em] text-muted-foreground uppercase mb-2">
          AUTENTICAÇÃO CONFIRMADA
        </p>

        <h2 className="text-4xl font-bold text-foreground leading-tight">
          {item.nome}
        </h2>

        <p className="mt-3 text-sm font-mono tracking-wider text-primary">
          NIP: {item.nip}
        </p>

        <p className="mt-1 text-xs font-mono text-muted-foreground">
          {item.ts}
        </p>

        {item.descricao && (
          <p className="mt-4 text-sm text-muted-foreground max-w-md">
            {item.descricao}
          </p>
        )}
      </div>
    </div>
  );
}
