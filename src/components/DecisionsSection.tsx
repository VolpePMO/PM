import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DECISION_RECORDS,
  formatDecisionDate,
  onlyDigits,
  type DecisionRecord,
} from "@/lib/kanban-decisions";

type Tab = "todos" | "aprovado" | "reprovado";
type SortKey = "name" | "stage" | "decidedAt";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

const TABS: { id: Tab; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "aprovado", label: "Aprovados" },
  { id: "reprovado", label: "Reprovados" },
];

const COLUMNS: { key: SortKey | null; label: string; width: string }[] = [
  { key: "name", label: "Cliente", width: "22%" },
  { key: null, label: "CNPJ", width: "15%" },
  { key: "stage", label: "Etapa", width: "14%" },
  { key: "decidedAt", label: "Decisão", width: "11%" },
  { key: null, label: "Situação", width: "11%" },
  { key: null, label: "Motivo", width: "27%" },
];

function StatusTag({ status }: { status: DecisionRecord["status"] }) {
  const approved = status === "aprovado";
  return (
    <span
      className={cn(
        "inline-block rounded-full px-[10px] py-[3px] text-[12px] font-semibold",
        approved ? "bg-portal-mint text-portal-green" : "bg-[#FBEDEC] text-portal-red",
      )}
    >
      {approved ? "Aprovado" : "Reprovado"}
    </span>
  );
}

export function DecisionsSection() {
  const [tab, setTab] = useState<Tab>("todos");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("decidedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const approved = DECISION_RECORDS.filter((r) => r.status === "aprovado").length;
  const rejected = DECISION_RECORDS.length - approved;
  const rate = Math.round((approved / DECISION_RECORDS.length) * 100);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = onlyDigits(query);
    const rows = DECISION_RECORDS.filter((r) => {
      if (tab !== "todos" && r.status !== tab) return false;
      if (!q) return true;
      if (r.name.toLowerCase().includes(q)) return true;
      if (qDigits && onlyDigits(r.cnpj).includes(qDigits)) return true;
      return r.cnpj.toLowerCase().includes(q);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return av === bv ? 0 : av > bv ? dir : -dir;
    });
  }, [tab, query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "decidedAt" ? "desc" : "asc");
    }
    setPage(1);
  }

  return (
    <section className="mt-10 border-t border-portal-border pt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[20px] font-bold leading-tight text-portal-text">
            Aprovados e reprovados
          </h2>
          <p className="mt-1 text-[14px] text-portal-muted">
            Clientes que concluíram a esteira de credenciamento
          </p>
        </div>
        <p className="text-[13px] text-portal-muted">
          {approved} aprovados · {rejected} reprovados · {rate}% de aprovação
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[10px] bg-portal-divider p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                tab === t.id
                  ? "border border-portal-border bg-portal-surface text-portal-text"
                  : "border border-transparent text-portal-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome ou CNPJ"
            className="w-full max-w-[260px] rounded-[10px] border border-portal-border bg-portal-surface px-3 py-2 text-[13px] text-portal-text placeholder:text-portal-label focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-green sm:w-[260px]"
          />
          <span className="shrink-0 rounded-full bg-portal-divider px-2.5 py-1 text-[11px] text-portal-muted">
            {filtered.length} registro(s)
          </span>
        </div>
      </div>

      {/* tabela — telas ≥900px */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-portal-border bg-portal-surface max-[899px]:hidden">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            {COLUMNS.map((c) => (
              <col key={c.label} style={{ width: c.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.label}
                  className="border-b border-portal-divider px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-portal-label"
                >
                  {c.key ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key!)}
                      className="inline-flex items-center gap-1 uppercase tracking-[0.08em] hover:text-portal-muted"
                    >
                      {c.label}
                      {sortKey === c.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-10 text-center text-[14px] text-portal-muted"
                >
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id} className={cn(i > 0 && "border-t border-portal-divider")}>
                  <td className="px-4 py-[14px] text-[13px] font-medium text-portal-text">
                    {r.name}
                  </td>
                  <td className="px-4 py-[14px] text-[13px] text-portal-muted">{r.cnpj}</td>
                  <td className="px-4 py-[14px] text-[13px] text-portal-text">{r.stage}</td>
                  <td className="px-4 py-[14px] text-[13px] text-portal-text">
                    {formatDecisionDate(r.decidedAt)}
                  </td>
                  <td className="px-4 py-[14px]">
                    <StatusTag status={r.status} />
                  </td>
                  <td className="px-4 py-[14px] text-[13px] text-portal-text">
                    {r.reason ? (
                      <span className="line-clamp-2" title={r.reason}>
                        {r.reason}
                      </span>
                    ) : (
                      <span className="text-[#C3CAC6]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* lista de cards — telas <900px */}
      <div className="mt-4 flex flex-col gap-3 min-[900px]:hidden">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-portal-border bg-portal-surface px-4 py-10 text-center text-[14px] text-portal-muted">
            Nenhum cliente encontrado
          </p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-portal-border bg-portal-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-[14px] font-medium text-portal-text">{r.name}</p>
                <StatusTag status={r.status} />
              </div>
              <p className="mt-1 text-[12px] text-portal-muted">
                {r.cnpj} · {formatDecisionDate(r.decidedAt)} · {r.stage}
              </p>
              {r.reason ? (
                <p className="mt-2 line-clamp-2 text-[13px] text-portal-text" title={r.reason}>
                  {r.reason}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 text-[13px]">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={current === 1}
          className="rounded-lg border border-portal-border px-3 py-1.5 text-portal-text disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="text-portal-muted">
          Página {current} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={current === totalPages}
          className="rounded-lg border border-portal-border px-3 py-1.5 text-portal-text disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </section>
  );
}
