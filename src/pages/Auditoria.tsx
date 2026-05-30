import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Filter, RefreshCw } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const MODULOS = ["", "chaves", "viaturas", "visitantes", "materiais", "auth", "usuarios", "sistema"];

export default function Auditoria() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;

  const [filters, setFilters] = useState({ modulo: "", usuario: "", nip: "", dataIni: "", dataFim: "" });

  const { data = [], refetch, isFetching } = useQuery({
    queryKey: ["auditoria", filters],
    queryFn: () => api.listAuditoria({ ...filters, limit: 500 }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" /> Auditoria
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Registro completo de operações críticas</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-3 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        <Select value={filters.modulo || "all"} onValueChange={(v) => setFilters({ ...filters, modulo: v === "all" ? "" : v })}>
          <SelectTrigger className="bg-secondary border-border h-9">
            <Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os módulos</SelectItem>
            {MODULOS.filter(Boolean).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Usuário" value={filters.usuario} onChange={(e) => setFilters({ ...filters, usuario: e.target.value })} className="bg-secondary border-border h-9" />
        <Input placeholder="NIP" value={filters.nip} onChange={(e) => setFilters({ ...filters, nip: e.target.value })} className="bg-secondary border-border h-9" />
        <Input type="date" value={filters.dataIni} onChange={(e) => setFilters({ ...filters, dataIni: e.target.value })} className="bg-secondary border-border h-9" />
        <Input type="date" value={filters.dataFim} onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })} className="bg-secondary border-border h-9" />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs font-mono">DATA/HORA</TableHead>
              <TableHead className="text-xs font-mono">MÓDULO</TableHead>
              <TableHead className="text-xs font-mono">AÇÃO</TableHead>
              <TableHead className="text-xs font-mono">USUÁRIO</TableHead>
              <TableHead className="text-xs font-mono">MILITAR / NIP</TableHead>
              <TableHead className="text-xs font-mono">DESCRIÇÃO</TableHead>
              <TableHead className="text-xs font-mono">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">Nenhum registro</TableCell></TableRow>
            ) : data.map((l) => (
              <TableRow key={l.id} className="hover:bg-secondary/30">
                <TableCell className="text-xs font-mono whitespace-nowrap">{new Date(l.timestamp).toLocaleString("pt-BR")}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] font-mono uppercase">{l.modulo || "—"}</Badge></TableCell>
                <TableCell className="text-xs font-mono uppercase text-muted-foreground">{l.acao || "—"}</TableCell>
                <TableCell className="text-xs font-mono">
                  {l.usuario || "—"}
                  {l.perfil && <span className="ml-1 text-[10px] text-muted-foreground">({l.perfil})</span>}
                </TableCell>
                <TableCell className="text-xs">
                  {l.nome || "—"}
                  {l.nip && <span className="ml-1 font-mono text-muted-foreground">NIP {l.nip}</span>}
                </TableCell>
                <TableCell className="text-xs max-w-md">{l.descricao || "—"}</TableCell>
                <TableCell className="text-[10px] font-mono text-muted-foreground">{l.ip || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
