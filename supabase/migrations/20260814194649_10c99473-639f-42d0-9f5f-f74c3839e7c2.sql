DROP VIEW IF EXISTS public.public_profiles;

REVOKE ALL ON FUNCTION public.count_active_admins() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_user_roles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_active() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protected_admin_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;