import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createUserAccount,
  deleteUserAccount,
  resetAllPasswords,
  setUserPassword,
} from "@/lib/users-admin.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { KeyRound, ShieldAlert, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MIN_TEMP_PASSWORD_LENGTH,
  ROLE_LABELS,
  deactivationBlockedReason,
  isProtectedAccount,
  passwordProblem,
  roleChangeBlockedReason,
  type ManagedUser,
} from "@/lib/domain";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Valori PM" },
      { name: "description", content: "Gestão de usuários, papéis e contas do Valori PM." },
      { property: "og:title", content: "Usuários — Valori PM" },
      { property: "og:description", content: "Gestão de usuários, papéis e contas do Valori PM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsersPage,
});

type Row = ManagedUser & {
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { email: currentEmail } = useAuth();
  const canManageAccounts = isProtectedAccount(currentEmail);
  const createFn = useServerFn(createUserAccount);
  const deleteFn = useServerFn(deleteUserAccount);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<Row[]> => {
      const [{ data: profiles, error }, { data: roles, error: rolesError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, display_name, avatar_url, is_active, created_at")
          .order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      if (rolesError) throw rolesError;
      return (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        is_active: p.is_active,
        created_at: p.created_at,
        role: (roles ?? []).some((r) => r.user_id === p.id && r.role === "admin")
          ? "admin"
          : "collaborator",
      }));
    },
  });

  const rows = users.data ?? [];

  const changeRole = useMutation({
    mutationFn: async ({ user, nextRole }: { user: Row; nextRole: "admin" | "collaborator" }) => {
      const blocked = roleChangeBlockedReason(user, nextRole, rows);
      if (blocked) throw new Error(blocked);
      const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", user.id);
      if (delError) throw delError;
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: nextRole });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel atualizado");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ user, active }: { user: Row; active: boolean }) => {
      if (!active) {
        const blocked = deactivationBlockedReason(user, rows);
        if (blocked) throw new Error(blocked);
      }
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: active })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta atualizada");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const createUser = useMutation({
    mutationFn: async () =>
      createFn({ data: { email: newEmail, password: newPassword, displayName: newName } }),
    onSuccess: () => {
      toast.success("Usuário criado");
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeUser = useMutation({
    mutationFn: async (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuário removido");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-dark">Usuários</h1>
        <p className="text-sm text-muted-foreground">Papéis, contas ativas e fotos de perfil.</p>
      </div>

      {canManageAccounts && (
        <Card className="space-y-4 p-4">
          <div>
            <h2 className="font-medium">Adicionar usuário</h2>
            <p className="text-sm text-muted-foreground">
              A conta é criada já confirmada e com troca de senha obrigatória no primeiro acesso.
            </p>
          </div>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              createUser.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-email">E-mail</Label>
              <Input
                id="new-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="pessoa@valori.com.vc"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Nome</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome de exibição"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Senha</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={MIN_TEMP_PASSWORD_LENGTH}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`mínimo ${MIN_TEMP_PASSWORD_LENGTH} caracteres`}
              />
            </div>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? "Criando…" : "Adicionar"}
            </Button>
          </form>
        </Card>
      )}

      {users.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      <div className="space-y-3">
        {rows.map((user) => {
          const roleBlocked = roleChangeBlockedReason(user, "collaborator", rows);
          const deactivateBlocked = deactivationBlockedReason(user, rows);
          return (
            <Card key={user.id} className="flex flex-wrap items-center gap-4 p-4">
              <UserAvatar
                name={user.display_name ?? user.email}
                path={user.avatar_url}
                className="h-10 w-10"
              />
              <div className="min-w-48 flex-1">
                <p className="font-medium">
                  {user.display_name ?? "—"}
                  {isProtectedAccount(user.email) && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Conta protegida
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Desde {new Date(user.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <Select
                value={user.role}
                onValueChange={(v) =>
                  changeRole.mutate({ user, nextRole: v as "admin" | "collaborator" })
                }
                disabled={!!roleBlocked}
              >
                <SelectTrigger className="h-9 w-44" title={roleBlocked ?? undefined}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2" title={deactivateBlocked ?? undefined}>
                <Switch
                  checked={user.is_active}
                  disabled={user.is_active && !!deactivateBlocked}
                  onCheckedChange={(checked) => toggleActive.mutate({ user, active: checked })}
                />
                <span className="text-sm text-muted-foreground">
                  {user.is_active ? "Ativa" : "Desativada"}
                </span>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    Foto
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Foto de {user.display_name ?? user.email}</DialogTitle>
                  </DialogHeader>
                  <AvatarUpload
                    userId={user.id}
                    name={user.display_name ?? user.email}
                    avatarUrl={user.avatar_url}
                  />
                </DialogContent>
              </Dialog>

              {canManageAccounts && <ChangePasswordDialog user={user} />}

              {canManageAccounts && !isProtectedAccount(user.email) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={removeUser.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remover definitivamente ${user.display_name ?? user.email}? Esta ação não pode ser desfeita.`,
                      )
                    ) {
                      removeUser.mutate(user.id);
                    }
                  }}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Remover
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {canManageAccounts && <ResetAllPasswordsCard total={rows.length} />}
    </div>
  );
}

/**
 * Troca a senha de uma conta específica. Fica atrás de um diálogo de propósito:
 * é uma ação destrutiva e não deve ficar a um clique de distância na listagem.
 */
function ChangePasswordDialog({ user }: { user: Row }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [forceChange, setForceChange] = useState(true);
  const setPasswordFn = useServerFn(setUserPassword);

  const save = useMutation({
    mutationFn: async () => {
      const problem = passwordProblem(password, {
        minLength: MIN_TEMP_PASSWORD_LENGTH,
        confirm,
      });
      if (problem) throw new Error(problem);
      return setPasswordFn({ data: { userId: user.id, password, forceChange } });
    },
    onSuccess: () => {
      toast.success(`Senha de ${user.display_name ?? user.email} atualizada.`);
      setPassword("");
      setConfirm("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <KeyRound className="mr-1 h-4 w-4" />
          Senha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>
            {user.display_name ?? user.email}. A pessoa não é avisada por e-mail — combine a nova
            senha com ela por um canal seguro.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`pwd-${user.id}`}>Nova senha</Label>
            <Input
              id={`pwd-${user.id}`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`mínimo ${MIN_TEMP_PASSWORD_LENGTH} caracteres`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`pwd2-${user.id}`}>Confirmar</Label>
            <Input
              id={`pwd2-${user.id}`}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox
              checked={forceChange}
              onCheckedChange={(v) => setForceChange(v === true)}
              className="mt-0.5"
            />
            <span className="text-muted-foreground">
              Obrigar a definir uma senha própria no próximo acesso
            </span>
          </label>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Alterar senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Reset em massa. Pede a palavra RESETAR digitada à mão porque o botão atinge
 * todas as contas de uma vez, inclusive a de quem está clicando.
 */
function ResetAllPasswordsCard({ total }: { total: number }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [typed, setTyped] = useState("");
  const [report, setReport] = useState<{
    total: number;
    updated: number;
    failed: { email: string; reason: string }[];
  } | null>(null);
  const resetFn = useServerFn(resetAllPasswords);

  const confirmed = typed.trim().toUpperCase() === "RESETAR";

  const run = useMutation({
    mutationFn: async () => {
      const problem = passwordProblem(password, {
        minLength: MIN_TEMP_PASSWORD_LENGTH,
        confirm,
      });
      if (problem) throw new Error(problem);
      return resetFn({ data: { password, confirm } });
    },
    onSuccess: (result) => {
      setReport(result);
      setPassword("");
      setConfirm("");
      setTyped("");
      toast.success(`${result.updated} de ${result.total} senhas redefinidas.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="space-y-4 border-destructive/30 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <h2 className="font-medium text-destructive">Resetar a senha de todas as contas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aplica a mesma senha temporária às {total} contas e obriga cada pessoa a definir a sua
            no próximo acesso. <strong>A sua conta entra no reset.</strong> Guarde a senha antes de
            confirmar: ela não aparece em lugar nenhum depois.
          </p>
        </div>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          run.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="reset-password">Senha temporária</Label>
          <Input
            id="reset-password"
            type="text"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`mínimo ${MIN_TEMP_PASSWORD_LENGTH} caracteres`}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm">Confirmar</Label>
          <Input
            id="reset-confirm"
            type="text"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-typed">Digite RESETAR</Label>
          <Input
            id="reset-typed"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="RESETAR"
          />
        </div>
        <Button type="submit" variant="destructive" disabled={!confirmed || run.isPending}>
          {run.isPending ? "Redefinindo…" : "Resetar todas"}
        </Button>
      </form>

      {report && (
        <div className="rounded-lg border border-border bg-muted p-3 text-sm">
          <p>
            {report.updated} de {report.total} contas redefinidas.
          </p>
          {report.failed.length > 0 && (
            <ul className="mt-2 space-y-1 text-destructive">
              {report.failed.map((f) => (
                <li key={f.email}>
                  {f.email}: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
