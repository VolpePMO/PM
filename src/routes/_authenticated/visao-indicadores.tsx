import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARTNERS, TODOS_ECS, formatBRL, type TableRow } from "@/lib/indicadores-mock";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/visao-indicadores")({
  head: () => ({
    meta: [
      { title: "Visão de Indicadores — Valori PM" },
      {
        name: "description",
        content:
          "Prova de conceito com indicadores de TPV, transações e participação por parceiro.",
      },
      { property: "og:title", content: "Visão de Indicadores — Valori PM" },
      {
        property: "og:description",
        content:
          "Prova de conceito com indicadores de TPV, transações e participação por parceiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IndicadoresPage,
});

function IndicadoresPage() {
  const [empresa, setEmpresa] = useState("");
  const [inicio, setInicio] = useState("2026-09-01");
  const [fim, setFim] = useState("2026-09-30");
  const [codEc, setCodEc] = useState<string>(TODOS_ECS);
  const [partnerId, setPartnerId] = useState(PARTNERS[0]!.id);

  const partner = useMemo(
    () => PARTNERS.find((p) => p.id === partnerId) ?? PARTNERS[0]!,
    [partnerId],
  );

  const ecSelecionado = useMemo(
    () => partner.ecs.find((ec) => ec.code === codEc) ?? null,
    [partner, codEc],
  );

  const metrics = ecSelecionado ? ecSelecionado.metrics : partner.total;

  const ecRows: TableRow[] = useMemo(() => {
    const total = partner.ecs.reduce((acc, ec) => acc + tpvDe(ec.metrics.daily), 0);
    return partner.ecs.map((ec) => {
      const tpv = tpvDe(ec.metrics.daily);
      return {
        label: `${ec.code} — ${ec.nome}`,
        tpv,
        share: total > 0 ? Math.round((tpv / total) * 1000) / 10 : 0,
      };
    });
  }, [partner]);

  function trocarParceiro(id: string) {
    setPartnerId(id);
    setCodEc(TODOS_ECS);
  }

  const atualizadoEm = useMemo(
    () => new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" }),
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão de Indicadores"
        badge={
          <Badge variant="outline" className="border-gold/50 text-xs font-normal text-gold">
            Prova de conceito
          </Badge>
        }
        subtitle="Ensaio do PowerBI embarcado no Portal de Parceiros: cada parceiro veria apenas os próprios ECs. Números fictícios."
      />

      {/* Barra de filtros */}
      <Card className="flex flex-wrap items-end gap-4 p-4">
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label
            htmlFor="empresa"
            className="text-xs uppercase tracking-wide text-muted-foreground"
          >
            Nome da Empresa
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="empresa"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Buscar"
              className="pl-9 pr-9"
            />
            {empresa !== "" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Limpar busca"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setEmpresa("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Data</Label>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              aria-label="Data inicial"
              className="w-[150px]"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              aria-label="Data final"
              className="w-[150px]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cod EC</Label>
          <Select value={codEc} onValueChange={setCodEc}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS_ECS}>Todos os ECs (consolidado)</SelectItem>
              {partner.ecs.map((ec) => (
                <SelectItem key={ec.code} value={ec.code}>
                  {ec.code} — {ec.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Parceiro</Label>
          <Select value={partnerId} onValueChange={trocarParceiro}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PARTNERS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Contexto da seleção */}
      <p className="text-xs text-muted-foreground">
        Exibindo{" "}
        <span className="font-medium text-foreground">
          {ecSelecionado
            ? `EC ${ecSelecionado.code} — ${ecSelecionado.nome}`
            : `consolidado dos ${partner.ecs.length} ECs`}
        </span>{" "}
        de {partner.label}.
      </p>

      {/* Indicadores */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {metrics.stats.map((stat) => (
          <Card key={stat.key} className="border-l-2 border-l-gold p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-brand-dark">
              {stat.value}
            </p>
            {stat.sub && <p className="text-[11px] text-muted-foreground">{stat.sub}</p>}
            <p
              className={
                stat.delta >= 0
                  ? "mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                  : "mt-1 text-[11px] font-medium text-destructive"
              }
            >
              {stat.delta >= 0 ? "+" : ""}
              {stat.delta.toFixed(2).replace(".", ",")}% vs. ant.
            </p>
          </Card>
        ))}
      </div>

      {/* Gráfico */}
      <Card className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">TPV Diário</p>
        <div className="mt-3 h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics.daily} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} strokeOpacity={0.15} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={70}
                fontSize={11}
                stroke="currentColor"
                className="text-muted-foreground"
                tickFormatter={(v: number) => formatBRL(v)}
              />
              <Tooltip
                formatter={(v: number) => [formatBRL(v), "TPV"]}
                labelFormatter={(l: string) => `Dia ${l}`}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="tpv"
                stroke="var(--gold)"
                strokeWidth={2}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Tabelas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ShareTable title="Bandeira" firstCol="Bandeira" rows={metrics.bandeiras} />
        <ShareTable title="Tipo de compra" firstCol="Modalidade" rows={metrics.tiposCompra} />
      </div>

      {/* Quebra por EC */}
      <div className="grid gap-4">
        <ShareTable
          title={`Códigos de EC de ${partner.label}`}
          firstCol="Cod EC"
          rows={ecRows}
          highlight={ecSelecionado?.code}
        />
      </div>

      <p className="text-right text-xs text-muted-foreground">Atualizado em: {atualizadoEm}</p>
    </div>
  );
}

function tpvDe(daily: { tpv: number }[]) {
  return daily.reduce((acc, d) => acc + d.tpv, 0);
}

function ShareTable({
  title,
  firstCol,
  rows,
  highlight,
}: {
  title: string;
  firstCol: string;
  rows: TableRow[];
  highlight?: string | undefined;
}) {
  return (
    <Card className="p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="py-2 text-left font-medium">{firstCol}</th>
            <th className="py-2 text-right font-medium">TPV</th>
            <th className="py-2 text-right font-medium">% part.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className={
                highlight && row.label.startsWith(highlight)
                  ? "border-b bg-gold/10 font-medium last:border-0"
                  : "border-b last:border-0"
              }
            >
              <td className="py-2">{row.label}</td>
              <td className="py-2 text-right tabular-nums">{formatBRL(row.tpv)}</td>
              <td className="py-2 text-right tabular-nums text-muted-foreground">
                {row.share.toFixed(2).replace(".", ",")}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
