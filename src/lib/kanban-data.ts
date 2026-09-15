export type DeadlineState = "within" | "over";

export type KanbanStage = {
  id: number;
  name: string;
  /** SLA da etapa em horas — unidade base e única fonte da verdade */
  slaHoras: number;
  owner: string;
};

export const KANBAN_WHITELABEL = {
  name: "Prisma Pagamentos",
  id: "4820",
};

export const KANBAN_STAGES: KanbanStage[] = [
  { id: 1, name: "Refinamento de Contrato", slaHoras: 4, owner: "Comercial Valori" },
  { id: 2, name: "Análise de Risco", slaHoras: 46, owner: "Análise de Risco" },
  { id: 3, name: "Credenciamento", slaHoras: 60, owner: "Automação · Portal" },
  { id: 4, name: "Primeiro Acesso", slaHoras: 72, owner: "Phoebus (terceiro)" },
  { id: 5, name: "Logística", slaHoras: 24, owner: "Operações Valori" },
];

const HORAS_POR_DIA = 24;

/** SLA da etapa convertido em dias corridos, usado no cálculo de prazo. */
export function slaEmDias(slaHoras: number) {
  return Math.max(1, Math.ceil(slaHoras / HORAS_POR_DIA));
}

/** Formatação única de duração, usada em todos os lugares que exibem prazo. */
export function formatDuration(horas: number) {
  const total = Math.max(0, Math.round(horas));
  const dias = Math.floor(total / HORAS_POR_DIA);
  const resto = total % HORAS_POR_DIA;
  if (total < HORAS_POR_DIA) return `${total} ${total === 1 ? "hora" : "horas"}`;
  if (resto === 0) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  return `${dias}d ${resto}h`;
}

export function formatDurationDias(dias: number) {
  return formatDuration(dias * HORAS_POR_DIA);
}

export const KANBAN_TOTAL_SLA_HORAS = KANBAN_STAGES.reduce((acc, s) => acc + s.slaHoras, 0);

export type KanbanClient = {
  id: string;
  name: string;
  cnpj: string;
  /** etapa atual, 1..5 */
  stage: number;
  /** dias decorridos na etapa atual */
  days: number;
  entry: string;
  /** dias totais no processo */
  inProcess: number;
  forecast: string;
  /** pendência atual do cliente; exibida apenas quando preenchida */
  pendencia?: string;
};

export const KANBAN_CLIENTS: KanbanClient[] = [
  {
    id: "boa-safra",
    name: "Mercearia Boa Safra ME",
    cnpj: "31.884.207/0001-45",
    stage: 1,
    days: 2,
    entry: "28/08/2026",
    inProcess: 2,
    forecast: "05/10/2026",
  },
  {
    id: "visao-clara",
    name: "Ótica Visão Clara ME",
    cnpj: "48.221.905/0001-19",
    stage: 1,
    days: 1,
    entry: "29/08/2026",
    inProcess: 1,
    forecast: "06/10/2026",
  },
  {
    id: "amigo-fiel",
    name: "Pet Shop Amigo Fiel",
    cnpj: "12.775.038/0001-90",
    stage: 1,
    days: 3,
    entry: "27/08/2026",
    inProcess: 3,
    forecast: "04/10/2026",
    pendencia: "comprovante de endereço no nome da titular",
  },
  {
    id: "bela-vista",
    name: "Padaria Bela Vista Ltda",
    cnpj: "17.402.913/0001-08",
    stage: 2,
    days: 1,
    entry: "24/08/2026",
    inProcess: 4,
    forecast: "30/09/2026",
  },
  {
    id: "norte-sul",
    name: "Distribuidora Norte Sul",
    cnpj: "05.918.664/0001-27",
    stage: 2,
    days: 3,
    entry: "22/08/2026",
    inProcess: 6,
    forecast: "28/09/2026",
    pendencia: "contrato social validado pela junta comercial",
  },
  {
    id: "faria",
    name: "Auto Center Faria Ltda",
    cnpj: "09.556.140/0001-72",
    stage: 3,
    days: 1,
    entry: "20/08/2026",
    inProcess: 5,
    forecast: "26/09/2026",
  },
  {
    id: "dom-luiz",
    name: "Barbearia Dom Luiz",
    cnpj: "39.104.582/0001-53",
    stage: 3,
    days: 1,
    entry: "21/08/2026",
    inProcess: 4,
    forecast: "27/09/2026",
  },
  {
    id: "vida-plena",
    name: "Clínica Vida Plena Ltda",
    cnpj: "22.017.658/0001-31",
    stage: 4,
    days: 34,
    entry: "18/07/2026",
    inProcess: 40,
    forecast: "04/09/2026",
    pendencia: "CNH ou RG exportado direto do gov.br",
  },
  {
    id: "vila-nova",
    name: "Mercado Central Vila Nova",
    cnpj: "26.489.310/0001-66",
    stage: 4,
    days: 21,
    entry: "03/08/2026",
    inProcess: 27,
    forecast: "13/09/2026",
  },
  {
    id: "bem-estar",
    name: "Farmácia Bem Estar Ltda",
    cnpj: "33.702.145/0001-84",
    stage: 4,
    days: 8,
    entry: "17/08/2026",
    inProcess: 14,
    forecast: "22/09/2026",
  },
  {
    id: "dona-ines",
    name: "Restaurante Dona Inês Ltda",
    cnpj: "45.330.921/0001-64",
    stage: 5,
    days: 1,
    entry: "12/07/2026",
    inProcess: 32,
    forecast: "01/09/2026",
  },
  {
    id: "corpo-livre",
    name: "Academia Corpo Livre",
    cnpj: "51.663.428/0001-12",
    stage: 5,
    days: 2,
    entry: "10/07/2026",
    inProcess: 34,
    forecast: "31/08/2026",
  },
];

/** Prazo tem dois estados: dentro do SLA (inclui o último dia) ou ultrapassado. */
export function deadlineState(client: KanbanClient): DeadlineState {
  const sla = slaEmDias(KANBAN_STAGES[client.stage - 1]!.slaHoras);
  return client.days > sla ? "over" : "within";
}

export function pluralDia(n: number) {
  return n === 1 ? "dia" : "dias";
}

export function avgInProcess() {
  return Math.round(KANBAN_CLIENTS.reduce((a, c) => a + c.inProcess, 0) / KANBAN_CLIENTS.length);
}
