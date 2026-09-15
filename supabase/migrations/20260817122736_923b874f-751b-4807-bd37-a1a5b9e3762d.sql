CREATE OR REPLACE FUNCTION public.directory()
RETURNS TABLE(id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, COALESCE(p.display_name, 'Usuário'), p.avatar_url
  FROM public.profiles p
  WHERE p.is_active
  ORDER BY 2;
END;
$$;

REVOKE ALL ON FUNCTION public.directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.directory() TO authenticated;

REVOKE ALL ON FUNCTION public.count_active_admins() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_user_roles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_active() FROM PUBLIC, anon, authenticated;