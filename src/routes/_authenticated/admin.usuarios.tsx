import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createUserAccount, deleteUserAccount } from "@/lib/users-admin.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ROLE_LABELS,
  deactivationBlockedReason,
  isProtectedAccount,
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
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
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
    </div>
  );
}
