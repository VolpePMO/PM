import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  CLIENTS,
  STAGES,
  TOTAL_SLA,
  WHITELABEL,
  daysInProcess,
  plural,
  progressPct,
  stageState,
  type Client,
  type StageState,
} from "@/lib/esteira-data";

export const Route = createFileRoute("/_authenticated/esteira")({
  head: () => ({
    meta: [
      { title: "Esteira de On-Boarding — Portal do Parceiro Valori" },
      {
        name: "description",
        content:
          "Acompanhe em qual etapa do credenciamento cada cliente do seu WhiteLabel está, com prazos e responsáveis.",
      },
      { property: "og:title", content: "Esteira de On-Boarding — Portal do Parceiro Valori" },
      {
        property: "og:description",
        content:
          "Visão de acompanhamento do credenciamento de clientes por etapa, prazo e responsável.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EsteiraPage,
});

const STATE_LABEL: Record<StageState, string> = {
  done: "CONCLUÍDO",
  current: "EM ANDAMENTO",
  late: "FORA DO PRAZO",
  todo: "NÃO INICIADO",
};

const DOT: Record<StageState, string> = {
  done: "bg-esteira-done",
  current: "bg-esteira-gold",
  late: "bg-esteira-late",
  todo: "bg-esteira-line",
};

const PILL: Record<StageState, string> = {
  done: "bg-esteira-done/12 text-esteira-done",
  current: "bg-esteira-gold/15 text-esteira-gold",
  late: "bg-esteira-late/12 text-esteira-late",
  todo: "bg-esteira-soft/12 text-esteira-soft",
};

function EsteiraPage() {
  const [clientId, setClientId] = useState(CLIENTS[3]!.id);
  const client = CLIENTS.find((c) => c.id === clientId) ?? CLIENTS[0]!;

  const lateCount = CLIENTS.filter((c) => c.late).length;
  const avgDays = Math.round(CLIENTS.reduce((a, c) => a + daysInProcess(c), 0) / CLIENTS.length);
  const pct = progressPct(client);

  return (
    <div
      data-esteira
      className="-mx-6 -my-8 min-h-screen bg-esteira-bg px-6 py-8 font-body text-foreground"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Header />
        <ClientPicker clientId={clientId} onSelect={setClientId} />
        <Summary lateCount={lateCount} avgDays={avgDays} />
        <Pipeline client={client} pct={pct} />
        <DetailStrip client={client} />
        <Legend />
        <p className="text-xs leading-relaxed text-esteira-soft">
          Prazos exibidos em dias corridos, contados a partir da entrada do cliente em cada etapa.
          Dados simulados para validação da visão.
        </p>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-esteira-gold">
          Valori · Portal do Parceiro / Esteira
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Esteira de On-Boarding
        </h1>
        <p className="mt-1 max-w-xl text-sm text-esteira-soft">
          Acompanhe em que etapa do credenciamento cada cliente está. Passe o mouse sobre uma etapa
          para ver os detalhes.
        </p>
      </div>
      <div className="shrink-0 rounded-xl bg-esteira-green px-4 py-3 text-primary-foreground shadow-sm">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-esteira-gold">
          WhiteLabel
        </p>
        <p className="mt-0.5 font-display text-base font-semibold">{WHITELABEL.name}</p>
        <p className="mt-0.5 font-numeric tnum text-xs opacity-80">
          ID {WHITELABEL.id} · {CLIENTS.length} clientes em esteira
        </p>
      </div>
    </header>
  );
}

function ClientPicker({
  clientId,
  onSelect,
}: {
  clientId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section>
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-esteira-soft">
        Cliente
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CLIENTS.map((c) => {
          const active = c.id === clientId;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-esteira-gold focus-visible:ring-offset-2 focus-visible:ring-offset-esteira-bg",
                active
                  ? "border-esteira-green bg-esteira-green text-primary-foreground"
                  : "border-esteira-line bg-esteira-surface text-foreground hover:border-esteira-gold/60",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  c.late ? "bg-esteira-late" : "bg-esteira-gold",
                )}
              />
              <span className="truncate">{c.name}</span>
              <span
                className={cn(
                  "font-numeric tnum text-xs",
                  active ? "opacity-80" : "text-esteira-soft",
                )}
              >
                {c.currentStage}/{STAGES.length}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-esteira-line bg-esteira-surface px-4 py-3 shadow-sm">
      <p className={cn("font-numeric tnum text-2xl font-semibold", tone ?? "text-foreground")}>
        {value}
      </p>
      <p className="mt-1 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-esteira-soft">
        {label}
      </p>
    </div>
  );
}

function Summary({ lateCount, avgDays }: { lateCount: number; avgDays: number }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Clientes em esteira" value={String(CLIENTS.length)} />
      <StatCard
        label="Fora do prazo"
        value={String(lateCount)}
        tone={lateCount > 0 ? "text-esteira-late" : "text-esteira-done"}
      />
      <StatCard label="Tempo médio decorrido" value={`${avgDays} ${plural(avgDays)}`} />
      <StatCard label="SLA total do processo" value={`${TOTAL_SLA} dias`} />
    </section>
  );
}

function Pipeline({ client, pct }: { client: Client; pct: number }) {
  const idx = client.currentStage - 1;
  const fillPct = ((idx + 0.5) / STAGES.length) * 100;

  return (
    <section className="rounded-2xl border border-esteira-line bg-esteira-surface p-5 shadow-sm sm:p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold">{client.name}</h2>
          <p className="mt-0.5 font-numeric tnum text-xs text-esteira-soft">
            CNPJ {client.cnpj} · entrada {client.entry}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "font-numeric tnum text-3xl font-semibold",
              client.late ? "text-esteira-late" : "text-esteira-green",
            )}
          >
            {pct}%
          </p>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-esteira-soft">
            Progresso
          </p>
        </div>
      </div>

      <div className="relative mt-8">
        {/* trilho */}
        <div className="pointer-events-none absolute left-0 right-0 top-4 hidden h-[3px] rounded-full bg-esteira-line min-[900px]:block">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${fillPct}%`,
              backgroundImage: `linear-gradient(90deg, var(--esteira-green), ${
                client.late ? "var(--esteira-late)" : "var(--esteira-gold)"
              })`,
            }}
          />
        </div>

        <ol className="relative grid grid-cols-1 gap-4 min-[900px]:grid-cols-5 min-[900px]:gap-3">
          {STAGES.map((stage, i) => (
            <StageColumn key={stage.id} index={i} state={stageState(client, i)} client={client} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function StageColumn({
  index,
  state,
  client,
}: {
  index: number;
  state: StageState;
  client: Client;
}) {
  const stage = STAGES[index]!;
  const elapsed = client.elapsed[index]!;
  const over = elapsed - stage.sla;
  const meter = Math.min(elapsed / stage.sla, 1) * 100;

  const right =
    state === "done"
      ? "no prazo"
      : state === "late"
        ? `+${over}d`
        : state === "current"
          ? `${Math.max(stage.sla - elapsed, 0)}d restantes`
          : `SLA ${stage.sla}${stage.sla === 1 ? "d" : "d"}`;

  const nodeClass =
    state === "done"
      ? "bg-esteira-green text-primary-foreground border-esteira-green"
      : state === "current"
        ? "bg-esteira-gold text-esteira-ink border-esteira-gold"
        : state === "late"
          ? "bg-esteira-late text-white border-esteira-late"
          : "bg-esteira-surface text-esteira-soft border-esteira-line";

  return (
    <li className="group relative flex flex-col items-stretch">
      <div className="mb-3 flex justify-center min-[900px]:mb-4">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 font-numeric tnum text-xs font-semibold transition-colors",
            nodeClass,
          )}
        >
          {state === "done" ? "✓" : stage.id}
        </span>
      </div>

      <div
        tabIndex={0}
        className={cn(
          "relative flex h-full flex-col rounded-xl border bg-esteira-surface p-3 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-esteira-gold focus-visible:ring-offset-2 focus-visible:ring-offset-esteira-surface",
          state === "late"
            ? "border-esteira-late"
            : state === "current"
              ? "border-esteira-gold"
              : "border-esteira-line",
        )}
      >
        <p className="font-display text-sm font-semibold leading-snug min-[900px]:min-h-10">
          {stage.name}
        </p>
        <span
          className={cn(
            "mt-2 inline-flex w-fit rounded-md px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.12em]",
            PILL[state],
          )}
        >
          {STATE_LABEL[state]}
        </span>

        <div className="mt-auto pt-3">
          <div className="flex items-baseline justify-between gap-2 font-numeric tnum text-[11px]">
            <span className="text-esteira-soft">
              {elapsed} de {stage.sla} {plural(stage.sla)}
            </span>
            <span
              className={cn(
                state === "late"
                  ? "text-esteira-late"
                  : state === "done"
                    ? "text-esteira-done"
                    : state === "current"
                      ? "text-esteira-gold"
                      : "text-esteira-soft",
              )}
            >
              {right}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-esteira-line">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out",
                state === "late"
                  ? "bg-esteira-late"
                  : state === "done"
                    ? "bg-esteira-done"
                    : state === "current"
                      ? "bg-esteira-gold"
                      : "bg-esteira-line",
              )}
              style={{ width: `${meter}%` }}
            />
          </div>
        </div>

        {/* conteúdo inline em telas estreitas */}
        <div className="mt-3 border-t border-esteira-line pt-3 min-[900px]:hidden">
          <TooltipBody state={state} index={index} client={client} inline />
        </div>
      </div>

      {/* tooltip flutuante */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 hidden w-64 -translate-x-1/2 translate-y-1 rounded-xl bg-esteira-ink p-3 text-primary-foreground opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 min-[900px]:block">
        <TooltipBody state={state} index={index} client={client} />
        <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-esteira-ink" />
      </div>
    </li>
  );
}

function TooltipBody({
  state,
  index,
  client,
  inline,
}: {
  state: StageState;
  index: number;
  client: Client;
  inline?: boolean;
}) {
  const stage = STAGES[index]!;
  const elapsed = client.elapsed[index]!;
  const rows: [string, string][] = [
    ["Situação", STATE_LABEL[state]],
    ["Responsável", stage.owner],
    ["SLA da etapa", `${stage.sla} ${plural(stage.sla)}`],
    ["Dias decorridos", `${elapsed} ${plural(elapsed)}`],
  ];
  return (
    <div className={cn(inline ? "text-foreground" : "text-primary-foreground")}>
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-esteira-gold">
        {stage.name}
      </p>
      <dl className="mt-2 space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 text-[11px]">
            <dt className={inline ? "text-esteira-soft" : "opacity-70"}>{k}</dt>
            <dd className="font-numeric tnum text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <div className={cn("mt-2 border-t pt-2", inline ? "border-esteira-line" : "border-white/15")}>
        <p
          className={cn("text-[11px] leading-relaxed", inline ? "text-esteira-soft" : "opacity-85")}
        >
          {client.notes[index]}
        </p>
      </div>
    </div>
  );
}

function DetailStrip({ client }: { client: Client }) {
  const days = daysInProcess(client);
  const stage = STAGES[client.currentStage - 1]!;
  const cells: [string, string][] = [
    ["Entrada na esteira", client.entry],
    ["Etapa atual", `${client.currentStage} de ${STAGES.length} · ${stage.name}`],
    ["Dias no processo", `${days} ${plural(days)}`],
    ["Previsão de conclusão", client.forecast],
    ["Próxima ação", client.nextAction],
  ];
  return (
    <section className="grid grid-cols-1 overflow-hidden rounded-xl border border-esteira-line bg-esteira-surface shadow-sm sm:grid-cols-2 lg:grid-cols-5">
      {cells.map(([label, value], i) => (
        <div
          key={label}
          className={cn(
            "px-4 py-3",
            i > 0 && "border-t border-esteira-line sm:border-t-0 sm:border-l",
            i === 1 && "sm:border-t-0",
            i >= 2 && "sm:border-t lg:border-t-0",
          )}
        >
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-esteira-soft">
            {label}
          </p>
          <p className={cn("mt-1 text-sm", i !== 1 && i !== 4 ? "font-numeric tnum" : "")}>
            {value}
          </p>
        </div>
      ))}
    </section>
  );
}

function Legend() {
  const items: [StageState, string][] = [
    ["done", "Concluído"],
    ["current", "Em andamento"],
    ["late", "Fora do prazo"],
    ["todo", "Não iniciado"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-esteira-soft">
      {items.map(([state, label]) => (
        <span key={state} className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              DOT[state],
              state === "todo" && "border border-esteira-soft/50",
            )}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
