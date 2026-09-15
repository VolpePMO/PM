-- 1) Remover perfil duplicado órfão (sem conta de acesso correspondente)
ALTER TABLE public.user_roles DISABLE TRIGGER guard_user_roles_trigger;

DELETE FROM public.user_roles ur
WHERE ur.user_id IN (
  SELECT p.id FROM public.profiles p
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
);

DELETE FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

ALTER TABLE public.user_roles ENABLE TRIGGER guard_user_roles_trigger;

-- 2) Normalizar e-mails existentes
UPDATE public.profiles SET email = lower(trim(email)) WHERE email IS DISTINCT FROM lower(trim(email));

-- 3) Garantir unicidade de e-mail por perfil
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_lower ON public.profiles (lower(email)) WHERE email IS NOT NULL;

-- 4) Normalizar e-mail em toda escrita
CREATE OR REPLACE FUNCTION public.normalize_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.normalize_profile_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_normalize_email ON public.profiles;
CREATE TRIGGER profiles_normalize_email
BEFORE INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_email();

-- 5) Criação de usuário: reaproveitar perfil existente com o mesmo e-mail
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE user_count INT; assigned public.app_role; existing uuid;
BEGIN
  SELECT id INTO existing FROM public.profiles WHERE lower(email) = lower(NEW.email) AND id <> NEW.id LIMIT 1;
  IF existing IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = existing) THEN
    DELETE FROM public.user_roles WHERE user_id = existing;
    DELETE FROM public.profiles WHERE id = existing;
  ELSIF existing IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe um perfil com este e-mail.';
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF lower(NEW.email) = public.protected_admin_email() OR user_count = 0 THEN
    assigned := 'admin'::public.app_role;
  ELSE
    assigned := 'collaborator'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;