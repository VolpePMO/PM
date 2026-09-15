import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";

const ACCEPT = ".png,.jpg,.jpeg,.webp";

export function AvatarUpload({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    await queryClient.invalidateQueries({ queryKey: ["avatar-url"] });
  }

  async function upload(file: File) {
    if (!/\.(png|jpe?g|webp)$/i.test(file.name)) {
      toast.error("Envie uma imagem .png, .jpg ou .webp");
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop()!.toLowerCase();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", userId);
    if (dbError) toast.error(dbError.message);
    else {
      if (avatarUrl) await supabase.storage.from("avatars").remove([avatarUrl]);
      toast.success("Foto atualizada");
      await refresh();
    }
    setBusy(false);
  }

  async function removePhoto() {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    if (error) toast.error(error.message);
    else {
      if (avatarUrl) await supabase.storage.from("avatars").remove([avatarUrl]);
      toast.success("Foto removida");
      await refresh();
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar name={name} path={avatarUrl} className="h-16 w-16" />
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {avatarUrl ? "Trocar foto" : "Enviar foto"}
        </Button>
        {avatarUrl && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void removePhoto()}>
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}
