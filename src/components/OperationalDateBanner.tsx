// SISTOLDA — Banner da data operacional. Atualiza automaticamente à meia-noite.
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

function fmt(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}
function msUntilMidnight() {
  const n = new Date();
  const m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 5, 0);
  return m.getTime() - n.getTime();
}

export function OperationalDateBanner({ label = "DIA OPERACIONAL" }: { label?: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let t: number | undefined;
    const schedule = () => {
      t = window.setTimeout(() => { setNow(new Date()); schedule(); }, msUntilMidnight());
    };
    schedule();
    // também atualiza a cada minuto (caso o servidor mude o relógio ou aba volte do background)
    const i = window.setInterval(() => setNow(new Date()), 60_000);
    return () => { if (t) window.clearTimeout(t); window.clearInterval(i); };
  }, []);

  return (
    <div className="mb-4 flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2.5">
      <CalendarDays className="w-4 h-4 text-primary" />
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
        <span className="text-[10px] font-mono tracking-[0.25em] text-primary uppercase">{label}</span>
        <span className="text-sm font-semibold text-foreground capitalize">{fmt(now)}</span>
      </div>
    </div>
  );
}
