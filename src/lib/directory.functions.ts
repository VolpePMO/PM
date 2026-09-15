import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DirectoryEntry } from "@/lib/domain";

/** Lista de pessoas ativas (id, nome e foto) — sem e-mail — para menções e responsáveis. */
export const getDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<DirectoryEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("is_active", true)
      .order("display_name");
    if (error) throw error;
    return (data ?? []).map((p) => ({
      id: p.id,
      display_name: p.display_name ?? "Usuário",
      avatar_url: p.avatar_url,
    }));
  });
