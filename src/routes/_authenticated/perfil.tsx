import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/domain";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Valori PM" },
      { name: "description", content: "Atualize seu nome e sua foto de perfil no Valori PM." },
      { property: "og:title", content: "Meu perfil — Valori PM" },
      {
        property: "og:description",
        content: "Atualize seu nome e sua foto de perfil no Valori PM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId, displayName, email, avatarUrl, role } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setName(displayName), [displayName]);

  async function save() {
    if (!userId || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() })
      .eq("id", userId);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil atualizado");
      void queryClient.invalidateQueries();
    }
  }

  if (!userId) return null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-dark">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">Complete seu cadastro com nome e foto.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto</CardTitle>
          <CardDescription>PNG, JPG ou WEBP.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload userId={userId} name={displayName} avatarUrl={avatarUrl} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome completo</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={email} disabled />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Papel:</span>
            <Badge variant="secondary">{role ? ROLE_LABELS[role] : "—"}</Badge>
          </div>
          <Button onClick={() => void save()} disabled={saving || !name.trim()}>
            Salvar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
