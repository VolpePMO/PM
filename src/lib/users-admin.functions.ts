import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MIN_TEMP_PASSWORD_LENGTH, PROTECTED_ADMIN_EMAIL, passwordProblem } from "@/lib/domain";

/**
 * Trocar a senha de outra pessoa exige a service_role key, que só existe no
 * servidor. Por isso estas operações são server functions, e não chamadas
 * diretas do navegador: a chave nunca entra no bundle.
 *
 * A autorização é checada aqui, no servidor, a partir do e-mail do JWT já
 * validado pelo middleware — nunca de algo que o cliente tenha enviado.
 */
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
    // Mesma régua do reset: é uma senha que você define para outra pessoa e
    // envia por algum canal, não uma que ela escolheu.
    const problem = passwordProblem(input.password, { minLength: MIN_TEMP_PASSWORD_LENGTH });
    if (problem) throw new Error(problem);
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

/** Define a senha de uma conta específica (somente o administrador principal). */
export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string; forceChange?: boolean }) => {
    if (!input.userId) throw new Error("Usuário inválido.");
    const problem = passwordProblem(input.password, { minLength: MIN_TEMP_PASSWORD_LENGTH });
    if (problem) throw new Error(problem);
    return {
      userId: input.userId,
      password: input.password,
      forceChange: input.forceChange ?? true,
    };
  })
  .handler(async ({ data, context }) => {
    await assertOwner(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    // A trava do primeiro acesso é lida em `_authenticated/route.tsx`: com ela
    // ligada, qualquer rota protegida redireciona para /trocar-senha.
    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: data.forceChange })
      .eq("id", data.userId);

    return { ok: true };
  });

/**
 * Reset em massa: aplica a mesma senha temporária a todas as contas e obriga
 * cada uma a definir a sua no próximo acesso.
 *
 * Inclui a conta do próprio administrador principal — ele recebe a mesma senha
 * temporária e também passa pela troca obrigatória. A sessão aberta não cai na
 * hora, mas a primeira navegação já bate na trava de troca de senha.
 */
export const resetAllPasswords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { password: string; confirm: string }) => {
    const problem = passwordProblem(input.password, {
      minLength: MIN_TEMP_PASSWORD_LENGTH,
      confirm: input.confirm,
    });
    if (problem) throw new Error(problem);
    return { password: input.password };
  })
  .handler(async ({ data, context }) => {
    await assertOwner(context.claims as Record<string, unknown>);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // listUsers é paginado: sem varrer as páginas, um workspace com mais de
    // 50 contas ficaria pela metade e o relatório mentiria.
    const users: { id: string; email: string | null }[] = [];
    const perPage = 200;
    for (let page = 1; ; page++) {
      const { data: pageData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      const batch = pageData?.users ?? [];
      users.push(...batch.map((u) => ({ id: u.id, email: u.email ?? null })));
      if (batch.length < perPage) break;
    }

    const failed: { email: string; reason: string }[] = [];
    let updated = 0;

    for (const user of users) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: data.password,
      });
      if (error) {
        failed.push({ email: user.email ?? user.id, reason: error.message });
        continue;
      }
      await supabaseAdmin.from("profiles").update({ must_change_password: true }).eq("id", user.id);
      updated++;
    }

    return { total: users.length, updated, failed };
  });
