import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ALLOWED_UPLOAD_ACCEPT, ALLOWED_UPLOAD_LABEL, uploadRejectionReason } from "@/lib/domain";
import { openAttachment } from "@/components/ItemNotes";
import { AttachmentChips } from "@/components/AttachmentChips";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";

/** Anexos da descrição: leitura mostra só chips; controle de anexar só em modo edição. */
export function PrdAttachments({
  itemId,
  prdId,
  editing = false,
}: {
  itemId: string;
  prdId: string | null;
  editing?: boolean;
}) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const files = useQuery({
    queryKey: ["prd-attachments", prdId],
    enabled: !!prdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_attachments")
        .select("*")
        .eq("prd_id", prdId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upload = async (list: FileList) => {
    if (!userId || !prdId) return;
    const picked = Array.from(list);
    const reasons = picked.map((f) => uploadRejectionReason(f));
    const valid = picked.filter((_, i) => !reasons[i]);
    if (valid.length !== picked.length) toast.error(reasons.find(Boolean) as string);
    if (valid.length === 0) return;
    setUploading(true);
    try {
      for (const file of valid) {
        const path = `${itemId}/prd/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("backlog-attachments")
          .upload(path, file, file.type ? { contentType: file.type } : {});
        if (upErr) throw upErr;
        const { error } = await supabase.from("backlog_attachments").insert({
          backlog_item_id: itemId,
          prd_id: prdId,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: userId,
        });
        if (error) throw error;
      }
      toast.success("Anexo enviado");
      void queryClient.invalidateQueries({ queryKey: ["prd-attachments", prdId] });
      void queryClient.invalidateQueries({ queryKey: ["prd-attachments", prdId, "count"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const remove = useMutation({
    mutationFn: async (att: { id: string; storage_path: string }) => {
      const { error } = await supabase.from("backlog_attachments").delete().eq("id", att.id);
      if (error) throw error;
      await supabase.storage.from("backlog-attachments").remove([att.storage_path]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prd-attachments", prdId] });
      void queryClient.invalidateQueries({ queryKey: ["prd-attachments", prdId, "count"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = files.data ?? [];

  if (!editing) {
    if (list.length === 0) return null;
    return (
      <AttachmentChips
        files={list}
        onOpen={(f) =>
          void openAttachment(
            (list.find((a) => a.id === f.id) as { storage_path: string }).storage_path,
          )
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      <AttachmentChips
        files={list}
        onOpen={(f) =>
          void openAttachment(
            (list.find((a) => a.id === f.id) as { storage_path: string }).storage_path,
          )
        }
        onRemove={(f) => {
          const att = list.find((a) => a.id === f.id);
          if (att) remove.mutate({ id: att.id, storage_path: att.storage_path });
        }}
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={ALLOWED_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => e.target.files && void upload(e.target.files)}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={ALLOWED_UPLOAD_LABEL}
        title={!prdId ? "Salve a descrição para poder anexar arquivos" : ALLOWED_UPLOAD_LABEL}
        className="disabled:cursor-not-allowed disabled:opacity-50"
        disabled={uploading || !prdId}
        onClick={() => fileInput.current?.click()}
      >
        <Paperclip className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
