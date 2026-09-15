import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { AppPage } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/admin/paginas")({
  head: () => ({
    meta: [
      { title: "Páginas — Valori PM" },
      {
        name: "description",
        content: "Escolha quais páginas aparecem no menu principal do Valori PM.",
      },
      { property: "og:title", content: "Páginas — Valori PM" },
      {
        property: "og:description",
        content: "Escolha quais páginas aparecem no menu principal do Valori PM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPagesPage,
});

function AdminPagesPage() {
  const queryClient = useQueryClient();

  const pages = useQuery({
    queryKey: ["app-pages", "all"],
    queryFn: async (): Promise<AppPage[]> => {
      const { data, error } = await supabase
        .from("app_pages")
        .select("id, path, label, is_visible, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase.from("app_pages").update({ is_visible }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-pages"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-brand-dark">Gestão de páginas</h2>
        <p className="text-sm text-muted-foreground">
          Escolha quais páginas aparecem no menu principal para todo mundo.
        </p>
      </div>

      <Card className="divide-y">
        {pages.isLoading && <p className="p-4 text-sm text-muted-foreground">Carregando…</p>}
        {pages.data?.map((page) => (
          <div key={page.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium">{page.label}</p>
              <p className="text-xs text-muted-foreground">{page.path}</p>
            </div>
            <Switch
              checked={page.is_visible}
              onCheckedChange={(checked) => toggle.mutate({ id: page.id, is_visible: checked })}
              aria-label={`Mostrar ${page.label} no menu`}
            />
          </div>
        ))}
        {pages.data?.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma página cadastrada.</p>
        )}
      </Card>
    </div>
  );
}
