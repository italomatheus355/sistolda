// SISTOLDA — Administração > Gerenciamento de Chaves.
// Permite administrar, de forma persistente, quem pode retirar cada chave.
import { useMemo, useState } from "react";
import { KeyRound, Plus, Trash2, Search, ShieldCheck, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiChaveMatriz, ApiChaveAutorizacao, ApiPessoa, SYNC_OPTIONS } from "@/lib/api";
import { OperationalDateBanner } from "@/components/OperationalDateBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

// Normaliza texto para busca: minúsculas, sem acentos e sem pontuação supérflua.
const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const digits = (s: string) => (s || "").replace(/\D/g, "");

export default function GerenciamentoChaves() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [addFor, setAddFor] = useState<ApiChaveMatriz | null>(null);
  const [pessoaQuery, setPessoaQuery] = useState("");
  const [pessoaSel, setPessoaSel] = useState<ApiPessoa | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ aut: ApiChaveAutorizacao; chave: ApiChaveMatriz } | null>(null);
  const [editFor, setEditFor] = useState<ApiChaveMatriz | null>(null);
  const [editForm, setEditForm] = useState<{ numero: string; nome: string; categoria: "secreta" | "geral" }>({
    numero: "", nome: "", categoria: "geral",
  });


  const { data: matriz = [], isLoading } = useQuery({
    queryKey: ["chaves-autorizacoes"], queryFn: api.listChaveAutorizacoes, ...SYNC_OPTIONS,
  });
  const { data: pessoas = [] } = useQuery({ queryKey: ["pessoas"], queryFn: () => api.listPessoas() });

  const add = useMutation({
    mutationFn: () => api.addChaveAutorizacao({ chave_numero: addFor!.numero, pessoa_id: pessoaSel!.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chaves-autorizacoes"] });
      toast({ title: "Autorização adicionada" });
      setAddFor(null); setPessoaSel(null); setPessoaQuery("");
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.removeChaveAutorizacao(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chaves-autorizacoes"] });
      toast({ title: "Autorização removida", description: "O militar continua cadastrado no sistema." });
      setConfirmDel(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const editar = useMutation({
    mutationFn: () =>
      api.updateChaveConfig(editFor!.numero, {
        numero: Number(editForm.numero),
        nome: editForm.nome.trim(),
        categoria: editForm.categoria,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chaves-autorizacoes"] });
      qc.invalidateQueries({ queryKey: ["chaves"] });
      toast({ title: "Chave atualizada", description: "As autorizações foram preservadas." });
      setEditFor(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtradas = useMemo(() => {
    const q = norm(busca);
    if (!q) return matriz;
    const qd = digits(busca);

    // Pessoas que casam com a busca (nome, NIP ou CPF) — usadas para localizar
    // as chaves em que esse militar possui autorização.
    const pessoasAlvo = pessoas.filter((p) => {
      const nomeOk = norm(`${p.posto_graduacao || ""} ${p.nome}`).includes(q);
      const idOk = !!qd && (digits(p.identificador || "").includes(qd) || digits(p.cpf || "").includes(qd));
      return nomeOk || idOk;
    });
    const nipsAlvo = new Set(pessoasAlvo.map((p) => digits(p.identificador || "")).filter(Boolean));
    const nomesAlvo = pessoasAlvo.map((p) => norm(p.nome)).filter(Boolean);

    return matriz.filter((c) => {
      if (String(c.numero).padStart(2, "0").includes(q) || String(c.numero) === q) return true;
      if (norm(c.nome).includes(q)) return true;
      if (norm(c.regra_label || "").includes(q)) return true;
      return c.autorizados.some((a) => {
        const nomeRef = norm(a.nome_ref);
        const nipRef = digits(a.nip || "");
        if (nomeRef.includes(q)) return true;
        if (qd && nipRef.includes(qd)) return true;
        if (nipRef && nipsAlvo.has(nipRef)) return true;
        return nomesAlvo.some((n) => n && (nomeRef.includes(n) || n.includes(nomeRef)));
      });
    });
  }, [matriz, busca, pessoas]);

  const pessoasFiltradas = useMemo(() => {
    const q = norm(pessoaQuery).replace(/\./g, "");
    if (!q) return pessoas.slice(0, 12);
    const qd = digits(pessoaQuery);
    return pessoas.filter((p) =>
      norm(`${p.posto_graduacao || ""} ${p.nome}`).includes(q) ||
      (!!qd && digits(p.identificador || "").includes(qd)) ||
      (!!qd && digits(p.cpf || "").includes(qd)),
    ).slice(0, 12);
  }, [pessoas, pessoaQuery]);

  const abrirEdicao = (c: ApiChaveMatriz) => {
    setEditForm({ numero: String(c.numero), nome: c.nome, categoria: c.categoria });
    setEditFor(c);
  };


  return (
    <div className="p-6 space-y-5">
      <OperationalDateBanner />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" /> Gerenciamento de Chaves
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Matriz de autorização persistente — alterações valem imediatamente.
          </p>
        </div>
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar chave, local, militar, NIP ou CPF"
            className="pl-9 bg-secondary border-border"
          />
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground font-mono">Carregando matriz...</p>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtradas.map((c) => (
          <Card key={c.numero} className="p-4 bg-card border-border flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-2xl font-bold leading-none">{String(c.numero).padStart(2, "0")}</p>
                <p className="text-sm font-medium mt-1">{c.nome}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant={c.categoria === "secreta" ? "destructive" : "secondary"} className="uppercase text-[10px]">
                  {c.categoria}
                </Badge>
                <button
                  onClick={() => abrirEdicao(c)}
                  className="text-muted-foreground hover:text-primary p-1 rounded"
                  aria-label={`Editar chave ${c.numero}`}
                  title="Editar chave"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>


            <p className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> {c.regra_label}
            </p>

            <div className="space-y-1">
              {c.autorizados.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhum militar nominal autorizado.</p>
              )}
              {c.autorizados.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 bg-secondary/60 rounded px-2 py-1">
                  <span className="text-xs truncate">
                    {a.nome_ref}
                    {a.condicional ? <span className="text-muted-foreground"> (somente de serviço)</span> : null}
                    {a.nip ? <span className="text-muted-foreground font-mono"> · {a.nip}</span> : null}
                  </span>
                  <button
                    onClick={() => setConfirmDel({ aut: a, chave: c })}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label={`Remover ${a.nome_ref}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <Button size="sm" variant="outline" className="mt-auto" onClick={() => { setAddFor(c); setPessoaSel(null); setPessoaQuery(""); }}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar militar
            </Button>
          </Card>
        ))}
      </div>

      {/* Adicionar autorização */}
      <Dialog open={!!addFor} onOpenChange={(v) => { if (!v) { setAddFor(null); setPessoaSel(null); } }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Autorizar militar — Chave {addFor ? String(addFor.numero).padStart(2, "0") : ""}
            </DialogTitle>
            <DialogDescription>{addFor?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-mono text-muted-foreground mb-1.5 block">BUSCAR PESSOA (NOME, NIP OU CPF)</Label>
              <Input
                value={pessoaQuery} onChange={(e) => { setPessoaQuery(e.target.value); setPessoaSel(null); }}
                placeholder="Digite para buscar no cadastro"
                className="bg-secondary border-border" autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded p-1">
              {pessoasFiltradas.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhuma pessoa encontrada.</p>}
              {pessoasFiltradas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPessoaSel(p)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm ${pessoaSel?.id === p.id ? "bg-primary/20 text-primary" : "hover:bg-secondary"}`}
                >
                  {[p.posto_graduacao, p.nome].filter(Boolean).join(" ")}
                  <span className="text-muted-foreground font-mono text-xs"> · {p.identificador}</span>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFor(null)}>Cancelar</Button>
            <Button disabled={!pessoaSel || add.isPending} onClick={() => add.mutate()}>
              {add.isPending ? "Salvando..." : "Autorizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar remoção */}
      <AlertDialog open={!!confirmDel} onOpenChange={(v) => { if (!v) setConfirmDel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover autorização?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel && `${confirmDel.aut.nome_ref} deixará de poder retirar a chave Nº ${String(confirmDel.chave.numero).padStart(2, "0")} — ${confirmDel.chave.nome}. O cadastro do militar não será excluído.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && del.mutate(confirmDel.aut.id)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
