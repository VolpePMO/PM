/**
 * Dados fictícios da prova de conceito "Visão de Indicadores".
 * Nada aqui vem do banco: é só para validar a ideia visualmente.
 */

export type StatTile = {
  key: string;
  label: string;
  value: string;
  delta: number;
  sub?: string;
};

export type TableRow = { label: string; tpv: number; share: number };

export type PartnerData = {
  id: string;
  label: string;
  stats: StatTile[];
  daily: { day: string; tpv: number }[];
  bandeiras: TableRow[];
  tiposCompra: TableRow[];
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const num = (v: number) => v.toLocaleString("pt-BR");

function daily(base: number, seed: number) {
  return Array.from({ length: 30 }, (_, i) => {
    const wave = Math.sin((i + seed) / 3.2) * 0.18 + Math.cos((i + seed) / 7) * 0.1;
    const weekend = (i + seed) % 7 < 2 ? -0.22 : 0;
    return {
      day: String(i + 1).padStart(2, "0"),
      tpv: Math.round(base * (1 + wave + weekend)),
    };
  });
}

function shares(total: number, parts: [string, number][]): TableRow[] {
  return parts.map(([label, share]) => ({
    label,
    tpv: Math.round(total * share),
    share: Math.round(share * 1000) / 10,
  }));
}

function build(id: string, label: string, f: number, seed: number, deltas: number[]): PartnerData {
  const tpv = Math.round(8_450_000 * f);
  const transacoes = Math.round(124_300 * f);
  return {
    id,
    label,
    stats: [
      { key: "tpv", label: "TPV Geral", value: brl(tpv), delta: deltas[0]! },
      { key: "trx", label: "Transações", value: num(transacoes), delta: deltas[1]! },
      {
        key: "ticket",
        label: "Ticket Médio",
        value: brl(Math.round(tpv / transacoes)),
        delta: deltas[2]!,
      },
      {
        key: "parcelado",
        label: "% Parcelado",
        value: `${(38 + seed).toFixed(1)}%`,
        delta: deltas[3]!,
      },
      {
        key: "ativos",
        label: "Clientes Ativos",
        value: num(Math.round(2_140 * f)),
        delta: deltas[4]!,
      },
      {
        key: "incremento",
        label: "Incremento TPV",
        value: brl(Math.round(tpv * 0.07)),
        delta: deltas[5]!,
      },
      { key: "pos", label: "Qtd de POS", value: num(Math.round(1_680 * f)), delta: deltas[6]! },
      { key: "m3", label: "Média 3 meses", value: brl(Math.round(tpv * 0.94)), delta: deltas[7]! },
      { key: "m6", label: "Média 6 meses", value: brl(Math.round(tpv * 0.88)), delta: deltas[8]! },
      {
        key: "fisico",
        label: "TPV Físico",
        value: brl(Math.round(tpv * 0.62)),
        delta: deltas[9]!,
        sub: `${num(Math.round(transacoes * 0.66))} transações`,
      },
      {
        key: "digital",
        label: "TPV Digital",
        value: brl(Math.round(tpv * 0.38)),
        delta: deltas[10]!,
        sub: `${num(Math.round(transacoes * 0.34))} transações`,
      },
    ],
    daily: daily(Math.round(tpv / 30), seed),
    bandeiras: shares(tpv, [
      ["Master", 0.372],
      ["Visa", 0.341],
      ["Elo", 0.142],
      ["Amex", 0.061],
      ["Hiper", 0.048],
      ["Outras", 0.036],
    ]),
    tiposCompra: shares(tpv, [
      ["À Vista", 0.284],
      ["Débito", 0.221],
      ["PIX", 0.133],
      ["2x a 6x", 0.192],
      ["7x a 12x", 0.121],
      ["13x a 21x", 0.049],
    ]),
  };
}

export const PARTNERS: PartnerData[] = [
  build("alfa", "Parceiro Alfa", 1, 1, [12.4, 8.1, 3.9, 1.6, 5.2, 14.8, 2.4, 6.1, 4.3, 9.7, -2.8]),
  build(
    "beta",
    "Parceiro Beta",
    0.62,
    3,
    [-4.7, -2.1, -1.4, 2.8, 1.1, -6.3, 0.9, -1.8, 2.2, -3.4, 7.6],
  ),
  build(
    "gama",
    "Parceiro Gama",
    1.43,
    5,
    [21.9, 17.3, 4.2, -0.8, 11.5, 24.1, 6.7, 12.9, 10.4, 15.2, 18.8],
  ),
];

export const COD_EC_OPTIONS = ["Todos", "10023451", "10098872", "10114509", "10230018"];

export const formatBRL = brl;
