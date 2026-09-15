import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowRight, CalendarDays, ChevronDown, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/priorizacao")({
  head: () => ({
    meta: [
      { title: "Priorização — Valori PM" },
      {
        name: "description",
        content:
          "Distribua os projetos entre as áreas fim e separe o que está em progresso do que está priorizado.",
      },
      { property: "og:title", content: "Priorização — Valori PM" },
      {
        property: "og:description",
        content:
          "Distribua os projetos entre as áreas fim e separe o que está em progresso do que está priorizado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PriorizacaoPage,
});

const COLUMNS = [{ key: "engenharia", label: "Engenharia" }] as const;

type Area = (typeof COLUMNS)[number]["key"];

const PRIORITY_CLASS: Record<string, string> = {
  P1: "bg-tag-bug text-tag-bug-foreground",
  P2: "bg-tag-hard text-tag-hard-foreground",
  P3: "bg-tag-medium text-tag-medium-foreground",
  P4: "bg-tag-neutral text-tag-neutral-foreground",
};

const STATUS_CLASS: Record<string, string> = {
  "In progress": "bg-tag-progress text-tag-progress-foreground",
  Backlog: "bg-tag-idea text-tag-idea-foreground",
  Paused: "bg-tag-neutral text-tag-neutral-foreground",
  Done: "bg-tag-done text-tag-done-foreground",
};

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Converte "8 de setembro" em número ordenável (mês*100 + dia). */
function dueOrder(due: string | null): number {
  if (!due) return Number.POSITIVE_INFINITY;
  const m = due.toLowerCase().match(/(\d{1,2})\s*de\s*([\p{L}]+)/u);
  if (!m) return Number.POSITIVE_INFINITY;
  const month = MONTHS.indexOf(m[2]!);
  if (month < 0) return Number.POSITIVE_INFINITY;
  return (month + 1) * 100 + Number(m[1]);
}

const SORT_OPTIONS = [
  { value: "default", label: "Ordem padrão" },
  { value: "pace_desc", label: "Pace (maior primeiro)" },
  { value: "pace_asc", label: "Pace (menor primeiro)" },
  { value: "due_asc", label: "Entrega (mais próxima)" },
  { value: "due_desc", label: "Entrega (mais distante)" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  "In progress": "Em progresso",
  Backlog: "Backlog",
  Paused: "Pausado",
  Done: "Concluído",
};

function MultiSelect(props: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  renderLabel?: (v: string) => string;
}) {
  const { label, options, selected, onChange } = props;
  const text =
    selected.length === 0
      ? label
      : selected.length === 1
        ? (props.renderLabel?.(selected[0]!) ?? selected[0]!)
        : `${label} (${selected.length})`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-36 justify-between px-3 text-xs font-normal"
        >
          <span className="truncate">{text}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onChange([]);
          }}
          className="text-xs"
        >
          Todos
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o}
            checked={selected.includes(o)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, o] : selected.filter((v) => v !== o))
            }
            className="text-xs"
          >
            {props.renderLabel?.(o) ?? o}
          </DropdownMenuCheckboxItem>
        ))}
        {options.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Sem opções</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterBar(props: {
  search: string;
  setSearch: (v: string) => void;
  priority: string;
  setPriority: (v: string) => void;
  area: string;
  setArea: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  priorities: string[];
  areas: string[];
  statuses: string[];
  multi?: {
    areas: string[];
    setAreas: (v: string[]) => void;
    statuses: string[];
    setStatuses: (v: string[]) => void;
  };
}) {
  const m = props.multi;
  const dirty = m
    ? props.priority !== "all" || m.areas.length > 0 || m.statuses.length > 0 || props.search !== ""
    : props.priority !== "all" ||
      props.area !== "all" ||
      props.status !== "all" ||
      props.search !== "";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={props.search}
        onChange={(e) => props.setSearch(e.target.value)}
        placeholder="Buscar projeto"
        className="h-8 w-full max-w-48 text-xs"
      />
      <Select value={props.priority} onValueChange={props.setPriority}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as prioridades</SelectItem>
          {props.priorities.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {m ? (
        <>
          <MultiSelect
            label="Áreas"
            options={props.areas}
            selected={m.areas}
            onChange={m.setAreas}
          />
          <MultiSelect
            label="Andamentos"
            options={props.statuses}
            selected={m.statuses}
            onChange={m.setStatuses}
            renderLabel={(s) => STATUS_LABEL[s] ?? s}
          />
        </>
      ) : (
        <>
          <Select value={props.area} onValueChange={props.setArea}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {props.areas.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={props.status} onValueChange={props.setStatus}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Andamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os andamentos</SelectItem>
              {props.statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
      {dirty && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            props.setPriority("all");
            props.setSearch("");
            if (m) {
              m.setAreas([]);
              m.setStatuses([]);
            } else {
              props.setArea("all");
              props.setStatus("all");
            }
          }}
        >
          Limpar
        </Button>
      )}
    </div>
  );
}

function PortalStructureHeader() {
  return (
    <section className="rounded-xl border bg-muted/30 p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
        Onde estamos
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-brand-dark">
        Estrutura do Portal Valori
      </h2>
      <p className="text-sm text-muted-foreground">Nova fundação em duas ondas de entrega</p>

      <div className="mt-4 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Versão 1</h3>
            <Badge className="border-transparent bg-primary text-primary-foreground text-[10px]">
              Segunda — 24/08/2026
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-background p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Em operação
              </p>
              <p className="mt-1 text-base font-semibold text-primary">Portal Tecpay</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                <li>Portal atual mantido em produção durante toda a transição</li>
                <li>Recebe as ações imediatas de contenção do incidente</li>
              </ul>
            </div>
            <div className="rounded-md bg-primary p-3 text-primary-foreground">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
                Nova fundação
              </p>
              <p className="mt-1 text-base font-semibold">Vault</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs opacity-90">
                <li>Início do Vault já na Versão 1</li>
                <li>Centraliza credenciais, segredos e autorizações</li>
                <li>Base para a nova estrutura de Rules, acessos e MFA</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight className="size-6 text-gold" aria-hidden />
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Versão 2</h3>
            <Badge className="border-transparent bg-gold text-gold-foreground text-[10px]">
              15 de setembro de 2026
            </Badge>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Reconstrução
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-semibold text-primary">Portal 2.0</p>
              <Badge variant="outline" className="text-[10px] font-normal">
                Nova estrutura MVC Razor
              </Badge>
            </div>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
              Escopo da entrega
            </p>
            <ul className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
              {["Vendas", "Recebíveis", "Link de pagamento", "Consulta de efeitos (264)"].map(
                (s) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="size-1.5 shrink-0 rounded-full bg-gold" />
                    {s}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="mt-3 rounded-md bg-primary p-3 text-primary-foreground">
            <p className="text-sm font-semibold">Vault</p>
            <p className="text-xs opacity-90">Nova fundação — sustenta o Portal 2.0</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PriorizacaoPage() {
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [poolPriority, setPoolPriority] = useState("all");
  const [poolArea, setPoolArea] = useState("all");
  const [poolStatus, setPoolStatus] = useState("all");
  const [poolSearch, setPoolSearch] = useState("");
  const [engPriority, setEngPriority] = useState("all");
  const [engAreas, setEngAreas] = useState<string[]>([]);
  const [engStatuses, setEngStatuses] = useState<string[]>([]);
  const [engSearch, setEngSearch] = useState("");
  const [engSort, setEngSort] = useState<string>("default");

  const items = useQuery({
    queryKey: ["prioritization"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prioritization_items")
        .select("id, title, area, position, priority, source_area, status, due_date, pace")
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, area }: { id: string; area: Area | null }) => {
      const { error } = await supabase.from("prioritization_items").update({ area }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["prioritization"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const all = items.data ?? [];
  const priorities = Array.from(
    new Set(all.map((i) => i.priority).filter(Boolean) as string[]),
  ).sort();
  const areas = Array.from(
    new Set(all.map((i) => i.source_area).filter(Boolean) as string[]),
  ).sort();
  const statuses = Array.from(new Set(all.map((i) => i.status).filter(Boolean) as string[])).sort();

  const makeMatcher =
    (priority: string, area: string, status: string, search: string) => (i: (typeof all)[number]) =>
      (priority === "all" || i.priority === priority) &&
      (area === "all" || i.source_area === area) &&
      (status === "all" || i.status === status) &&
      (search.trim() === "" || i.title.toLowerCase().includes(search.trim().toLowerCase()));

  const poolMatches = makeMatcher(poolPriority, poolArea, poolStatus, poolSearch);
  const engMatches = (i: (typeof all)[number]) =>
    (engPriority === "all" || i.priority === engPriority) &&
    (engAreas.length === 0 || (i.source_area != null && engAreas.includes(i.source_area))) &&
    (engStatuses.length === 0 || (i.status != null && engStatuses.includes(i.status))) &&
    (engSearch.trim() === "" || i.title.toLowerCase().includes(engSearch.trim().toLowerCase()));

  const pool = all.filter((i) => !i.area && poolMatches(i));

  function onDrop(area: Area | null) {
    if (!dragging) return;
    move.mutate({ id: dragging, area });
    setDragging(null);
    setOver(null);
  }

  function Card({ item }: { item: (typeof all)[number] }) {
    const p = (item.priority ?? "").slice(0, 2);
    const inProgress = item.status === "In progress";
    return (
      <div
        draggable
        onDragStart={() => setDragging(item.id)}
        onDragEnd={() => setDragging(null)}
        className="cursor-grab rounded-md border bg-card px-3 py-2 shadow-sm transition-shadow hover:shadow active:cursor-grabbing"
      >
        <p className="text-sm leading-snug">{item.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {item.priority && (
            <Badge
              className={`border-transparent text-[10px] font-medium ${PRIORITY_CLASS[p] ?? ""}`}
            >
              {item.priority}
            </Badge>
          )}
          {item.status && (
            <Badge
              className={`border-transparent text-[10px] font-medium ${STATUS_CLASS[item.status] ?? ""}`}
            >
              {STATUS_LABEL[item.status] ?? item.status}
            </Badge>
          )}
          {item.source_area && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {item.source_area}
            </Badge>
          )}
        </div>
        {(inProgress || item.due_date) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {inProgress && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                Pace {item.pace ?? 0}%
              </span>
            )}
            {item.due_date && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {item.due_date}
              </span>
            )}
          </div>
        )}
        {inProgress && (
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, item.pace ?? 0))}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-dark">Priorização</h1>
        <p className="text-sm text-muted-foreground">
          Arraste os projetos para a coluna de Engenharia. Itens em progresso mostram o pace e o
          prazo.
        </p>
      </div>

      <PortalStructureHeader />

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setOver("pool");
          }}
          onDragLeave={() => setOver((v) => (v === "pool" ? null : v))}
          onDrop={() => onDrop(null)}
          className={`rounded-lg border bg-muted/30 p-3 ${over === "pool" ? "ring-2 ring-primary" : ""}`}
        >
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Backlog</h2>
              <Badge variant="secondary">{pool.length}</Badge>
            </div>
            <FilterBar
              search={poolSearch}
              setSearch={setPoolSearch}
              priority={poolPriority}
              setPriority={setPoolPriority}
              area={poolArea}
              setArea={setPoolArea}
              status={poolStatus}
              setStatus={setPoolStatus}
              priorities={priorities}
              areas={areas}
              statuses={statuses}
            />
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {pool.map((i) => (
              <Card key={i.id} item={i} />
            ))}
            {pool.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum projeto pendente com esses filtros.
              </p>
            )}
          </div>
        </section>

        {COLUMNS.map((col) => {
          const base = all.filter((i) => i.area === col.key && engMatches(i));
          const list = [...base].sort((a, b) => {
            if (engSort === "pace_desc") return (b.pace ?? -1) - (a.pace ?? -1);
            if (engSort === "pace_asc")
              return (a.pace ?? Number.MAX_SAFE_INTEGER) - (b.pace ?? Number.MAX_SAFE_INTEGER);
            if (engSort === "due_asc") return dueOrder(a.due_date) - dueOrder(b.due_date);
            if (engSort === "due_desc") {
              const da = dueOrder(a.due_date);
              const db = dueOrder(b.due_date);
              if (da === db) return 0;
              if (!Number.isFinite(da)) return 1;
              if (!Number.isFinite(db)) return -1;
              return db - da;
            }
            return a.position - b.position;
          });
          return (
            <section
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col.key);
              }}
              onDragLeave={() => setOver((v) => (v === col.key ? null : v))}
              onDrop={() => onDrop(col.key)}
              className={`rounded-lg border bg-muted/30 p-3 ${over === col.key ? "ring-2 ring-primary" : ""}`}
            >
              <div className="mb-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{col.label}</h2>
                    <Badge variant="secondary">{list.length}</Badge>
                  </div>
                  <Select value={engSort} onValueChange={setEngSort}>
                    <SelectTrigger className="h-8 w-52 text-xs">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FilterBar
                  search={engSearch}
                  setSearch={setEngSearch}
                  priority={engPriority}
                  setPriority={setEngPriority}
                  area="all"
                  setArea={() => {}}
                  status="all"
                  setStatus={() => {}}
                  priorities={priorities}
                  areas={areas}
                  statuses={statuses}
                  multi={{
                    areas: engAreas,
                    setAreas: setEngAreas,
                    statuses: engStatuses,
                    setStatuses: setEngStatuses,
                  }}
                />
              </div>
              <div className="max-h-[70vh] min-h-40 space-y-2 overflow-y-auto pr-1">
                {list.map((i) => (
                  <Card key={i.id} item={i} />
                ))}
                {list.length === 0 && (
                  <p className="text-xs text-muted-foreground">Solte itens aqui</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
