export interface Chave {
  id: string;
  nome: string;
  departamento: string;
  codigo: string;
  status: "disponivel" | "emprestada";
  militarResponsavel?: string;
}

export interface Viatura {
  id: string;
  prefixo: string;
  modelo: string;
  setor: string;
  status: "disponivel" | "em_uso" | "manutencao";
  militarResponsavel?: string;
}

export interface Visitante {
  id: string;
  nome: string;
  documento: string;
  militarResponsavel: string;
  localDestino: string;
  horaEntrada: string;
  horaSaida?: string;
}

export interface Material {
  id: string;
  nome: string;
  codigoPatrimonio: string;
  setor: string;
  status: "disponivel" | "emprestado";
  militarResponsavel?: string;
}

export interface HistoricoItem {
  id: string;
  item: string;
  departamento: string;
  militar: string;
  dataRetirada: string;
  dataDevolucao?: string;
  caboAuxiliar: string;
  status: "em_uso" | "devolvida";
}

export interface CaboAuxiliar {
  id: string;
  nome: string;
  blocos: { inicio: string; fim: string }[];
}

export interface EscalaDia {
  data: string;
  cabos: CaboAuxiliar[];
}

export const chavesMock: Chave[] = [
  { id: "1", nome: "Sala Comando", departamento: "Comando", codigo: "CH-001", status: "disponivel" },
  { id: "2", nome: "Almoxarifado", departamento: "Logística", codigo: "CH-002", status: "emprestada", militarResponsavel: "Sd Silva" },
  { id: "3", nome: "Sala Rádio", departamento: "Comunicações", codigo: "CH-003", status: "disponivel" },
  { id: "4", nome: "Garagem", departamento: "Transporte", codigo: "CH-004", status: "emprestada", militarResponsavel: "Cb Santos" },
  { id: "5", nome: "Paiol", departamento: "Armamento", codigo: "CH-005", status: "disponivel" },
  { id: "6", nome: "Refeitório", departamento: "Apoio", codigo: "CH-006", status: "disponivel" },
  { id: "7", nome: "Enfermaria", departamento: "Saúde", codigo: "CH-007", status: "emprestada", militarResponsavel: "Sgt Oliveira" },
  { id: "8", nome: "Arquivo", departamento: "Admin", codigo: "CH-008", status: "disponivel" },
  { id: "9", nome: "Lab Info", departamento: "TI", codigo: "CH-009", status: "disponivel" },
  { id: "10", nome: "Depósito", departamento: "Logística", codigo: "CH-010", status: "emprestada", militarResponsavel: "Sd Costa" },
  { id: "11", nome: "Sala Briefing", departamento: "Operações", codigo: "CH-011", status: "disponivel" },
  { id: "12", nome: "Oficina", departamento: "Manutenção", codigo: "CH-012", status: "disponivel" },
];

export const viaturasMock: Viatura[] = [
  { id: "1", prefixo: "VTR-001", modelo: "Hilux SW4", setor: "Comando", status: "disponivel" },
  { id: "2", prefixo: "VTR-002", modelo: "L200 Triton", setor: "Patrulha", status: "em_uso", militarResponsavel: "Sgt Almeida" },
  { id: "3", prefixo: "VTR-003", modelo: "Ranger", setor: "Logística", status: "manutencao" },
  { id: "4", prefixo: "VTR-004", modelo: "Blazer", setor: "Operações", status: "disponivel" },
  { id: "5", prefixo: "VTR-005", modelo: "Amarok", setor: "Transporte", status: "em_uso", militarResponsavel: "Cb Lima" },
  { id: "6", prefixo: "VTR-006", modelo: "Frontier", setor: "Apoio", status: "disponivel" },
];

export const visitantesMock: Visitante[] = [
  { id: "1", nome: "João Carlos Mendes", documento: "RG 12.345.678-9", militarResponsavel: "Cap Ferreira", localDestino: "Sala Comando", horaEntrada: "08:30", horaSaida: "10:15" },
  { id: "2", nome: "Maria Souza Lima", documento: "RG 98.765.432-1", militarResponsavel: "Ten Barbosa", localDestino: "Almoxarifado", horaEntrada: "09:00" },
  { id: "3", nome: "Pedro Henrique Alves", documento: "CPF 123.456.789-00", militarResponsavel: "Sgt Oliveira", localDestino: "Enfermaria", horaEntrada: "10:45", horaSaida: "11:30" },
];

export const materiaisMock: Material[] = [
  { id: "1", nome: "Rádio HT", codigoPatrimonio: "MAT-001", setor: "Comunicações", status: "disponivel" },
  { id: "2", nome: "Binóculo", codigoPatrimonio: "MAT-002", setor: "Operações", status: "emprestado", militarResponsavel: "Sd Rocha" },
  { id: "3", nome: "GPS Portátil", codigoPatrimonio: "MAT-003", setor: "Navegação", status: "disponivel" },
  { id: "4", nome: "Lanterna Tática", codigoPatrimonio: "MAT-004", setor: "Operações", status: "emprestado", militarResponsavel: "Cb Martins" },
  { id: "5", nome: "Kit Primeiros Socorros", codigoPatrimonio: "MAT-005", setor: "Saúde", status: "disponivel" },
  { id: "6", nome: "Megafone", codigoPatrimonio: "MAT-006", setor: "Comunicações", status: "disponivel" },
  { id: "7", nome: "Detector de Metal", codigoPatrimonio: "MAT-007", setor: "Segurança", status: "emprestado", militarResponsavel: "Sgt Nunes" },
  { id: "8", nome: "Câmera Portátil", codigoPatrimonio: "MAT-008", setor: "Intel", status: "disponivel" },
];

export const historicoMock: HistoricoItem[] = [
  { id: "1", item: "Sala Comando", departamento: "Comando", militar: "Sgt Almeida", dataRetirada: "12/02/2026 08:30", dataDevolucao: "12/02/2026 10:15", caboAuxiliar: "Cb Pereira", status: "devolvida" },
  { id: "2", item: "Almoxarifado", departamento: "Logística", militar: "Sd Silva", dataRetirada: "12/02/2026 09:00", caboAuxiliar: "Cb Pereira", status: "em_uso" },
  { id: "3", item: "Garagem", departamento: "Transporte", militar: "Cb Santos", dataRetirada: "12/02/2026 07:45", caboAuxiliar: "Cb Rodrigues", status: "em_uso" },
  { id: "4", item: "Paiol", departamento: "Armamento", militar: "Ten Barbosa", dataRetirada: "11/02/2026 14:00", dataDevolucao: "11/02/2026 16:30", caboAuxiliar: "Cb Rodrigues", status: "devolvida" },
];

export const escalaMock: EscalaDia = {
  data: "2026-02-12",
  cabos: [
    {
      id: "1",
      nome: "Cb Pereira",
      blocos: [
        { inicio: "08:00", fim: "10:00" },
        { inicio: "12:00", fim: "18:00" },
        { inicio: "00:00", fim: "04:00" },
      ],
    },
    {
      id: "2",
      nome: "Cb Rodrigues",
      blocos: [
        { inicio: "10:00", fim: "12:00" },
        { inicio: "18:00", fim: "00:00" },
        { inicio: "04:00", fim: "08:00" },
      ],
    },
  ],
};
