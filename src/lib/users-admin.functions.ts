import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/domain";

async function assertOwner(claims: Record<string, unknown>) {
  const email = typeof claims["email"] === "string" ? (claims["email"] as string) : "";
  if (email.toLowerCase() !== PROTECTED_ADMIN_EMAIL) {
    throw new Error("Apenas o administrador principal pode gerenciar usuários.");
  }
}

/** Cria uma conta com e-mail e senha (somente o administrador principal). */
export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; displayName?: string }) => {
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
    if (!input.password || input.password.length < 6) {
      throw new Error("A senha deve ter ao menos 6 caracteres.");
    }
    return { email, password: input.password, displayName: input.displayName?.trim() || undefined };
  })
  .handler(async ({ data, context }) => {
    await assertOwner(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: data.displayName ? { display_name: data.displayName } : {},
    });
    if (error || !created.user)
      throw new Error(error?.message ?? "Não foi possível criar a conta.");

    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", created.user.id);

    return { id: created.user.id };
  });

/** Remove definitivamente uma conta (somente o administrador principal). */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input.userId) throw new Error("Usuário inválido.");
    return { userId: input.userId };
  })
  .handler(async ({ data, context }) => {
    await assertOwner(context.claims as Record<string, unknown>);
    if (data.userId === context.userId) throw new Error("Você não pode remover a própria conta.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    if ((profile?.email ?? "").toLowerCase() === PROTECTED_ADMIN_EMAIL) {
      throw new Error("Esta conta não pode ser removida.");
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    return { ok: true };
  });
