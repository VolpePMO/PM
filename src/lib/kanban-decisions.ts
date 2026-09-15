export type DecisionStatus = "aprovado" | "reprovado";

export type DecisionRecord = {
  id: string;
  name: string;
  cnpj: string;
  /** etapa em que o cliente saiu da esteira */
  stage: string;
  /** data da decisão no formato ISO (aaaa-mm-dd) */
  decidedAt: string;
  /** data de entrada na esteira (ISO) — preenchida nos aprovados */
  entryAt?: string;
  status: DecisionStatus;
  /** preenchido apenas para reprovados */
  reason?: string;
};

export const DECISION_RECORDS: DecisionRecord[] = [
  {
    id: "sabor-da-serra",
    name: "Restaurante Sabor da Serra",
    cnpj: "18.905.442/0001-70",
    stage: "Logística",
    entryAt: "2026-08-24",
    decidedAt: "2026-09-05",
    status: "aprovado",
  },
  {
    id: "flor-de-liz",
    name: "Floricultura Flor de Liz ME",
    cnpj: "27.331.806/0001-15",
    stage: "Análise de Risco",
    decidedAt: "2026-08-24",
    status: "reprovado",
    reason: "Score de risco abaixo do mínimo aceito",
  },
  {
    id: "ferragens-uniao",
    name: "Ferragens União Ltda",
    cnpj: "10.446.732/0001-58",
    stage: "Refinamento de Contrato",
    decidedAt: "2026-08-21",
    status: "reprovado",
    reason: "Documentação não enviada dentro do prazo",
  },
  {
    id: "cafe-do-largo",
    name: "Café do Largo ME",
    cnpj: "44.812.309/0001-31",
    stage: "Logística",
    entryAt: "2026-08-17",
    decidedAt: "2026-09-01",
    status: "aprovado",
  },
  {
    id: "moveis-planalto",
    name: "Móveis Planalto Ltda",
    cnpj: "06.229.518/0001-04",
    stage: "Análise de Risco",
    decidedAt: "2026-08-14",
    status: "reprovado",
    reason: "CNPJ com situação cadastral inapta na Receita Federal",
  },
  {
    id: "papelaria-estrela",
    name: "Papelaria Estrela Azul",
    cnpj: "35.708.164/0001-92",
    stage: "Refinamento de Contrato",
    decidedAt: "2026-08-11",
    status: "reprovado",
    reason: "Cliente desistiu da contratação",
  },
  {
    id: "mercadinho-sao-jorge",
    name: "Mercadinho São Jorge ME",
    cnpj: "21.994.037/0001-46",
    stage: "Logística",
    entryAt: "2026-08-18",
    decidedAt: "2026-08-27",
    status: "aprovado",
  },
  {
    id: "lava-jato-cristal",
    name: "Lava Jato Cristal Ltda",
    cnpj: "48.607.215/0001-23",
    stage: "Análise de Risco",
    decidedAt: "2026-08-04",
    status: "reprovado",
    reason: "Sócio com restrição em consulta de risco",
  },
  {
    id: "salao-bela-arte",
    name: "Salão Bela Arte ME",
    cnpj: "13.520.844/0001-67",
    stage: "Refinamento de Contrato",
    decidedAt: "2026-07-31",
    status: "reprovado",
    reason: "Comprovante de endereço não aceito",
  },
  {
    id: "hortifruti-primavera",
    name: "Hortifruti Primavera Ltda",
    cnpj: "29.147.630/0001-88",
    stage: "Logística",
    entryAt: "2026-08-04",
    decidedAt: "2026-08-22",
    status: "aprovado",
  },
  {
    id: "eletro-sul",
    name: "Eletro Sul Comércio ME",
    cnpj: "07.863.451/0001-19",
    stage: "Análise de Risco",
    decidedAt: "2026-07-24",
    status: "reprovado",
    reason: "Atividade econômica não habilitada para o canal",
  },
  {
    id: "pizzaria-forno-antigo",
    name: "Pizzaria Forno Antigo",
    cnpj: "38.215.907/0001-52",
    stage: "Refinamento de Contrato",
    decidedAt: "2026-07-21",
    status: "reprovado",
    reason: "Documentação não enviada dentro do prazo",
  },
  {
    id: "casa-do-parafuso",
    name: "Casa do Parafuso Ltda",
    cnpj: "16.302.778/0001-35",
    stage: "Logística",
    entryAt: "2026-08-03",
    decidedAt: "2026-08-17",
    status: "aprovado",
  },
  {
    id: "boutique-lia",
    name: "Boutique Lia Modas ME",
    cnpj: "42.078.163/0001-71",
    stage: "Análise de Risco",
    decidedAt: "2026-07-14",
    status: "reprovado",
    reason: "Score de risco abaixo do mínimo aceito",
  },
  {
    id: "acai-do-porto",
    name: "Açaí do Porto ME",
    cnpj: "24.680.135/0001-09",
    stage: "Logística",
    entryAt: "2026-07-23",
    decidedAt: "2026-08-13",
    status: "aprovado",
  },
  {
    id: "oficina-do-ze",
    name: "Oficina do Zé Ltda",
    cnpj: "31.559.288/0001-40",
    stage: "Refinamento de Contrato",
    decidedAt: "2026-07-06",
    status: "reprovado",
    reason: "Cliente desistiu da contratação",
  },
  {
    id: "drogaria-santa-rita",
    name: "Drogaria Santa Rita Ltda",
    cnpj: "09.734.622/0001-84",
    stage: "Análise de Risco",
    decidedAt: "2026-07-02",
    status: "reprovado",
    reason: "CNPJ com situação cadastral inapta na Receita Federal",
  },
  {
    id: "sorveteria-gelato",
    name: "Sorveteria Gelato Bom ME",
    cnpj: "50.118.473/0001-26",
    stage: "Logística",
    entryAt: "2026-06-10",
    decidedAt: "2026-06-26",
    status: "aprovado",
  },
  {
    id: "transporte-rota-leste",
    name: "Transportes Rota Leste",
    cnpj: "11.905.360/0001-77",
    stage: "Análise de Risco",
    decidedAt: "2026-06-22",
    status: "reprovado",
    reason: "Sócio com restrição em consulta de risco",
  },
  {
    id: "livraria-paginas",
    name: "Livraria Páginas Ltda",
    cnpj: "33.446.019/0001-63",
    stage: "Refinamento de Contrato",
    decidedAt: "2026-06-17",
    status: "reprovado",
    reason: "Comprovante de endereço não aceito",
  },
  {
    id: "churrascaria-boi-forte",
    name: "Churrascaria Boi Forte",
    cnpj: "46.271.588/0001-11",
    stage: "Logística",
    entryAt: "2026-05-29",
    decidedAt: "2026-06-12",
    status: "aprovado",
  },
  {
    id: "estofados-conforto",
    name: "Estofados Conforto ME",
    cnpj: "20.833.947/0001-95",
    stage: "Análise de Risco",
    decidedAt: "2026-06-05",
    status: "reprovado",
    reason: "Atividade econômica não habilitada para o canal",
  },
];

export function formatDecisionDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Data de referência "hoje" dos dados simulados. */
export const REFERENCE_TODAY = "2026-09-08";

const JANELA_DIAS = 30;
const MINIMO_CONCLUSOES = 5;

function toDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
}

function diffDias(from: string, to: string) {
  return Math.round((toDate(to) - toDate(from)) / 86_400_000);
}

/**
 * Mediana do tempo total de esteira dos clientes aprovados nos últimos 30 dias.
 * Retorna null quando há menos de 5 conclusões na janela (base insuficiente).
 */
export function medianaConclusaoDias(hoje: string = REFERENCE_TODAY): number | null {
  const tempos = DECISION_RECORDS.filter(
    (r) =>
      r.status === "aprovado" &&
      r.entryAt &&
      diffDias(r.decidedAt, hoje) >= 0 &&
      diffDias(r.decidedAt, hoje) <= JANELA_DIAS,
  )
    .map((r) => diffDias(r.entryAt!, r.decidedAt))
    .sort((a, b) => a - b);

  if (tempos.length < MINIMO_CONCLUSOES) return null;
  const meio = Math.floor(tempos.length / 2);
  const valor = tempos.length % 2 === 1 ? tempos[meio]! : (tempos[meio - 1]! + tempos[meio]!) / 2;
  return Math.round(valor);
}
