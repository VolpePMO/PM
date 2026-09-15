import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  ChevronRight,
  Columns3,
  Home,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  LogOut,
  Map as MapIcon,
  Settings,
  Target,
  Workflow,
} from "lucide-react";
import type { ComponentType } from "react";
import { groupNavPages, visibleNavPages, type AppPage } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GlobalSearch } from "@/components/GlobalSearch";
import { UserAvatar } from "@/components/UserAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ValoriLogo } from "@/components/ValoriLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active, must_change_password")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    if (profile?.must_change_password && location.pathname !== "/trocar-senha") {
      throw redirect({ to: "/trocar-senha" });
    }
    return { user: data.user };
  },

  component: AppShell,
});

const KNOWN_PATHS = [
  "/dashboard",
  "/backlog",
  "/roadmap",
  "/ideias",
  "/priorizacao",
  "/esteira",
  "/kanban",
  "/visao-indicadores",
  "/enriquecimento",
] as const;

/** Ícone de cada página do menu. Caminho sem entrada aqui usa o genérico. */
const NAV_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "/dashboard": Home,
  "/backlog": ListChecks,
  "/roadmap": MapIcon,
  "/ideias": Lightbulb,
  "/priorizacao": Target,
  "/esteira": Workflow,
  "/kanban": Columns3,
  "/visao-indicadores": BarChart3,
  "/enriquecimento": Building2,
};

const ACTIVE_ITEM =
  "bg-sidebar-accent font-medium text-primary shadow-[inset_2px_0_0_0_var(--primary)]";

function useNavPages() {
  return useQuery({
    queryKey: ["app-pages", "nav"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_pages")
        .select("id, path, label, is_visible, sort_order")
        .order("sort_order");
      if (error) throw error;
      return visibleNavPages((data ?? []) as AppPage[], KNOWN_PATHS);
    },
  });
}

function AppShell() {
  const { displayName, avatarUrl, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const navPages = useNavPages();
  // O Kanban é a única página que usa a largura inteira; as demais ficam na
  // coluna central de 1120px, como no Portal.
  const isWide = useRouterState({
    select: (state) => state.location.pathname === "/kanban",
  });

  const groups = groupNavPages(navPages.data ?? []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <GlobalSearch />

      <Sidebar collapsible="icon">
        <SidebarHeader className="h-16 justify-center px-4">
          <Link to="/dashboard" aria-label="Valori PM — início">
            <ValoriLogo />
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2">
          {groups.map(({ group, pages }) => (
            <SidebarGroup key={group}>
              <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider">
                {group}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {pages.map((item) => {
                    const Icon = NAV_ICONS[item.path] ?? LayoutGrid;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton asChild tooltip={item.label} className="h-10">
                          <Link to={item.path} activeProps={{ className: ACTIVE_ITEM }}>
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}

          {isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider">
                Administração
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Painel administrativo" className="h-10">
                      <Link to="/admin" activeProps={{ className: ACTIVE_ITEM }}>
                        <Settings className="size-4" />
                        <span>Painel administrativo</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="px-2 pb-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Sair">
                <button type="button" onClick={signOut}>
                  <LogOut className="size-4" />
                  <span>Sair</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
          <SidebarTrigger className="text-muted-foreground" />
          <div className="flex-1" />
          <ThemeToggle />
          <Link
            to="/perfil"
            className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 text-sm transition-colors hover:bg-muted"
          >
            <UserAvatar name={displayName} path={avatarUrl} />
            <span className="hidden max-w-[180px] truncate sm:inline">{displayName}</span>
            <ChevronRight className="hidden size-3.5 text-muted-foreground sm:inline" />
          </Link>
        </header>

        <main
          className={isWide ? "w-full flex-1" : "mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6"}
        >
          <Outlet />
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <span>© {new Date().getFullYear()} Valori PM</span>
          <span>Gestão de produto · Valori Tech</span>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
