// SISTOLDA — Captura biométrica por NIP (leitor Keyboard Wedge).
// O leitor já validou a digital e envia "<NIP>\n". Este componente:
//  - mantém um input em foco permanente;
//  - recupera o foco se o operador clicar fora;
//  - ao receber ENTER, dispara onCapture(nip) e limpa o campo;
//  - não armazena, processa ou valida digitais — apenas o NIP autenticado.

import { useEffect, useRef, useState } from "react";
import { Fingerprint } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  onCapture: (nip: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  /** Quando true (padrão), o componente reconquista o foco se o usuário clicar fora. */
  autoRefocus?: boolean;
}

export function BiometricCapture({
  onCapture,
  disabled = false,
  label = "AGUARDANDO BIOMETRIA",
  hint = "Posicione o dedo no leitor — o NIP será capturado automaticamente.",
  className,
  autoRefocus = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!autoRefocus || disabled) return;
    const refocus = () => {
      // pequeno delay para não brigar com cliques em botões/diálogos
      setTimeout(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }, 50);
    };
    window.addEventListener("click", refocus);
    window.addEventListener("focusin", refocus);
    return () => {
      window.removeEventListener("click", refocus);
      window.removeEventListener("focusin", refocus);
    };
  }, [autoRefocus, disabled]);

  const submit = (raw: string) => {
    const nip = raw.replace(/\D/g, "").trim();
    setValue("");
    if (!nip) return;
    setPulse(true);
    setTimeout(() => setPulse(false), 400);
    onCapture(nip);
    // foca novamente para próxima leitura
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-secondary/30 px-4 py-5 text-center transition-colors",
        pulse && "border-status-available bg-status-available/10",
        disabled && "opacity-50",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      <Fingerprint
        className={cn(
          "h-8 w-8 transition-colors",
          pulse ? "text-status-available" : "text-primary animate-pulse",
        )}
      />
      <p className="text-[11px] font-mono tracking-[0.25em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-xs text-muted-foreground max-w-[280px]">{hint}</p>

      {/* Input invisível (mas acessível) — recebe o NIP do Keyboard Wedge */}
      <Input
        ref={inputRef}
        value={value}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit(value);
          }
        }}
        onBlur={() => {
          if (autoRefocus && !disabled) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        aria-label="Captura biométrica por NIP"
        className="sr-only"
      />
    </div>
  );
}
