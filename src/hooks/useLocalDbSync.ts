import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeChanges } from "@/lib/localDb";

/** Invalida queries quando o localDb muda em qualquer lugar do app. */
export function useLocalDbSync() {
  const qc = useQueryClient();
  useEffect(() => {
    return subscribeChanges((key) => {
      qc.invalidateQueries({ queryKey: [key] });
    });
  }, [qc]);
}
