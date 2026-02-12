import { useState } from "react";
import { Key, History, Search, Fingerprint, RotateCcw } from "lucide-react";
import { chavesMock, historicoMock, type Chave } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

const Chaves = () => {
  const [chaves, setChaves] = useState(chavesMock);
  const [selectedChave, setSelectedChave] = useState<Chave | null>(null);
  const [dialogType, setDialogType] = useState<"retirada" | "devolucao" | null>(null);
  const [matricula, setMatricula] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChaves = chaves.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.departamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCardClick = (chave: Chave) => {
    setSelectedChave(chave);
    setDialogType(chave.status === "disponivel" ? "retirada" : "devolucao");
    setMatricula("");
  };

  const handleRetirada = () => {
    if (!matricula.trim()) {
      toast({ title: "Erro", description: "Informe a matrícula do militar.", variant: "destructive" });
      return;
    }
    setChaves((prev) =>
      prev.map((c) =>
        c.id === selectedChave?.id ? { ...c, status: "emprestada" as const, militarResponsavel: `Mat. ${matricula}` } : c
      )
    );
    toast({ title: "Chave Retirada", description: `${selectedChave?.nome} registrada com sucesso.` });
    setDialogType(null);
    setSelectedChave(null);
  };

  const handleDevolucao = () => {
    setChaves((prev) =>
      prev.map((c) =>
        c.id === selectedChave?.id ? { ...c, status: "disponivel" as const, militarResponsavel: undefined } : c
      )
    );
    toast({ title: "Chave Devolvida", description: `${selectedChave?.nome} devolvida com sucesso.` });
    setDialogType(null);
    setSelectedChave(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" />
            Chaves
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de retirada e devolução de chaves</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="status-dot-available" /> {chaves.filter(c => c.status === "disponivel").length} disponíveis</span>
          <span className="flex items-center gap-1.5"><span className="status-dot-borrowed" /> {chaves.filter(c => c.status === "emprestada").length} emprestadas</span>
        </div>
      </div>

      <Tabs defaultValue="visao-geral">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="visao-geral" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Visão Geral</TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-3.5 h-3.5 mr-1.5" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar chave, departamento ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredChaves.map((chave) => (
              <button
                key={chave.id}
                onClick={() => handleCardClick(chave)}
                className={`relative p-4 rounded-lg border transition-all duration-200 text-left hover:scale-[1.02] ${
                  chave.status === "disponivel"
                    ? "bg-card border-status-available/30 hover:border-status-available/60 card-glow"
                    : "bg-card border-status-borrowed/30 hover:border-status-borrowed/60"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={chave.status === "disponivel" ? "status-dot-available" : "status-dot-borrowed"} />
                  <span className="text-[10px] font-mono text-muted-foreground">{chave.codigo}</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground truncate">{chave.nome}</h3>
                <p className="text-xs text-muted-foreground mt-1">{chave.departamento}</p>
                {chave.militarResponsavel && (
                  <p className="text-[10px] text-status-borrowed mt-2 font-mono truncate">{chave.militarResponsavel}</p>
                )}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <TableHead className="text-xs font-mono">CHAVE</TableHead>
                  <TableHead className="text-xs font-mono">DEPARTAMENTO</TableHead>
                  <TableHead className="text-xs font-mono">MILITAR</TableHead>
                  <TableHead className="text-xs font-mono">RETIRADA</TableHead>
                  <TableHead className="text-xs font-mono">DEVOLUÇÃO</TableHead>
                  <TableHead className="text-xs font-mono">CABO AUX.</TableHead>
                  <TableHead className="text-xs font-mono">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicoMock.map((h) => (
                  <TableRow key={h.id} className="hover:bg-secondary/30">
                    <TableCell className="text-sm font-medium">{h.item}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.departamento}</TableCell>
                    <TableCell className="text-sm">{h.militar}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{h.dataRetirada}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{h.dataDevolucao || "—"}</TableCell>
                    <TableCell className="text-sm">{h.caboAuxiliar}</TableCell>
                    <TableCell>
                      <Badge variant={h.status === "devolvida" ? "default" : "destructive"} className={h.status === "devolvida" ? "bg-primary/20 text-primary border-0" : ""}>
                        {h.status === "devolvida" ? "Devolvida" : "Em uso"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Retirada Dialog */}
      <Dialog open={dialogType === "retirada"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Retirada de Chave
            </DialogTitle>
            <DialogDescription>
              {selectedChave?.nome} — {selectedChave?.departamento}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1.5 block">MATRÍCULA / ID DO MILITAR</label>
              <Input
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: 12345"
                className="bg-secondary border-border"
              />
            </div>
            <Button className="w-full gap-2" variant="outline" disabled>
              <Fingerprint className="w-4 h-4" />
              Ler Biometria
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">Integração biométrica pendente — use matrícula</p>
            <Button onClick={handleRetirada} className="w-full">
              Confirmar Retirada
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Devolução Dialog */}
      <Dialog open={dialogType === "devolucao"} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              Devolução de Chave
            </DialogTitle>
            <DialogDescription>
              {selectedChave?.nome} — Em uso por {selectedChave?.militarResponsavel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-md bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground font-mono">CABO AUXILIAR EM SERVIÇO</p>
              <p className="text-sm font-semibold text-foreground mt-1">Cb Pereira (auto-identificado)</p>
            </div>
            <Button onClick={handleDevolucao} className="w-full">
              Confirmar Devolução
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Chaves;
