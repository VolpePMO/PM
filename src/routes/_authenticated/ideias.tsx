import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FEEDBACK_STATUS_LABELS } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OwnerSelect } from "@/components/OwnerSelect";
import { useDirectory } from "@/hooks/useDirectory";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/ideias")({
  head: () => ({
    meta: [
      { title: "Caixa de ideias — Valori PM" },
      {
        name: "description",
        content: "Capture ideias rapidamente e vincule ao backlog quando fizer sentido.",
      },
      { property: "og:title", content: "Caixa de ideias — Valori PM" },
      {
        property: "og:description",
        content: "Capture ideias rapidamente e vincule ao backlog quando fizer sentido.",
      },
    ],
  }),
  component: IdeasPage,
});

function IdeasPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const { nameOf } = useDirectory();
  const [editing, setEditing] = useState<{
    id: string;
    title: string;
    description: string;
    area: string;
  } | null>(null);

  const data = useQuery({
    queryKey: ["ideias"],
    queryFn: async () => {
      const [requests, items] = await Promise.all([
        supabase.from("feedback_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("backlog_items").select("id, title").order("title"),
      ]);
      if (requests.error) throw requests.error;
      if (items.error) throw items.error;
      return { requests: requests.data, items: items.data };
    },
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["ideias"] });

  const createIdea = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("feedback_requests").insert({
        title,
        description: description || null,
        area: area || null,
        owner_id: ownerId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ideia registrada");
      setTitle("");
      setDescription("");
      setArea("");
      setOwnerId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateIdea = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        status?: string;
        backlog_item_id?: string | null;
        owner_id?: string | null;
        title?: string;
        description?: string | null;
        area?: string | null;
      };
    }) => {
      const { error } = await supabase
        .from("feedback_requests")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase
        .from("feedback_requests")
        .update({
          title: editing.title,
          description: editing.description || null,
          area: editing.area || null,
        } as never)
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ideia atualizada");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeIdea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feedback_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ideia removida");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requests = data.data?.requests ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Nova ideia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição detalhada</Label>
            <Textarea
              rows={8}
              className="min-h-40"
              placeholder="Contexto, problema, quem é impactado, resultado esperado…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <OwnerSelect value={ownerId} onChange={setOwnerId} />
          </div>
          <div className="space-y-2">
            <Label>Área</Label>
            <Input
              placeholder="Operações, Engenharia…"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!title || createIdea.isPending}
            onClick={() => createIdea.mutate()}
          >
            Salvar ideia
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-dark">Caixa de ideias</h1>
        {requests.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma ideia ainda.</p>
        )}
        {requests.map((r) => (
          <Card key={r.id} className="p-3">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{r.title}</p>
                {r.description && (
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {r.description}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <Badge variant="secondary">{FEEDBACK_STATUS_LABELS[r.status]}</Badge>
                  {r.area && <Badge variant="outline">{r.area}</Badge>}
                  {r.owner_id && (
                    <Badge variant="outline">👤 {nameOf(r.owner_id) ?? "Responsável"}</Badge>
                  )}
                  <span className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Select
                    value={r.status}
                    onValueChange={(v) => updateIdea.mutate({ id: r.id, patch: { status: v } })}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FEEDBACK_STATUS_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <OwnerSelect
                    className="h-8 w-40 text-xs"
                    value={r.owner_id}
                    onChange={(v) => updateIdea.mutate({ id: r.id, patch: { owner_id: v } })}
                  />
                  <Select
                    value={r.backlog_item_id ?? "none"}
                    onValueChange={(v) =>
                      updateIdea.mutate({
                        id: r.id,
                        patch: { backlog_item_id: v === "none" ? null : v },
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue placeholder="Vincular ao backlog" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem vínculo</SelectItem>
                      {(data.data?.items ?? []).map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() =>
                      setEditing({
                        id: r.id,
                        title: r.title,
                        description: r.description ?? "",
                        area: r.area ?? "",
                      })
                    }
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => removeIdea.mutate(r.id)}
                  >
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar ideia</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição detalhada</Label>
                <Textarea
                  rows={10}
                  className="min-h-48"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Área</Label>
                <Input
                  value={editing.area}
                  onChange={(e) => setEditing({ ...editing, area: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!editing?.title || saveEdit.isPending}
              onClick={() => saveEdit.mutate()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
