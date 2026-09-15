import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "collaborator" | null;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setDisplayName("");
      setEmail("");
      setAvatarUrl(null);
      setRole(null);
      setIsActive(true);
      return;
    }
    let active = true;
    void (async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, email, avatar_url, is_active")
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (!active) return;
      setDisplayName(profile?.display_name ?? profile?.email ?? "");
      setEmail(profile?.email ?? "");
      setAvatarUrl(profile?.avatar_url ?? null);
      setIsActive(profile?.is_active ?? true);
      const list = (roles ?? []).map((r) => r.role);
      setRole(list.includes("admin") ? "admin" : list.length ? "collaborator" : null);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  return {
    session,
    user: (session?.user ?? null) as User | null,
    userId,
    displayName,
    email,
    avatarUrl,
    isActive,
    role,
    isAdmin: role === "admin",
    loading,
  };
}
