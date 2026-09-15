import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDirectory } from "@/hooks/useDirectory";
import {
  ALLOWED_UPLOAD_ACCEPT,
  ALLOWED_UPLOAD_LABEL,
  mentionHandle,
  resolveMentions,
  uploadRejectionReason,
} from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AtSign, MessageSquarePlus, Paperclip, X } from "lucide-react";
import { InlineFormShell, InlineFormTrigger, useInlineForm } from "@/components/inline-form";
import { UserAvatar } from "@/components/UserAvatar";
import { AttachmentChips } from "@/components/AttachmentChips";

type Attachment = {
  id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  uploaded_by: string | null;
  uploader_name: string | null;
  comment_id: string | null;
};

export async function openAttachment(path: string) {
  const { data, error } = await supabase.storage
    .from("backlog-attachments")
    .createSignedUrl(path, 60);
  if (error || !data) {
    toast.error(error?.message ?? "Falha ao abrir arquivo");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}

export function ItemNotes({ itemId }: { itemId: string }) {
  const { userId, displayName, isAdmin } = useAuth();
  const { people, nameOf } = useDirectory();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const notes = useQuery({
    queryKey: ["backlog-comments", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_comments")
        .select("*")
        .eq("backlog_item_id", itemId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const noteAttachments = useQuery({
    queryKey: ["comment-attachments", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_attachments")
        .select("id, file_name, storage_path, size_bytes, uploaded_by, uploader_name, comment_id")
        .eq("backlog_item_id", itemId)
        .not("comment_id", "is", null);
      if (error) throw error;
      return data as Attachment[];
    },
  });

  const mentioned = useMemo(() => resolveMentions(body, people), [body, people]);

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list);
    const reasons = picked.map((f) => uploadRejectionReason(f));
    if (reasons.some(Boolean)) toast.error(reasons.find(Boolean) as string);
    setFiles(picked.filter((_, i) => !reasons[i]));
  };

  const insertMention = (name: string | null) => {
    const handle = mentionHandle(name);
    if (!handle) return;
    setBody((prev) =>
      prev.endsWith("@")
        ? `${prev}${handle} `
        : `${prev}${prev && !prev.endsWith(" ") ? " " : ""}@${handle} `,
    );
  };

  const resetComposer = () => {
    setBody("");
    setFiles([]);
    if (fileInput.current) fileInput.current.value = "";
  };

  const composer = useInlineForm("note-composer", {
    hasText: () => !!body.trim() || files.length > 0,
    reset: resetComposer,
  });

  useEffect(() => {
    if (composer.isOpen) textareaRef.current?.focus();
  }, [composer.isOpen]);

  const submit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const { data: note, error } = await supabase
        .from("backlog_comments")
        .insert({
          backlog_item_id: itemId,
          body: body.trim(),
          kind: "note",
          mentions: mentioned,
          author_id: userId,
          author_name: displayName || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      for (const file of files) {
        const path = `${itemId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("backlog-attachments")
          .upload(path, file, file.type ? { contentType: file.type } : {});
        if (upErr) throw upErr;
        const { error: attErr } = await supabase.from("backlog_attachments").insert({
          backlog_item_id: itemId,
          comment_id: note.id,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: userId,
        });
        if (attErr) throw attErr;
      }

      resetComposer();
      composer.close(true);
      void queryClient.invalidateQueries({ queryKey: ["backlog-comments", itemId] });
      void queryClient.invalidateQueries({ queryKey: ["comment-attachments", itemId] });
      toast.success("Nota registrada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removeNote = useMutation({
    mutationFn: async (id: string) => {
      const paths = (noteAttachments.data ?? [])
        .filter((a) => a.comment_id === id)
        .map((a) => a.storage_path);
      const { error } = await supabase.from("backlog_comments").delete().eq("id", id);
      if (error) throw error;
      if (paths.length) await supabase.storage.from("backlog-attachments").remove(paths);
    },
    onSuccess: () => {
      toast.success("Nota removida");
      void queryClient.invalidateQueries({ queryKey: ["backlog-comments", itemId] });
      void queryClient.invalidateQueries({ queryKey: ["comment-attachments", itemId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onComposerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      composer.close();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && body.trim() && !saving) {
      e.preventDefault();
      void submit();
    }
  };

  const list = notes.data ?? [];

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Notas e discussão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma nota ainda.</p>
        ) : (
          <ul className="space-y-5">
            {list.map((c) => {
              const atts = (noteAttachments.data ?? []).filter((a) => a.comment_id === c.id);
              const canManage = isAdmin || (!!userId && c.author_id === userId);
              const author = c.author_name ?? nameOf(c.author_id) ?? "Usuário";
              return (
                <li key={c.id} className="flex gap-3">
                  <UserAvatar name={author} path={null} className="h-6 w-6" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{author}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString("pt-BR")}
                      </span>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto h-7 px-2 text-xs"
                          onClick={() => removeNote.mutate(c.id)}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                    {(c.mentions ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(c.mentions ?? []).map((m) => (
                          <Badge key={m} variant="secondary" className="text-[10px]">
                            @{mentionHandle(nameOf(m))}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {atts.length > 0 && (
                      <div className="mt-2">
                        <AttachmentChips
                          files={atts}
                          onOpen={(f) => {
                            const att = atts.find((a) => a.id === f.id);
                            if (att) void openAttachment(att.storage_path);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {composer.isOpen ? (
          <InlineFormShell>
            <div className="flex gap-3 rounded-lg border p-4">
              <UserAvatar name={displayName} path={null} className="h-6 w-6" />
              <div className="min-w-0 flex-1 space-y-3">
                <Textarea
                  ref={textareaRef}
                  rows={3}
                  value={body}
                  placeholder="Escreva uma nota e use @nome para chamar alguém…"
                  onKeyDown={onComposerKeyDown}
                  onChange={(e) => {
                    setBody(e.target.value);
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                />
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept={ALLOWED_UPLOAD_ACCEPT}
                  className="hidden"
                  onChange={(e) => pickFiles(e.target.files)}
                />
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((f) => (
                      <span
                        key={f.name}
                        className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs"
                      >
                        {f.name}
                        <button
                          type="button"
                          aria-label={`Remover ${f.name}`}
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {mentioned.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Serão marcados: {mentioned.map((m) => nameOf(m) ?? "Usuário").join(", ")}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={ALLOWED_UPLOAD_LABEL}
                      title={ALLOWED_UPLOAD_LABEL}
                      onClick={() => fileInput.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Mencionar pessoa"
                      title="Mencionar pessoa"
                      onClick={() => {
                        setBody((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}@`);
                        textareaRef.current?.focus();
                      }}
                    >
                      <AtSign className="h-4 w-4" aria-hidden />
                    </Button>
                    {people
                      .filter((p) => body.trimEnd().endsWith("@"))
                      .slice(0, 4)
                      .map((p) => (
                        <Button
                          key={p.id}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => insertMention(p.display_name)}
                        >
                          {mentionHandle(p.display_name)}
                        </Button>
                      ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => composer.close()}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={saving || !body.trim()}
                      onClick={() => void submit()}
                    >
                      {saving ? "Enviando…" : "Registrar nota"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </InlineFormShell>
        ) : (
          <InlineFormTrigger
            label="Novo comentário"
            onClick={composer.open}
            icon={<MessageSquarePlus className="h-4 w-4" aria-hidden />}
          />
        )}
      </CardContent>
    </Card>
  );
}
