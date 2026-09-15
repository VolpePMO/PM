import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_TAG_CLASS,
  NEUTRAL_TAG_CLASS,
  PERIODS,
  STALE_DAYS,
  STATUS_LABELS,
  STATUS_ORDER,
  STATUS_TAG_CLASS,
  TYPE_LABELS,
  TYPE_TAG_CLASS,
  daysSince,
  isStale,
  toCsv,
} from "@/lib/domain";
import { downloadFile, printToPdf } from "@/lib/export";
import { useDirectory } from "@/hooks/useDirectory";
import { OwnerSelect } from "@/components/OwnerSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/backlog/")({
  head: () => ({
    meta: [
      { title: "Backlog — Valori PM" },
      {
        name: "description",
        content: "Backlog de produto com tipo, status, dificuldade, responsável e período.",
      },
      { property: "og:title", content: "Backlog — Valori PM" },
      {
        property: "og:description",
        content: "Backlog de produto com tipo, status, dificuldade, responsável e período.",
      },
    ],
  }),
  component: BacklogPage,
});

const EMPTY = {
  title: "",
  description: "",
  type: "feature",
  status: "ideia",
  difficulty: "moderado",
  period: "2026-Q3",
  owner_id: null as string | null,
};

type Filters = { type: string; status: string; period: string; owner: string };

const DEFAULT_FILTERS: Filters = { type: "all", status: "all", period: "all", owner: "all" };

function BacklogPage() {
  const queryClient = useQueryClient();
  const { isAdmin, userId } = useAuth();
  const { people, nameOf } = useDirectory();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [viewName, setViewName] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

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

  const views = useQuery({
    queryKey: ["saved-views"],
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_views").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const saveView = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("saved_views")
        .insert({ name: viewName.trim(), filters: filters as never, user_id: userId! });
      if (error) throw error;
    },
    onSuccess: () => {
      setViewName("");
      toast.success("Visão salva");
      void queryClient.invalidateQueries({ queryKey: ["saved-views"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeView = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_views").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["saved-views"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const createItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("backlog_items").insert({
        title: form.title,
        description: form.description || null,
        type: form.type as never,
        status: form.status as never,
        difficulty: form.difficulty as never,
        period: form.period || null,
        owner_id: form.owner_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item criado");
      setForm(EMPTY);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["backlog"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { data: files } = await supabase
        .from("backlog_attachments")
        .select("storage_path")
        .eq("backlog_item_id", itemId);
      const { error } = await supabase.from("backlog_items").delete().eq("id", itemId);
      if (error) throw error;
      const paths = (files ?? []).map((f) => f.storage_path);
      if (paths.length) await supabase.storage.from("backlog-attachments").remove(paths);
    },
    onSuccess: () => {
      toast.success("Item excluído");
      void queryClient.invalidateQueries({ queryKey: ["backlog"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (items.data ?? []).filter(
    (item) =>
      (filters.type === "all" || item.type === filters.type) &&
      (filters.status === "all" || item.status === filters.status) &&
      (filters.period === "all" ||
        (filters.period === "Sem período" ? !item.period : item.period === filters.period)) &&
      (filters.owner === "all" ||
        (filters.owner === "me" ? item.owner_id === userId : item.owner_id === filters.owner)),
  );

  const exportCsv = () => {
    const csv = toCsv(
      [
        "Título",
        "Descrição",
        "Tipo",
        "Status",
        "Dificuldade",
        "Responsável",
        "Período",
        "Atualizado em",
      ],
      rows.map((i) => [
        i.title,
        i.description ?? "",
        TYPE_LABELS[i.type] ?? i.type,
        STATUS_LABELS[i.status] ?? i.status,
        DIFFICULTY_LABELS[i.difficulty] ?? i.difficulty,
        nameOf(i.owner_id) ?? "",
        i.period ?? "",
        new Date(i.updated_at).toLocaleDateString("pt-BR"),
      ]),
    );
    downloadFile(`backlog-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-dark">Backlog</h1>
          <p className="text-sm text-muted-foreground">
            Itens de produto organizados por tipo, status e período.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) => setFilters({ ...filters, status: v })}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_ORDER.map((v) => (
                <SelectItem key={v} value={v}>
                  {STATUS_LABELS[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.period}
            onValueChange={(v) => setFilters({ ...filters, period: v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.owner} onValueChange={(v) => setFilters({ ...filters, owner: v })}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              <SelectItem value="me">Meus itens</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name ?? "Usuário"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv}>
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={printToPdf}>
            Exportar PDF
          </Button>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Novo item</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Novo item de backlog</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={form.type}
                        onValueChange={(v) => setForm({ ...form, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={form.status}
                        onValueChange={(v) => setForm({ ...form, status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map((v) => (
                            <SelectItem key={v} value={v}>
                              {STATUS_LABELS[v]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Dificuldade</Label>
                      <Select
                        value={form.difficulty}
                        onValueChange={(v) => setForm({ ...form, difficulty: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <OwnerSelect
                        value={form.owner_id}
                        onChange={(v) => setForm({ ...form, owner_id: v })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Input
                        value={form.period}
                        onChange={(e) => setForm({ ...form, period: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createItem.mutate()}
                    disabled={!form.title || createItem.isPending}
                  >
                    Criar item
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3 print:hidden">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Visões salvas
        </span>
        {(views.data ?? []).length === 0 && (
          <span className="text-xs text-muted-foreground">Nenhuma visão salva ainda.</span>
        )}
        {(views.data ?? []).map((v) => (
          <span
            key={v.id}
            className="flex items-center gap-1 rounded-full border bg-background pl-3"
          >
            <button
              className="text-xs font-medium hover:underline"
              onClick={() => setFilters({ ...DEFAULT_FILTERS, ...(v.filters as Partial<Filters>) })}
            >
              {v.name}
            </button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => removeView.mutate(v.id)}
            >
              ×
            </Button>
          </span>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Input
            className="h-8 w-44"
            placeholder="Nome da visão"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!viewName.trim() || saveView.isPending}
            onClick={() => saveView.mutate()}
          >
            Salvar filtros
          </Button>
        </div>
      </div>

      {items.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="space-y-3">
        {rows.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1">
                <Link
                  to="/backlog/$id"
                  params={{ id: item.id }}
                  className="font-medium hover:underline"
                >
                  {item.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <Badge className={TYPE_TAG_CLASS[item.type] ?? NEUTRAL_TAG_CLASS}>
                    {TYPE_LABELS[item.type] ?? item.type}
                  </Badge>
                  <Badge className={STATUS_TAG_CLASS[item.status]}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                  <Badge className={DIFFICULTY_TAG_CLASS[item.difficulty]}>
                    {DIFFICULTY_LABELS[item.difficulty]}
                  </Badge>
                  {item.owner_id && (
                    <Badge className={NEUTRAL_TAG_CLASS}>
                      👤 {nameOf(item.owner_id) ?? "Responsável"}
                    </Badge>
                  )}
                  {item.period && <Badge className={NEUTRAL_TAG_CLASS}>{item.period}</Badge>}
                  {isStale(item) && (
                    <Badge
                      variant="outline"
                      className="text-destructive"
                      title={`Parado há ${STALE_DAYS}+ dias`}
                    >
                      Sem atualização há {daysSince(item.updated_at)} dias
                    </Badge>
                  )}
                </div>
              </div>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive print:hidden"
                    >
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir "{item.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Notas, subtarefas, anexos e descrição deste item serão removidos
                        permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={deleteItem.isPending}
                        onClick={() => deleteItem.mutate(item.id)}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </Card>
        ))}
        {!items.isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum item para os filtros selecionados.</p>
        )}
      </div>
    </div>
  );
}
