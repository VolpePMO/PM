import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ListChecks,
  Map as MapIcon,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PERIODS,
  STALE_DAYS,
  STATUS_LABELS,
  STATUS_TAG_CLASS,
  TYPE_LABELS,
  TYPE_TAG_CLASS,
  daysSince,
  isStale,
} from "@/lib/domain";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Início — Valori PM" },
      {
        name: "description",
        content: "Visão geral do backlog: status, itens recentes, próximo período e itens parados.",
      },
      { property: "og:title", content: "Início — Valori PM" },
      {
        property: "og:description",
        content: "Visão geral do backlog: status, itens recentes, próximo período e itens parados.",
      },
    ],
  }),
  component: DashboardPage,
});

type BacklogItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  period: string | null;
  updated_at: string;
};

/** Itens atualizados em cada um dos últimos 7 dias, do mais antigo para o mais
 *  recente, já no formato que o gráfico consome. */
function updatesLast7Days(items: BacklogItem[]) {
  const days: { day: string; total: number }[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    days.push({
      day: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      total: items.filter((i) => {
        const at = new Date(i.updated_at).getTime();
        return at >= date.getTime() && at < next.getTime();
      }).length,
    });
  }
  return days;
}

function DashboardPage() {
  const { displayName } = useAuth();

  const items = useQuery({
    queryKey: ["backlog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const all = useMemo(() => (items.data ?? []) as BacklogItem[], [items.data]);
  const open = all.filter((i) => i.status !== "concluido");
  const done = all.filter((i) => i.status === "concluido");
  const recent = [...open]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);
  const nextPeriod = PERIODS.filter((p) => p !== "Sem período").find((p) =>
    open.some((i) => i.period === p),
  );
  const nextItems = open.filter((i) => i.period === nextPeriod);
  const stale = open
    .filter((i) => isStale(i))
    .sort((a, b) => daysSince(b.updated_at) - daysSince(a.updated_at));

  const chart = useMemo(() => updatesLast7Days(all), [all]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        subtitle={
          displayName
            ? `Bem-vindo de volta, ${displayName}`
            : "Visão geral do produto em um só lugar."
        }
      />

      {/* Linha superior: dois indicadores e o gráfico dos últimos 7 dias. */}
      <div className="grid gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,1.6fr)]">
        <StatTile
          icon={ListChecks}
          label="Itens em aberto"
          value={open.length}
          sub={`${open.filter((i) => i.status === "em_desenvolvimento").length} em desenvolvimento`}
        />
        <StatTile
          icon={CheckCircle2}
          label="Concluídos"
          value={done.length}
          sub={`${all.length} itens no total`}
        />

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-brand-dark">Atualizações — últimos 7 dias</p>
            <Link to="/backlog" className="text-xs font-medium text-primary hover:underline">
              Ver backlog
            </Link>
          </div>
          <div className="mt-4 h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="dashUpdates" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeOpacity={0.12} />
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
                  allowDecimals={false}
                  width={40}
                  fontSize={11}
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <Tooltip
                  cursor={{ stroke: "var(--border)" }}
                  formatter={(v: number) => [`${v} item(ns)`, "Atualizados"]}
                  labelFormatter={(l: string) => `Dia ${l}`}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--gold)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  fill="url(#dashUpdates)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Atalhos, no mesmo desenho dos cartões de ação do Portal. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          to="/backlog"
          icon={ListChecks}
          title="Backlog"
          description="Priorização dos itens"
        />
        <QuickAction
          to="/roadmap"
          icon={MapIcon}
          title="Roadmap"
          description="O que vem por período"
        />
        <QuickAction
          to="/visao-indicadores"
          icon={BarChart3}
          title="Visão de Indicadores"
          description="TPV por parceiro"
        />
        <QuickAction
          to="/enriquecimento"
          icon={Building2}
          title="Enriquecimento"
          description="Cadastro por CNPJ e MCC"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-brand-dark">Atualizados recentemente</p>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
              {recent.length} registro(s)
            </span>
          </div>

          {recent.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nada em aberto.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Item</th>
                  <th className="pb-2 text-left font-medium">Tipo</th>
                  <th className="pb-2 text-right font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((i) => (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-3">
                      <Link
                        to="/backlog/$id"
                        params={{ id: i.id }}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {i.title}
                      </Link>
                      <div className="mt-1">
                        <Badge className={`${STATUS_TAG_CLASS[i.status]} text-[10px]`}>
                          {STATUS_LABELS[i.status]}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 align-top">
                      <Badge className={`${TYPE_TAG_CLASS[i.type]} text-[10px]`}>
                        {TYPE_LABELS[i.type]}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right align-top text-xs text-muted-foreground">
                      {daysSince(i.updated_at) === 0 ? "hoje" : `há ${daysSince(i.updated_at)}d`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-sm font-medium text-brand-dark">
            Próximo período {nextPeriod ? `· ${nextPeriod}` : ""}
          </p>
          <div className="mt-4 space-y-2">
            {nextItems.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum item planejado para os próximos períodos.
              </p>
            )}
            {nextItems.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
              >
                <Link
                  to="/backlog/$id"
                  params={{ id: i.id }}
                  className="text-sm hover:text-primary hover:underline"
                >
                  {i.title}
                </Link>
                <Badge className={`${STATUS_TAG_CLASS[i.status]} text-[10px]`}>
                  {STATUS_LABELS[i.status]}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-sm font-medium text-brand-dark">
          Itens parados (sem atualização há {STALE_DAYS}+ dias)
        </p>
        <div className="mt-4 space-y-2">
          {stale.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum item parado.</p>
          )}
          {stale.map((i) => (
            <div
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
            >
              <Link
                to="/backlog/$id"
                params={{ id: i.id }}
                className="text-sm hover:text-primary hover:underline"
              >
                {i.title}
              </Link>
              <Badge variant="outline" className="text-destructive">
                {daysSince(i.updated_at)} dias sem atualização
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="tnum mt-0.5 text-3xl font-semibold tracking-tight text-brand-dark">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </Card>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="group">
      <Card className="flex h-full items-center gap-3.5 p-4 transition-colors group-hover:border-primary/30 group-hover:bg-accent">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-dark">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </Card>
    </Link>
  );
}
