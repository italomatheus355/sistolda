// SISTOLDA — Modal centralizado de confirmação após autenticação biométrica.
// Mostra Nome + NIP + Data/Hora. Fecha automaticamente após alguns segundos.

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";

export interface AuthConfirmPayload {
  nome: string;
  nip: string;
  descricao?: string;
  modulo?: string;
  /** "ok" (padrão) = autenticação confirmada; "denied" = acesso negado. */
  variant?: "ok" | "denied";
  titulo?: string;
}

const TARGET = "sistolda:auth-confirm";
const AUTO_DISMISS_MS = 3500;
const AUTO_DISMISS_DENIED_MS = 6000;

export function showAuthConfirm(p: AuthConfirmPayload) {
  window.dispatchEvent(new CustomEvent(TARGET, { detail: { variant: "ok", ...p } }));
}

/** Modal vermelho de bloqueio (ex.: militar sem autorização para a chave). */
export function showAuthDenied(p: AuthConfirmPayload) {
  window.dispatchEvent(new CustomEvent(TARGET, { detail: { ...p, variant: "denied" } }));
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
        detail.variant === "denied" ? AUTO_DISMISS_DENIED_MS : AUTO_DISMISS_MS,
      );
      return () => clearTimeout(t);
    };
    window.addEventListener(TARGET, handler);
    return () => window.removeEventListener(TARGET, handler);
  }, []);

  if (!item) return null;

  const denied = item.variant === "denied";

  return (
    <div className="fixed inset-0 z-[210] pointer-events-none flex items-center justify-center p-6">
      <div
        key={item.id}
        className={
          "pointer-events-none relative flex flex-col items-center text-center px-12 py-10 rounded-2xl border bg-card/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 " +
          (denied
            ? "border-destructive/60 shadow-destructive/30"
            : "border-status-available/40 shadow-status-available/20")
        }
        style={{ minWidth: 420, maxWidth: 620 }}
      >
        <div
          className={
            "flex items-center justify-center w-16 h-16 rounded-full border mb-4 " +
            (denied
              ? "bg-destructive/15 border-destructive/50"
              : "bg-status-available/15 border-status-available/40")
          }
        >
          {denied ? (
            <ShieldAlert className="w-9 h-9 text-destructive" strokeWidth={2.2} />
          ) : (
            <CheckCircle2 className="w-9 h-9 text-status-available" strokeWidth={2.2} />
          )}
        </div>

        <p
          className={
            "text-[11px] font-mono tracking-[0.3em] uppercase mb-2 " +
            (denied ? "text-destructive" : "text-muted-foreground")
          }
        >
          {item.titulo || (denied ? "MILITAR NÃO AUTORIZADO" : "AUTENTICAÇÃO CONFIRMADA")}
        </p>

        <h2 className={"text-4xl font-bold leading-tight " + (denied ? "text-destructive" : "text-foreground")}>
          {item.nome}
        </h2>

        {item.nip && (
          <p className={"mt-3 text-sm font-mono tracking-wider " + (denied ? "text-destructive/80" : "text-primary")}>
            NIP: {item.nip}
          </p>
        )}

        <p className="mt-1 text-xs font-mono text-muted-foreground">{item.ts}</p>

        {item.descricao && (
          <p className="mt-4 text-sm text-muted-foreground max-w-md">{item.descricao}</p>
        )}
      </div>
    </div>
  );
}
