import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_TAG_CLASS,
  PERIODS,
  STATUS_LABELS,
  STATUS_TAG_CLASS,
  TYPE_LABELS,
  TYPE_TAG_CLASS,
  toCsv,
} from "@/lib/domain";
import { downloadFile, printToPdf } from "@/lib/export";
import { useDirectory } from "@/hooks/useDirectory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap — Valori PM" },
      {
        name: "description",
        content: "Roadmap por trimestre, com arrastar-e-soltar e exportação.",
      },
      { property: "og:title", content: "Roadmap — Valori PM" },
      {
        property: "og:description",
        content: "Roadmap por trimestre, com arrastar-e-soltar e exportação.",
      },
    ],
  }),
  component: RoadmapPage,
});

function RoadmapPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { nameOf } = useDirectory();
  const [mode, setMode] = useState<"executivo" | "completo">("completo");
  const [dragging, setDragging] = useState<string | null>(null);

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

  const movePeriod = useMutation({
    mutationFn: async ({ id, period }: { id: string; period: string | null }) => {
      const { error } = await supabase.from("backlog_items").update({ period }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["backlog"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function onDrop(period: string) {
    if (!dragging || !isAdmin) return;
    movePeriod.mutate({ id: dragging, period: period === "Sem período" ? null : period });
    setDragging(null);
  }

  const all = items.data ?? [];

  const exportCsv = () => {
    const csv = toCsv(
      ["Período", "Título", "Tipo", "Status", "Dificuldade", "Responsável"],
      all.map((i) => [
        i.period ?? "Sem período",
        i.title,
        TYPE_LABELS[i.type] ?? i.type,
        STATUS_LABELS[i.status] ?? i.status,
        DIFFICULTY_LABELS[i.difficulty] ?? i.difficulty,
        nameOf(i.owner_id) ?? "",
      ]),
    );
    downloadFile(`roadmap-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-dark">Roadmap</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Arraste um card para mudar o período." : "Visão por período."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={printToPdf}>
            Exportar PDF
          </Button>
          <Button
            variant={mode === "executivo" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("executivo")}
          >
            Executivo
          </Button>
          <Button
            variant={mode === "completo" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("completo")}
          >
            Completo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {PERIODS.map((period) => {
          const inPeriod = all.filter((i) =>
            period === "Sem período" ? !i.period : i.period === period,
          );
          return (
            <div
              key={period}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(period)}
              className="min-h-64 rounded-lg border bg-muted/30 p-3"
            >
              <h2 className="mb-3 text-sm font-semibold">{period}</h2>
              <div className="space-y-2">
                {inPeriod.map((item) => (
                  <div
                    key={item.id}
                    draggable={isAdmin}
                    onDragStart={() => setDragging(item.id)}
                    className="rounded-md border bg-card p-3 shadow-sm"
                  >
                    <Link
                      to="/backlog/$id"
                      params={{ id: item.id }}
                      className="text-sm font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                      <Badge className={STATUS_TAG_CLASS[item.status]}>
                        {STATUS_LABELS[item.status]}
                      </Badge>
                      {mode === "completo" && (
                        <>
                          <Badge className={TYPE_TAG_CLASS[item.type]}>
                            {TYPE_LABELS[item.type]}
                          </Badge>
                          <Badge className={DIFFICULTY_TAG_CLASS[item.difficulty]}>
                            {DIFFICULTY_LABELS[item.difficulty]}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {inPeriod.length === 0 && <p className="text-xs text-muted-foreground">Vazio</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
