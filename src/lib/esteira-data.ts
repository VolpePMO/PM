export type StageState = "done" | "current" | "late" | "todo";

export type Stage = {
  id: number;
  name: string;
  sla: number;
  owner: string;
};

export const WHITELABEL = {
  name: "Prisma Pagamentos",
  id: "4820",
};

export const STAGES: Stage[] = [
  { id: 1, name: "Contrato", sla: 3, owner: "Comercial Valori" },
  { id: 2, name: "Risco", sla: 2, owner: "Análise de Risco" },
  { id: 3, name: "Criação de Portal", sla: 1, owner: "Automação · Portal" },
  { id: 4, name: "Credenciamento Phoebus", sla: 30, owner: "Phoebus (terceiro)" },
  { id: 5, name: "On-Boarding", sla: 2, owner: "Operações Valori" },
];

export const TOTAL_SLA = STAGES.reduce((acc, s) => acc + s.sla, 0);

export type Client = {
  id: string;
  name: string;
  cnpj: string;
  entry: string;
  currentStage: number;
  /** dias decorridos por etapa, índice 0..4 (0 quando não iniciada) */
  elapsed: number[];
  late: boolean;
  forecast: string;
  nextAction: string;
  notes: string[];
};

export const CLIENTS: Client[] = [
  {
    id: "boa-safra",
    name: "Mercearia Boa Safra ME",
    cnpj: "31.884.207/0001-45",
    entry: "28/08/2026",
    currentStage: 1,
    elapsed: [2, 0, 0, 0, 0],
    late: false,
    forecast: "05/10/2026",
    nextAction: "Cobrar assinatura do contrato",
    notes: [
      "Contrato enviado por e-mail em 28/08. Aguardando assinatura eletrônica do sócio administrador.",
      "Etapa inicia automaticamente após a assinatura do contrato.",
      "Portal é provisionado somente após parecer favorável de risco.",
      "Envio à Phoebus ocorre depois da criação do portal do cliente.",
      "On-Boarding final com treinamento e primeira transação assistida.",
    ],
  },
  {
    id: "bela-vista",
    name: "Padaria Bela Vista Ltda",
    cnpj: "17.402.913/0001-08",
    entry: "24/08/2026",
    currentStage: 2,
    elapsed: [2, 1, 0, 0, 0],
    late: false,
    forecast: "30/09/2026",
    nextAction: "Aguardando parecer do comitê de risco",
    notes: [
      "Contrato assinado em 26/08, dentro do prazo previsto.",
      "Documentação completa em análise pelo comitê de risco. Parecer previsto para amanhã.",
      "Portal será criado automaticamente após aprovação de risco.",
      "Fila da Phoebus estimada em 30 dias corridos após o envio.",
      "Etapa final de ativação, ainda não iniciada.",
    ],
  },
  {
    id: "faria",
    name: "Auto Center Faria Ltda",
    cnpj: "09.556.140/0001-72",
    entry: "20/08/2026",
    currentStage: 3,
    elapsed: [2, 2, 1, 0, 0],
    late: false,
    forecast: "26/09/2026",
    nextAction: "Nenhuma ação pendente do parceiro",
    notes: [
      "Contrato assinado no segundo dia, sem pendências.",
      "Risco aprovado com restrição de limite inicial de faturamento.",
      "Provisionamento do portal em execução. Conclusão prevista para hoje.",
      "Cadastro será submetido à Phoebus assim que o portal estiver ativo.",
      "On-Boarding agendado logo após o credenciamento.",
    ],
  },
  {
    id: "vida-plena",
    name: "Clínica Vida Plena Ltda",
    cnpj: "22.017.658/0001-31",
    entry: "18/07/2026",
    currentStage: 4,
    elapsed: [3, 2, 1, 34, 0],
    late: true,
    forecast: "04/09/2026",
    nextAction: "Reenviar contrato social atualizado",
    notes: [
      "Contrato assinado no limite do prazo, em 21/07.",
      "Risco aprovado sem restrições em 23/07.",
      "Portal criado no mesmo dia da liberação de risco.",
      "Fora do prazo há 4 dias. Pendência de documentação societária junto à Phoebus.",
      "Ativação bloqueada até a conclusão do credenciamento.",
    ],
  },
  {
    id: "dona-ines",
    name: "Restaurante Dona Inês Ltda",
    cnpj: "45.330.921/0001-64",
    entry: "12/07/2026",
    currentStage: 5,
    elapsed: [2, 1, 1, 28, 1],
    late: false,
    forecast: "01/09/2026",
    nextAction: "Confirmar primeira transação do cliente",
    notes: [
      "Contrato assinado em 14/07, sem pendências.",
      "Risco aprovado em regime simplificado.",
      "Portal criado e credenciais entregues ao parceiro.",
      "Credenciamento concluído em 28 dias, dentro do SLA da Phoebus.",
      "Maquininha entregue. Aguardando primeira transação para encerrar a esteira.",
    ],
  },
];

export function stageState(client: Client, index: number): StageState {
  const stageNumber = index + 1;
  if (stageNumber < client.currentStage) return "done";
  if (stageNumber > client.currentStage) return "todo";
  return client.late ? "late" : "current";
}

export function progressPct(client: Client) {
  const idx = client.currentStage - 1;
  const stage = STAGES[idx]!;
  const within = Math.min(client.elapsed[idx]! / stage.sla, 1);
  return Math.round(((idx + within) / STAGES.length) * 100);
}

export function daysInProcess(client: Client) {
  return client.elapsed.reduce((a, b) => a + b, 0);
}

export function plural(n: number) {
  return n === 1 ? "dia" : "dias";
}
