import { useId, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Clock, Info, Layers, Timer, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { DecisionsSection } from "@/components/DecisionsSection";
import { medianaConclusaoDias } from "@/lib/kanban-decisions";
import {
  KANBAN_CLIENTS,
  KANBAN_STAGES,
  KANBAN_WHITELABEL,
  formatDuration,
  formatDurationDias,
  slaEmDias,
  type KanbanClient,
} from "@/lib/kanban-data";

export const Route = createFileRoute("/_authenticated/kanban")({
  head: () => ({
    meta: [
      { title: "Kanban de On-Boarding — Portal do Parceiro Valori" },
      {
        name: "description",
        content:
          "Veja todos os clientes do seu WhiteLabel distribuídos pelas etapas do credenciamento, com prazos, responsáveis e próxima ação.",
      },
      { property: "og:title", content: "Kanban de On-Boarding — Portal do Parceiro Valori" },
      {
        property: "og:description",
        content: "Quadro de acompanhamento do credenciamento de clientes por etapa e prazo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KanbanPage,
});

/**
 * Configuração das etapas da esteira.
 * Renomear uma etapa, mudar a ordem ou o SLA é alterar apenas uma linha aqui.
 */
type StageConfig = {
  id: number;
  order: number;
  name: string;
  /** SLA da etapa em horas — unidade base e única fonte da verdade */
  slaHoras: number;
  owner: string;
};

const STAGES: StageConfig[] = KANBAN_STAGES.map((s, i) => ({
  id: s.id,
  order: i + 1,
  name: s.name,
  slaHoras: s.slaHoras,
  owner: s.owner,
})).sort((a, b) => a.order - b.order);

const TOTAL_SLA_HORAS = STAGES.reduce((acc, s) => acc + s.slaHoras, 0);

const FONT_STACK =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Prazo tem apenas dois estados: dentro (cinza) ou ultrapassado (vermelho). */
type DeadlineTone = "within" | "over";

const DEADLINE = {
  within: { fill: "#B6BEB9", border: "#D8DEDA", text: "#7E8783", weight: 500 },
  over: { fill: "#B3261E", border: "#B3261E", text: "#B3261E", weight: 600 },
} as const;

const TRACK_COLOR = "#EDF0EE";
const DAYS_TEXT = "#7E8783";
const CAPTION_COLOR = "#7E8783";
const EMPTY_COLOR = "#C3CAC6";

function stageOf(client: KanbanClient): StageConfig {
  return STAGES.find((s) => s.id === client.stage) ?? STAGES[0]!;
}

function stageSlaDias(stage: StageConfig) {
  return slaEmDias(stage.slaHoras);
}

function toneOf(client: KanbanClient): DeadlineTone {
  return client.days > stageSlaDias(stageOf(client)) ? "over" : "within";
}

const LABEL_CLS = "text-[10px] font-semibold uppercase tracking-[0.08em] text-portal-label";

function KanbanPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const lateCount = KANBAN_CLIENTS.filter((c) => toneOf(c) === "over").length;
  const mediana = medianaConclusaoDias();

  return (
    <div
      data-esteira
      className="min-h-screen w-full overflow-x-hidden bg-portal-bg bg-gradient-to-b from-portal-bg to-portal-bg-2 px-4 py-8 text-portal-text sm:px-6 lg:px-8"
      style={{ fontFamily: FONT_STACK }}
    >
      <div className="mx-auto flex w-full flex-col gap-6">
        <Header />

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<Layers className="h-4 w-4 text-portal-green" />}
            label="Clientes em esteira"
            value={String(KANBAN_CLIENTS.length)}
          />
          <StatCard
            icon={<TriangleAlert className="h-4 w-4 text-portal-green" />}
            label="Fora do prazo"
            value={String(lateCount)}
            alert={lateCount > 0}
          />
          <StatCard
            icon={<Clock className="h-4 w-4 text-portal-green" />}
            label="Tempo de conclusão"
            value={mediana === null ? "—" : formatDurationDias(mediana)}
            muted={mediana === null}
            caption={
              mediana === null
                ? "Base insuficiente nos últimos 30 dias"
                : "Mediana dos últimos 30 dias"
            }
            info="Mediana do tempo total de esteira dos clientes que concluíram o credenciamento nos últimos 30 dias. Usamos a mediana e não a média porque um único caso muito demorado distorce a média e faz o indicador parecer pior do que a operação real."
          />
          <StatCard
            icon={<Timer className="h-4 w-4 text-portal-green" />}
            label="SLA total do processo"
            value={formatDuration(TOTAL_SLA_HORAS)}
            caption={`Soma dos SLAs das ${STAGES.length === 5 ? "cinco" : String(STAGES.length)} etapas`}
          />
        </section>

        <div className="w-full max-w-full pb-2">
          <div className="flex w-full gap-4 max-[899px]:min-w-0 max-[899px]:flex-col">
            {STAGES.map((stage) => {
              const clients = KANBAN_CLIENTS.filter((c) => c.stage === stage.id);
              const isCollapsed = collapsed[stage.id] === true;
              return (
                <section
                  key={stage.id}
                  className="flex min-w-0 flex-1 flex-col rounded-2xl border border-portal-border bg-portal-inner max-[899px]:w-full"
                >
                  <button
                    type="button"
                    onClick={() => setCollapsed((prev) => ({ ...prev, [stage.id]: !isCollapsed }))}
                    className="flex w-full items-start justify-between gap-2 border-b border-portal-border px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-green focus-visible:ring-inset max-[899px]:cursor-pointer min-[900px]:pointer-events-none"
                    aria-expanded={!isCollapsed}
                  >
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-semibold leading-snug text-portal-text">
                        {stage.name}
                      </h2>
                      <p className="mt-1 text-[11px] text-portal-muted">
                        SLA da etapa · {formatDuration(stage.slaHoras)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-portal-mint px-2 py-0.5 text-[11px] font-semibold text-portal-green">
                        {clients.length}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-portal-label transition-transform duration-200 min-[900px]:hidden",
                          isCollapsed && "-rotate-90",
                        )}
                      />
                    </span>
                  </button>

                  <div
                    className={cn("flex flex-col gap-4 p-4", isCollapsed && "max-[899px]:hidden")}
                  >
                    {clients.length === 0 ? (
                      <p className="py-4 text-center text-[13px] text-portal-muted">
                        Nenhum cliente nesta etapa
                      </p>
                    ) : (
                      clients.map((client) => (
                        <ClientCard
                          key={client.id}
                          client={client}
                          open={openId === client.id}
                          onToggle={() =>
                            setOpenId((prev) => (prev === client.id ? null : client.id))
                          }
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <Legend />
        <p className="text-[13px] leading-relaxed text-portal-muted">
          Prazos em dias corridos, contados a partir da entrada do cliente na etapa atual. Dados
          simulados para validação da visão.
        </p>

        <DecisionsSection />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-portal-border pb-6">
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className={LABEL_CLS}>Valori · Portal do Parceiro / Kanban</p>
          <h1 className="mt-2 text-[30px] font-bold leading-tight tracking-tight text-portal-text">
            Kanban de On-Boarding
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-portal-muted">
            Todos os seus clientes distribuídos pelas etapas do credenciamento. Clique em um cliente
            para expandir o card e ver os detalhes.
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-portal-dark px-5 py-4 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-portal-amber">
            WhiteLabel
          </p>
          <p className="mt-1 text-[15px] font-semibold">{KANBAN_WHITELABEL.name}</p>
          <p className="mt-1 text-[12px] text-white/70">
            ID {KANBAN_WHITELABEL.id} · {KANBAN_CLIENTS.length} clientes em esteira
          </p>
        </div>
      </div>
    </header>
  );
}

function StatCard({
  label,
  value,
  alert,
  icon,
  caption,
  info,
  muted,
}: {
  label: string;
  value: string;
  alert?: boolean;
  icon?: React.ReactNode;
  caption?: string;
  info?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-portal-border bg-portal-surface p-5 shadow-portal">
      {icon ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-portal-mint">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className={cn(LABEL_CLS, "flex items-center gap-1.5")}>
          {label}
          {info ? (
            <span className="group relative inline-flex">
              <span
                tabIndex={0}
                role="img"
                aria-label={info}
                className="inline-flex cursor-help rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-green"
              >
                <Info className="h-[14px] w-[14px]" style={{ color: "#98A09C" }} />
              </span>
              <span className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-72 rounded-lg bg-portal-dark p-3 text-[12px] font-normal normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:block group-hover:opacity-100 group-focus-within:block group-focus-within:opacity-100">
                {info}
              </span>
            </span>
          ) : null}
        </p>
        <p
          className={cn(
            "mt-1 text-[30px] font-bold leading-none",
            alert ? "text-portal-red" : "text-portal-text",
          )}
          style={muted ? { color: EMPTY_COLOR } : undefined}
        >
          {value}
        </p>
        {caption ? (
          <p className="mt-1 text-[11px]" style={{ color: CAPTION_COLOR }}>
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ClientCard({
  client,
  open,
  onToggle,
}: {
  client: KanbanClient;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const stage = stageOf(client);
  const slaDias = stageSlaDias(stage);
  const tone = toneOf(client);
  const colors = DEADLINE[tone];
  const meter = Math.min(client.days / slaDias, 1) * 100;
  const remaining = slaDias - client.days;
  const right =
    tone === "over"
      ? `+${client.days - slaDias}d`
      : remaining === 0
        ? "vence hoje"
        : `${remaining}d restantes`;
  const pendencia = client.pendencia?.trim();

  return (
    <div className="overflow-hidden rounded-xl border border-portal-border bg-portal-surface shadow-portal">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="relative flex w-full flex-col gap-3 p-5 pl-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-green focus-visible:ring-inset"
      >
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: colors.border }}
        />
        <span className="flex items-start justify-between gap-2">
          <span className="text-[15px] font-semibold leading-snug text-portal-text">
            {client.name}
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-portal-label transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </span>
        <span className="flex items-baseline justify-between gap-2 text-[12px]">
          <span style={{ color: DAYS_TEXT }}>
            {client.days} de {formatDurationDias(slaDias)}
          </span>
          <span style={{ color: colors.text, fontWeight: colors.weight }}>{right}</span>
        </span>
        <span
          className="block h-1 overflow-hidden rounded-full"
          style={{ backgroundColor: TRACK_COLOR }}
        >
          <span
            className="block h-full rounded-full"
            style={{ width: `${meter}%`, backgroundColor: colors.fill }}
          />
        </span>

        {pendencia ? (
          <span
            title={pendencia}
            className="mt-[10px] block w-full rounded-md border-l-[3px] px-[10px] py-2"
            style={{ backgroundColor: "#FDF6EA", borderLeftColor: "#E9A23B" }}
          >
            <span className="line-clamp-2 block text-[12px] leading-[1.45] text-[#1C1F1D]">
              <span className="font-semibold">Pendência:</span>{" "}
              <span className="font-normal">{pendencia}</span>
            </span>
          </span>
        ) : null}
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-portal-divider bg-portal-inner p-5">
            <Details client={client} stageName={stage.name} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Details({ client, stageName }: { client: KanbanClient; stageName: string }) {
  const rows: [string, string][] = [
    ["CNPJ", client.cnpj],
    ["Entrada", client.entry],
    ["No processo", formatDurationDias(client.inProcess)],
    ["Etapa", stageName],
    ["Previsão", client.forecast],
  ];

  return (
    <dl className="flex flex-col">
      {rows.map(([k, v], i) => (
        <div
          key={k}
          className={cn(
            "flex items-baseline justify-between gap-3 py-2 text-[12px]",
            i > 0 && "border-t border-portal-divider",
          )}
        >
          <dt className="text-portal-muted">{k}</dt>
          <dd className="text-right font-medium text-portal-text">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Legend() {
  const items: [DeadlineTone, string][] = [
    ["within", "No prazo"],
    ["over", "Fora do prazo"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-[13px] text-portal-muted">
      {items.map(([tone, label]) => (
        <span key={tone} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: DEADLINE[tone].fill }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
