ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Perfis públicos reduzidos (sem e-mail) para exibir autores
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
  SELECT id, display_name, avatar_url FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- Admin enxerga e edita todos os perfis
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Papéis: admin lê e gerencia todos
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY user_roles_admin_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY user_roles_admin_update ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY user_roles_admin_delete ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

-- Conta protegida + último admin ativo
CREATE OR REPLACE FUNCTION public.protected_admin_email() RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT 'joao.neto@valori.com.vc'::text $$;

CREATE OR REPLACE FUNCTION public.count_active_admins() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin'::public.app_role AND p.is_active
$$;

CREATE OR REPLACE FUNCTION public.guard_user_roles() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_email text; was_admin boolean; still_admin boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_email := (SELECT email FROM public.profiles WHERE id = OLD.user_id);
    was_admin := OLD.role = 'admin'::public.app_role;
    still_admin := false;
  ELSE
    target_email := (SELECT email FROM public.profiles WHERE id = NEW.user_id);
    was_admin := TG_OP = 'UPDATE' AND OLD.role = 'admin'::public.app_role;
    still_admin := NEW.role = 'admin'::public.app_role;
  END IF;

  IF was_admin AND NOT still_admin THEN
    IF target_email = public.protected_admin_email() THEN
      RAISE EXCEPTION 'Esta conta não pode deixar de ser administradora.';
    END IF;
    IF public.count_active_admins() <= 1 THEN
      RAISE EXCEPTION 'É necessário manter ao menos um administrador ativo.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS guard_user_roles_trigger ON public.user_roles;
CREATE TRIGGER guard_user_roles_trigger BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_roles();

CREATE OR REPLACE FUNCTION public.guard_profile_active() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_active AND NOT NEW.is_active THEN
    IF NEW.email = public.protected_admin_email() THEN
      RAISE EXCEPTION 'Esta conta não pode ser desativada.';
    END IF;
    IF public.has_role(NEW.id, 'admin'::public.app_role) AND public.count_active_admins() <= 1 THEN
      RAISE EXCEPTION 'É necessário manter ao menos um administrador ativo.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS guard_profile_active_trigger ON public.profiles;
CREATE TRIGGER guard_profile_active_trigger BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_active();

-- Cadastro: conta protegida sempre admin
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT; assigned public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF NEW.email = public.protected_admin_email() OR user_count = 0 THEN
    assigned := 'admin'::public.app_role;
  ELSE
    assigned := 'collaborator'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

-- Correção retroativa
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'joao.neto@valori.com.vc'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id AND u.email = 'joao.neto@valori.com.vc' AND ur.role = 'collaborator'::public.app_role;