import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ALLOWED_UPLOAD_ACCEPT,
  ALLOWED_UPLOAD_LABEL,
  STATUS_LABELS,
  STATUS_ORDER,
  uploadRejectionReason,
} from "@/lib/domain";
import { openAttachment } from "@/components/ItemNotes";
import { AttachmentChips } from "@/components/AttachmentChips";
import { InlineFormShell, InlineFormTrigger, useInlineForm } from "@/components/inline-form";
import { Paperclip, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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

type Subtask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  position: number;
  story_points: number | null;
};

type SubtaskPatch = {
  title?: string;
  description?: string | null;
  status?: "ideia" | "planejado" | "em_desenvolvimento" | "concluido";
  story_points?: number | null;
};

type Attachment = {
  id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  uploaded_by: string | null;
  uploader_name: string | null;
  subtask_id: string | null;
};

export function ItemSubtasks({ itemId }: { itemId: string }) {
  const { userId, displayName } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", description: "", story_points: "" });
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [pending, setPending] = useState<File[]>([]);
  const newFileInput = useRef<HTMLInputElement | null>(null);
  const titleInput = useRef<HTMLInputElement | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPoints("");
    setPending([]);
    if (newFileInput.current) newFileInput.current.value = "";
  };

  const form = useInlineForm("subtask-create", {
    hasText: () => !!title.trim() || !!description.trim() || !!points.trim() || pending.length > 0,
    reset: resetForm,
  });

  useEffect(() => {
    if (form.isOpen) titleInput.current?.focus();
  }, [form.isOpen]);

  const onFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      form.close();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && title.trim()) {
      e.preventDefault();
      create.mutate();
    }
  };

  const subtasks = useQuery({
    queryKey: ["subtasks", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_subtasks")
        .select("id, title, description, status, position, story_points")
        .eq("backlog_item_id", itemId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Subtask[];
    },
  });

  const attachments = useQuery({
    queryKey: ["subtask-attachments", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_attachments")
        .select("id, file_name, storage_path, size_bytes, uploaded_by, uploader_name, subtask_id")
        .eq("backlog_item_id", itemId)
        .not("subtask_id", "is", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Attachment[];
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["subtasks", itemId] });
    void queryClient.invalidateQueries({ queryKey: ["subtask-attachments", itemId] });
  };

  const list = subtasks.data ?? [];
  const done = list.filter((s) => s.status === "concluido").length;
  const progress = list.length ? Math.round((done / list.length) * 100) : 0;
  const totalPoints = list.reduce((sum, s) => sum + (s.story_points ?? 0), 0);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("backlog_subtasks")
        .insert({
          backlog_item_id: itemId,
          title: title.trim(),
          description: description.trim() || null,
          story_points: points.trim() ? Number(points) : null,
          position: list.length,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (pending.length && data) {
        const dt = new DataTransfer();
        pending.forEach((f) => dt.items.add(f));
        await uploadFiles(data.id, dt.files);
      }
    },
    onSuccess: () => {
      resetForm();
      form.close(true);
      toast.success("US adicionada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: SubtaskPatch }) => {
      const { error } = await supabase.from("backlog_subtasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const paths = (attachments.data ?? [])
        .filter((a) => a.subtask_id === id)
        .map((a) => a.storage_path);
      const { error } = await supabase.from("backlog_subtasks").delete().eq("id", id);
      if (error) throw error;
      if (paths.length) await supabase.storage.from("backlog-attachments").remove(paths);
    },
    onSuccess: () => {
      toast.success("US removida");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAttachment = useMutation({
    mutationFn: async (att: { id: string; storage_path: string }) => {
      const { error } = await supabase.from("backlog_attachments").delete().eq("id", att.id);
      if (error) throw error;
      await supabase.storage.from("backlog-attachments").remove([att.storage_path]);
    },
    onSuccess: () => {
      toast.success("Anexo removido");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadFiles(subtaskId: string, files: FileList) {
    if (!userId) return;
    const picked = Array.from(files);
    const reasons = picked.map((f) => uploadRejectionReason(f));
    const valid = picked.filter((_, i) => !reasons[i]);
    if (valid.length !== picked.length) toast.error(reasons.find(Boolean) as string);
    const input = fileInputs.current[subtaskId];
    if (valid.length === 0) {
      if (input) input.value = "";
      return;
    }
    setUploadingFor(subtaskId);
    try {
      for (const file of valid) {
        const path = `${itemId}/subtasks/${subtaskId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("backlog-attachments")
          .upload(path, file, file.type ? { contentType: file.type } : {});
        if (upErr) throw upErr;
        const { error } = await supabase.from("backlog_attachments").insert({
          backlog_item_id: itemId,
          subtask_id: subtaskId,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: userId,
          uploader_name: displayName,
        });
        if (error) throw error;
      }
      toast.success("Anexo enviado");
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingFor(null);
      if (input) input.value = "";
    }
  }

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 p-6 pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          USs
        </CardTitle>
        <div className="flex min-w-32 items-center gap-3 sm:max-w-xs sm:flex-1">
          {list.length > 0 && <Progress value={progress} className="h-1.5 flex-1" />}
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {done}/{list.length}
          </span>
          {totalPoints > 0 && (
            <span className="whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {totalPoints} pts
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma US ainda.</p>}

        <ul className="space-y-3">
          {list.map((s) => {
            const files = (attachments.data ?? []).filter((a) => a.subtask_id === s.id);
            const isEditing = editing === s.id;
            return (
              <li key={s.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={s.status === "concluido"}
                    onCheckedChange={(checked) =>
                      update.mutate({
                        id: s.id,
                        patch: { status: checked ? "concluido" : ("em_desenvolvimento" as const) },
                      })
                    }
                  />
                  <div className="min-w-48 flex-1 space-y-2">
                    {isEditing ? (
                      <>
                        <Input
                          value={editDraft.title}
                          onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                        />
                        <Textarea
                          value={editDraft.description}
                          placeholder="Descrição (opcional)"
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, description: e.target.value })
                          }
                        />
                        <Input
                          type="number"
                          min={0}
                          className="w-40"
                          placeholder="Story points"
                          value={editDraft.story_points}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, story_points: e.target.value })
                          }
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={!editDraft.title.trim()}
                            onClick={() =>
                              update.mutate({
                                id: s.id,
                                patch: {
                                  title: editDraft.title.trim(),
                                  description: editDraft.description.trim() || null,
                                  story_points: editDraft.story_points.trim()
                                    ? Number(editDraft.story_points)
                                    : null,
                                },
                              })
                            }
                          >
                            Salvar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`font-medium ${s.status === "concluido" ? "text-muted-foreground line-through" : ""}`}
                          >
                            {s.title}
                          </p>
                          {s.story_points != null && (
                            <span className="rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
                              {s.story_points} pts
                            </span>
                          )}
                        </div>
                        {s.description && (
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {s.description}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={s.status}
                      onValueChange={(v) =>
                        update.mutate({
                          id: s.id,
                          patch: { status: v as NonNullable<SubtaskPatch["status"]> },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-44 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((st) => (
                          <SelectItem key={st} value={st}>
                            {STATUS_LABELS[st]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!isEditing && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(s.id);
                            setEditDraft({
                              title: s.title,
                              description: s.description ?? "",
                              story_points: s.story_points?.toString() ?? "",
                            });
                          }}
                        >
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir esta US?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Os anexos da US também serão removidos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove.mutate(s.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-2">
                    <AttachmentChips
                      files={files}
                      onOpen={(f) => {
                        const att = files.find((a) => a.id === f.id);
                        if (att) void openAttachment(att.storage_path);
                      }}
                      onRemove={(f) => {
                        const att = files.find((a) => a.id === f.id);
                        if (att)
                          removeAttachment.mutate({ id: att.id, storage_path: att.storage_path });
                      }}
                    />
                    <input
                      ref={(el) => {
                        fileInputs.current[s.id] = el;
                      }}
                      type="file"
                      multiple
                      accept={ALLOWED_UPLOAD_ACCEPT}
                      className="hidden"
                      onChange={(e) => e.target.files && void uploadFiles(s.id, e.target.files)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={ALLOWED_UPLOAD_LABEL}
                      title={ALLOWED_UPLOAD_LABEL}
                      disabled={uploadingFor === s.id}
                      onClick={() => fileInputs.current[s.id]?.click()}
                    >
                      <Paperclip className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ) : files.length > 0 ? (
                  <div className="mt-3">
                    <AttachmentChips
                      files={files}
                      onOpen={(f) => {
                        const att = files.find((a) => a.id === f.id);
                        if (att) void openAttachment(att.storage_path);
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        {form.isOpen ? (
          <InlineFormShell>
            <div className="space-y-3 rounded-lg border p-4">
              <Input
                ref={titleInput}
                placeholder="Título da US (história de usuário)"
                value={title}
                onKeyDown={onFormKeyDown}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                className="w-40"
                placeholder="Story points"
                value={points}
                onKeyDown={onFormKeyDown}
                onChange={(e) => setPoints(e.target.value)}
              />
              <Textarea
                placeholder="Descrição (opcional)"
                value={description}
                onKeyDown={onFormKeyDown}
                onChange={(e) => setDescription(e.target.value)}
              />
              <input
                ref={newFileInput}
                type="file"
                multiple
                accept={ALLOWED_UPLOAD_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  const reason = picked.map((f) => uploadRejectionReason(f)).find(Boolean);
                  if (reason) toast.error(reason as string);
                  setPending(picked.filter((f) => !uploadRejectionReason(f)));
                }}
              />
              {pending.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pending.map((f) => (
                    <span
                      key={f.name}
                      className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs"
                    >
                      {f.name}
                      <button
                        type="button"
                        aria-label={`Remover ${f.name}`}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setPending((prev) => prev.filter((x) => x !== f))}
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={ALLOWED_UPLOAD_LABEL}
                  title={ALLOWED_UPLOAD_LABEL}
                  onClick={() => newFileInput.current?.click()}
                >
                  <Paperclip className="h-4 w-4" aria-hidden />
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => form.close()}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!title.trim() || create.isPending}
                    onClick={() => create.mutate()}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          </InlineFormShell>
        ) : (
          <InlineFormTrigger
            label="Adicionar US"
            onClick={form.open}
            icon={<Plus className="h-4 w-4" aria-hidden />}
          />
        )}
      </CardContent>
    </Card>
  );
}
