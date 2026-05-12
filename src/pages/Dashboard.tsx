import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Key, Car, Package, Users,
  CheckCircle2, AlertTriangle, Clock, Wrench,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid, LineChart, Line,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api, ApiChave, ApiHistoricoChave, ApiViatura, ApiHistoricoViatura, ApiVisitante, ApiMaterial, SYNC_OPTIONS } from "@/lib/api";
import { DEPARTAMENTOS } from "@/lib/localDb";

const COLORS = {
  green: "hsl(var(--status-available))",
  red: "hsl(var(--status-borrowed))",
  yellow: "hsl(45 93% 58%)",
  primary: "hsl(var(--primary))",
  muted: "hsl(var(--muted-foreground))",
};

function StatCard({ icon: Icon, label, value, tone = "default" }: any) {
  const tones: Record<string, string> = {
    default: "border-border text-foreground",
    green: "border-status-available/40 text-status-available",
    red: "border-status-borrowed/40 text-status-borrowed",
    yellow: "border-yellow-500/40 text-yellow-500",
    primary: "border-primary/40 text-primary",
  };
  return (
    <div className={`bg-card rounded-lg border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">{label}</span>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-3xl font-bold mt-2 font-mono">{value}</p>
    </div>
  );
}

function ChartCard({ title, children, className = "" }: any) {
  return (
    <div className={`bg-card rounded-lg border border-border p-4 ${className}`}>
      <h3 className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============ CHAVES ============
function DashboardChaves() {
  const { data: chaves = [] } = useQuery({
    queryKey: ["chaves"], queryFn: async () => localDb.list<Chave>("chaves"),
  });
  const { data: historico = [] } = useQuery({
    queryKey: ["historico_chaves"],
    queryFn: async () => localDb.list<HistoricoChave>("historico_chaves")
      .sort((a, b) => b.data_retirada.localeCompare(a.data_retirada)),
  });

  const total = chaves.length;
  const fora = chaves.filter((c) => c.status === "emprestada").length;
  const dentro = total - fora;
  const LIMITE_HORAS = 12;
  const atrasadas = historico.filter((h) => {
    if (h.status !== "em_uso") return false;
    const horas = (Date.now() - new Date(h.data_retirada).getTime()) / 36e5;
    return horas > LIMITE_HORAS;
  }).length;

  const pieData = [
    { name: "Dentro", value: dentro, color: COLORS.green },
    { name: "Fora",   value: fora,   color: COLORS.red },
  ];

  const porDepartamento = DEPARTAMENTOS.map((d) => ({
    name: d.label,
    fora: chaves.filter((c) => c.departamento === d.id && c.status === "emprestada").length,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Key} label="Total" value={total} tone="primary" />
        <StatCard icon={AlertTriangle} label="Fora" value={fora} tone="red" />
        <StatCard icon={CheckCircle2} label="Dentro" value={dentro} tone="green" />
        <StatCard icon={Clock} label="Atrasadas" value={atrasadas} tone="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Status das Chaves">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
              {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend />
          </PieChart>
        </ChartCard>

        <ChartCard title="Chaves Fora por Departamento">
          <BarChart data={porDepartamento}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={COLORS.muted} />
            <YAxis allowDecimals={false} stroke={COLORS.muted} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="fora" fill={COLORS.red} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <h3 className="text-xs font-mono tracking-widest text-muted-foreground uppercase p-4 pb-2">Últimas Movimentações</h3>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40 hover:bg-secondary/40">
              <TableHead>Chave</TableHead>
              <TableHead>Militar</TableHead>
              <TableHead>Retirada</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico.slice(0, 8).map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-mono text-xs">Nº {String(h.chave_numero).padStart(2, "0")} — {h.chave_nome}</TableCell>
                <TableCell className="text-sm">{h.militar}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{new Date(h.data_retirada).toLocaleString("pt-BR")}</TableCell>
                <TableCell>
                  <Badge className={h.status === "em_uso" ? "bg-status-borrowed/20 text-status-borrowed border-0" : "bg-primary/20 text-primary border-0"}>
                    {h.status === "em_uso" ? "Em uso" : "Devolvida"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {historico.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">Sem registros</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============ VIATURAS ============
function DashboardViaturas() {
  const { data: viaturas = [] } = useQuery({
    queryKey: ["viaturas"], queryFn: async () => localDb.list<Viatura>("viaturas"),
  });
  const { data: historico = [] } = useQuery({
    queryKey: ["historico_viaturas"],
    queryFn: async () => localDb.list<HistoricoViatura>("historico_viaturas")
      .sort((a, b) => b.data_saida.localeCompare(a.data_saida)),
  });

  const disponivel = viaturas.filter((v) => v.status === "disponivel").length;
  const em_uso = viaturas.filter((v) => v.status === "em_uso").length;
  const manut = viaturas.filter((v) => v.status === "manutencao").length;

  const pieData = [
    { name: "Disponível", value: disponivel, color: COLORS.green },
    { name: "Em uso", value: em_uso, color: COLORS.red },
    { name: "Manutenção", value: manut, color: COLORS.yellow },
  ];

  const utilizacao = viaturas.map((v) => ({
    name: v.prefixo,
    saidas: historico.filter((h) => h.viatura_id === v.id).length,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={CheckCircle2} label="Disponíveis" value={disponivel} tone="green" />
        <StatCard icon={Car} label="Em uso" value={em_uso} tone="red" />
        <StatCard icon={Wrench} label="Manutenção" value={manut} tone="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Status das Viaturas">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
              {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend />
          </PieChart>
        </ChartCard>

        <ChartCard title="Utilização (saídas registradas)">
          <BarChart data={utilizacao}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke={COLORS.muted} />
            <YAxis allowDecimals={false} stroke={COLORS.muted} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="saidas" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <h3 className="text-xs font-mono tracking-widest text-muted-foreground uppercase p-4 pb-2">Últimas Movimentações</h3>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40 hover:bg-secondary/40">
              <TableHead>Viatura</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico.slice(0, 8).map((h) => (
              <TableRow key={h.id}>
                <TableCell className="font-mono text-xs">{h.viatura_prefixo}</TableCell>
                <TableCell className="text-sm">{h.motorista}</TableCell>
                <TableCell className="text-sm">{h.destino}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{new Date(h.data_saida).toLocaleString("pt-BR")}</TableCell>
                <TableCell>
                  <Badge className={h.status === "em_uso" ? "bg-status-borrowed/20 text-status-borrowed border-0" : "bg-primary/20 text-primary border-0"}>
                    {h.status === "em_uso" ? "Em uso" : "Retornada"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {historico.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">Sem registros</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============ MATERIAIS ============
function DashboardMateriais() {
  const { data: registros = [] } = useQuery({
    queryKey: ["registros_materiais"],
    queryFn: async () => localDb.list<RegistroMaterial>("registros_materiais")
      .sort((a, b) => b.data_registro.localeCompare(a.data_registro)),
  });

  const total = registros.length;
  // Sem campo dedicado de devolução, considera-se que os registros são "retiradas"
  const retirados = total;
  const devolvidos = 0;
  const pendencias = retirados - devolvidos;

  // Movimentações por dia (últimos 7 dias)
  const dias: { name: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dias.push({
      name: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      total: registros.filter((r) => r.data_registro.slice(0, 10) === key).length,
    });
  }

  const pieData = [
    { name: "Retirados", value: retirados, color: COLORS.red },
    { name: "Devolvidos", value: devolvidos, color: COLORS.green },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Package} label="Retirados" value={retirados} tone="red" />
        <StatCard icon={CheckCircle2} label="Devolvidos" value={devolvidos} tone="green" />
        <StatCard icon={AlertTriangle} label="Pendências" value={pendencias} tone="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Movimentações (últimos 7 dias)">
          <BarChart data={dias}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke={COLORS.muted} />
            <YAxis allowDecimals={false} stroke={COLORS.muted} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="total" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Status">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
              {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend />
          </PieChart>
        </ChartCard>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <h3 className="text-xs font-mono tracking-widest text-muted-foreground uppercase p-4 pb-2">Últimas Retiradas</h3>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40 hover:bg-secondary/40">
              <TableHead>Material</TableHead>
              <TableHead>Militar</TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.slice(0, 8).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{r.nome_material}</TableCell>
                <TableCell className="text-sm">{r.militar}</TableCell>
                <TableCell className="text-xs font-mono">{r.nip}</TableCell>
                <TableCell className="text-sm">{r.destino}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{new Date(r.data_registro).toLocaleString("pt-BR")}</TableCell>
              </TableRow>
            ))}
            {registros.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">Sem registros</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============ VISITANTES ============
function DashboardVisitantes() {
  const { data: visitantes = [] } = useQuery({
    queryKey: ["visitantes"],
    queryFn: async () => localDb.list<Visitante>("visitantes")
      .sort((a, b) => b.hora_entrada.localeCompare(a.hora_entrada)),
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const ativos = visitantes.filter((v) => !v.hora_saida);
  const entradasHoje = visitantes.filter((v) => v.hora_entrada.slice(0, 10) === hoje).length;
  const saidasHoje = visitantes.filter((v) => v.hora_saida && v.hora_saida.slice(0, 10) === hoje).length;

  const dias = useMemo(() => {
    const out: { name: string; entradas: number; saidas: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({
        name: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        entradas: visitantes.filter((v) => v.hora_entrada.slice(0, 10) === key).length,
        saidas: visitantes.filter((v) => v.hora_saida && v.hora_saida.slice(0, 10) === key).length,
      });
    }
    return out;
  }, [visitantes]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users} label="Ativos no quartel" value={ativos.length} tone="primary" />
        <StatCard icon={CheckCircle2} label="Entradas hoje" value={entradasHoje} tone="green" />
        <StatCard icon={Clock} label="Saídas hoje" value={saidasHoje} tone="yellow" />
      </div>

      <ChartCard title="Movimentação Diária (últimos 7 dias)" className="lg:col-span-2">
        <LineChart data={dias}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" stroke={COLORS.muted} />
          <YAxis allowDecimals={false} stroke={COLORS.muted} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          <Legend />
          <Line type="monotone" dataKey="entradas" stroke={COLORS.green} strokeWidth={2} />
          <Line type="monotone" dataKey="saidas" stroke={COLORS.red} strokeWidth={2} />
        </LineChart>
      </ChartCard>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <h3 className="text-xs font-mono tracking-widest text-muted-foreground uppercase p-4 pb-2">Visitantes no Quartel</h3>
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40 hover:bg-secondary/40">
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Entrada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ativos.slice(0, 10).map((v) => (
              <TableRow key={v.id}>
                <TableCell className="text-sm">{v.nome}</TableCell>
                <TableCell className="text-xs font-mono">{v.documento}</TableCell>
                <TableCell className="text-sm">{v.militar_responsavel}</TableCell>
                <TableCell className="text-sm">{v.local_destino}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{new Date(v.hora_entrada).toLocaleString("pt-BR")}</TableCell>
              </TableRow>
            ))}
            {ativos.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">Nenhum visitante no quartel</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" /> Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Centro operacional — visão consolidada do quartel</p>
        </div>
      </div>

      <Tabs defaultValue="chaves">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="chaves" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Key className="w-3.5 h-3.5 mr-1.5" /> Chaves
          </TabsTrigger>
          <TabsTrigger value="viaturas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Car className="w-3.5 h-3.5 mr-1.5" /> Viaturas
          </TabsTrigger>
          <TabsTrigger value="materiais" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="w-3.5 h-3.5 mr-1.5" /> Materiais
          </TabsTrigger>
          <TabsTrigger value="visitantes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-3.5 h-3.5 mr-1.5" /> Visitantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chaves"><DashboardChaves /></TabsContent>
        <TabsContent value="viaturas"><DashboardViaturas /></TabsContent>
        <TabsContent value="materiais"><DashboardMateriais /></TabsContent>
        <TabsContent value="visitantes"><DashboardVisitantes /></TabsContent>
      </Tabs>
    </div>
  );
}
