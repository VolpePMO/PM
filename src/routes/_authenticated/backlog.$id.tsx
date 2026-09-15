import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DIFFICULTY_LABELS,
  PRD_TEMPLATE,
  STATUS_LABELS,
  STATUS_ORDER,
  TYPE_LABELS,
  TYPE_ORDER,
} from "@/lib/domain";
import { PrdAttachments } from "@/components/PrdAttachments";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ItemNotes } from "@/components/ItemNotes";
import { OwnerSelect } from "@/components/OwnerSelect";
import { useDirectory } from "@/hooks/useDirectory";
import { ItemSubtasks } from "@/components/ItemSubtasks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, FileText, MoreHorizontal, Pencil } from "lucide-react";
import { InlineFormProvider } from "@/components/inline-form";
import { initials } from "@/lib/domain";
import { toast } from "sonner";

const STATUS_DOT: Record<string, string> = {
  ideia: "bg-slate-400",
  planejado: "bg-amber-500",
  em_desenvolvimento: "bg-blue-500",
  concluido: "bg-emerald-500",
};

const DIFFICULTY_DOT: Record<string, string> = {
  muito_simples: "bg-slate-400",
  simples: "bg-slate-400",
  moderado: "bg-amber-500",
  complexo: "bg-red-500",
  muito_complexo: "bg-red-500",
};

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right text-xs font-medium">{children}</div>
    </div>
  );
}

function NeutralChip({ dot, children }: { dot?: string | undefined; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />}
      {children}
    </span>
  );
}

export const Route = createFileRoute("/_authenticated/backlog/$id")({
  head: () => ({
    meta: [
      { title: "Item de backlog — Valori PM" },
      { name: "description", content: "Detalhe do item de backlog e descrição vinculada." },
      { property: "og:title", content: "Item de backlog — Valori PM" },
      { property: "og:description", content: "Detalhe do item de backlog e descrição vinculada." },
    ],
  }),
  component: ItemPage,
});

function ItemPage() {
  const { id } = Route.useParams();
  const { userId, isAdmin } = useAuth();
  const { nameOf } = useDirectory();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<string | null>(null);
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoDraft, setInfoDraft] = useState({
    title: "",
    description: "",
    type: "feature",
    status: "ideia",
    difficulty: "moderado",
    period: "",
    owner_id: null as string | null,
  });

  const [editingPrd, setEditingPrd] = useState(false);

  const item = useQuery({
    queryKey: ["backlog-item", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_items")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const prd = useQuery({
    queryKey: ["prd", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prds")
        .select("*")
        .eq("backlog_item_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (prd.data && draft === null) setDraft(prd.data.content);
  }, [prd.data, draft]);

  const savePrd = useMutation({
    mutationFn: async (content: string) => {
      const prdId = prd.data?.id;
      if (!prdId) {
        const { error } = await supabase
          .from("prds")
          .insert({ backlog_item_id: id, content, updated_by: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("prds")
          .update({ content, updated_by: userId })
          .eq("id", prdId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setEditingPrd(false);
      toast.success("Descrição salva");
      void queryClient.invalidateQueries({ queryKey: ["prd", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateInfo = useMutation({
    mutationFn: async (patch: {
      title: string;
      description: string | null;
      type: string;
      status: string;
      difficulty: string;
      period: string | null;
      owner_id: string | null;
    }) => {
      const { error } = await supabase
        .from("backlog_items")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingInfo(false);
      toast.success("Item atualizado");
      void queryClient.invalidateQueries({ queryKey: ["backlog-item", id] });
      void queryClient.invalidateQueries({ queryKey: ["backlog"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const storyPoints = useQuery({
    queryKey: ["subtasks", id, "points"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_subtasks")
        .select("story_points")
        .eq("backlog_item_id", id);
      if (error) throw error;
      return (data ?? []).reduce((sum, s) => sum + (s.story_points ?? 0), 0);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async () => {
      const { data: files } = await supabase
        .from("backlog_attachments")
        .select("storage_path")
        .eq("backlog_item_id", id);
      const { error } = await supabase.from("backlog_items").delete().eq("id", id);
      if (error) throw error;
      const paths = (files ?? []).map((f) => f.storage_path);
      if (paths.length) await supabase.storage.from("backlog-attachments").remove(paths);
    },
    onSuccess: () => {
      toast.success("Item excluído");
      void queryClient.invalidateQueries({ queryKey: ["backlog"] });
      void navigate({ to: "/backlog" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (item.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!item.data) return <p className="text-sm text-muted-foreground">Item não encontrado.</p>;

  const content = draft ?? prd.data?.content ?? "";
  const ownerName = nameOf(item.data.owner_id);

  const properties = (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="p-6 pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Propriedades
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y p-6 pt-0">
        <PropRow label="Tipo">
          <NeutralChip>{TYPE_LABELS[item.data.type]}</NeutralChip>
        </PropRow>
        <PropRow label="Status">
          <NeutralChip dot={STATUS_DOT[item.data.status]}>
            {STATUS_LABELS[item.data.status]}
          </NeutralChip>
        </PropRow>
        <PropRow label="Prioridade">
          <NeutralChip dot={DIFFICULTY_DOT[item.data.difficulty]}>
            {DIFFICULTY_LABELS[item.data.difficulty]}
          </NeutralChip>
        </PropRow>
        <PropRow label="Trimestre">{item.data.period ?? "—"}</PropRow>
        <PropRow label="Responsável">
          <span className="inline-flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              {initials(ownerName)}
            </span>
            {ownerName ?? "Sem responsável"}
          </span>
        </PropRow>
      </CardContent>
    </Card>
  );

  return (
    <InlineFormProvider>
      <div className="mx-auto max-w-[1120px] px-6 py-8">
        <nav
          className="flex items-center gap-1 text-sm text-muted-foreground/70"
          aria-label="Breadcrumb"
        >
          <Link
            to="/backlog"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Backlog
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate">{item.data.title}</span>
        </nav>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-64 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-brand-dark">
                {item.data.title}
              </h1>
              <span className="rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {storyPoints.data ?? 0} story points
              </span>
            </div>
            {item.data.description && (
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                {item.data.description}
              </p>
            )}
          </div>
          {isAdmin && !editingInfo && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setInfoDraft({
                    title: item.data!.title,
                    description: item.data!.description ?? "",
                    type: item.data!.type,
                    status: item.data!.status,
                    difficulty: item.data!.difficulty,
                    period: item.data!.period ?? "",
                    owner_id: item.data!.owner_id,
                  });
                  setEditingInfo(true);
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Editar
              </Button>
              <AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" aria-label="Mais ações">
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        Excluir
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir este item?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Notas, subtarefas, anexos e descrição deste item serão removidos
                      permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleteItem.isPending}
                      onClick={() => deleteItem.mutate()}
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="order-2 space-y-4 lg:order-1">
            {editingInfo && (
              <Card className="rounded-xl shadow-sm">
                <CardHeader className="p-6 pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Editar item
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-6 pt-0">
                  <Input
                    className="text-lg font-semibold"
                    value={infoDraft.title}
                    onChange={(e) => setInfoDraft({ ...infoDraft, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Descrição do item"
                    value={infoDraft.description}
                    onChange={(e) => setInfoDraft({ ...infoDraft, description: e.target.value })}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select
                      value={infoDraft.type}
                      onValueChange={(v) => setInfoDraft({ ...infoDraft, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_ORDER.map((t) => (
                          <SelectItem key={t} value={t}>
                            {TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={infoDraft.status}
                      onValueChange={(v) => setInfoDraft({ ...infoDraft, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((st) => (
                          <SelectItem key={st} value={st}>
                            {STATUS_LABELS[st]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={infoDraft.difficulty}
                      onValueChange={(v) => setInfoDraft({ ...infoDraft, difficulty: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dificuldade" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(DIFFICULTY_LABELS).map((d) => (
                          <SelectItem key={d} value={d}>
                            {DIFFICULTY_LABELS[d]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Período (ex.: 2026-Q4)"
                      value={infoDraft.period}
                      onChange={(e) => setInfoDraft({ ...infoDraft, period: e.target.value })}
                    />
                    <OwnerSelect
                      value={infoDraft.owner_id}
                      onChange={(v) => setInfoDraft({ ...infoDraft, owner_id: v })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingInfo(false)}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!infoDraft.title.trim() || updateInfo.isPending}
                      onClick={() =>
                        updateInfo.mutate({
                          title: infoDraft.title.trim(),
                          description: infoDraft.description.trim() || null,
                          type: infoDraft.type,
                          status: infoDraft.status,
                          difficulty: infoDraft.difficulty,
                          period: infoDraft.period.trim() || null,
                          owner_id: infoDraft.owner_id,
                        })
                      }
                    >
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Descrição
                </CardTitle>
                <div className="flex items-center gap-1">
                  {editingPrd && !content && (
                    <Button variant="ghost" size="sm" onClick={() => setDraft(PRD_TEMPLATE)}>
                      Usar modelo
                    </Button>
                  )}
                  {!editingPrd && content && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setEditingPrd(true)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      Editar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6 pt-0">
                {editingPrd ? (
                  <div className="space-y-3">
                    <RichTextEditor
                      key={prd.data?.id ?? "new"}
                      value={content}
                      onChange={(md) => setDraft(md)}
                    />
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <PrdAttachments itemId={id} prdId={prd.data?.id ?? null} editing />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDraft(prd.data?.content ?? "");
                            setEditingPrd(false);
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => savePrd.mutate(content)}
                          disabled={savePrd.isPending || !content}
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : content ? (
                  <div className="space-y-3">
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_h2]:mt-4 [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-medium [&_li]:ml-4 [&_li]:list-disc [&_ol>li]:list-decimal [&_a]:underline [&_p]:mt-2">
                      <ReactMarkdown>{content}</ReactMarkdown>
                    </div>
                    <PrdAttachments itemId={id} prdId={prd.data?.id ?? null} />
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground/50" aria-hidden />
                    <p className="text-sm text-muted-foreground">Nenhuma descrição ainda.</p>
                    <Button size="sm" variant="outline" onClick={() => setEditingPrd(true)}>
                      Adicionar descrição
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <ItemSubtasks itemId={id} />

            <ItemNotes itemId={id} />
          </div>

          <aside className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-8">{properties}</div>
          </aside>
        </div>
      </div>
    </InlineFormProvider>
  );
}
