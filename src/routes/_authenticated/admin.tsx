import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin");
    if (!data || data.length === 0) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Painel administrativo — Valori PM" },
      { name: "description", content: "Administração de usuários e páginas do Valori PM." },
      { property: "og:title", content: "Painel administrativo — Valori PM" },
      { property: "og:description", content: "Administração de usuários e páginas do Valori PM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

const SUB_NAV = [
  { to: "/admin/usuarios", label: "Usuários" },
  { to: "/admin/paginas", label: "Páginas" },
] as const;

function AdminLayout() {
  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <aside>
        <h1 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Painel administrativo
        </h1>
        <nav className="flex gap-1 md:flex-col">
          {SUB_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              activeProps={{ className: "bg-muted font-medium text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section>
        <Outlet />
      </section>
    </div>
  );
}
