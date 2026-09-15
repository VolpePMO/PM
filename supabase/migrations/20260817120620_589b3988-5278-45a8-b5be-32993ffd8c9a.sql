ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'produto';
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'teste';
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'debito_tecnico';
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'compliance';
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'seguranca';
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'discovery';
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'infra';
ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'operacional';

ALTER TABLE public.backlog_items DROP COLUMN IF EXISTS theme;
ALTER TABLE public.backlog_items ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.feedback_requests ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.backlog_comments ADD COLUMN IF NOT EXISTS mentions uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.backlog_comments ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'note';

ALTER TABLE public.backlog_attachments ADD COLUMN IF NOT EXISTS prd_id uuid REFERENCES public.prds(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_views TO authenticated;
GRANT ALL ON public.saved_views TO service_role;

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_views_select_own" ON public.saved_views FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "saved_views_insert_own" ON public.saved_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_views_update_own" ON public.saved_views FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_views_delete_own" ON public.saved_views FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER saved_views_updated_at BEFORE UPDATE ON public.saved_views
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.directory()
RETURNS TABLE (id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, COALESCE(p.display_name, 'Usuário'), p.avatar_url
  FROM public.profiles p
  WHERE p.is_active
  ORDER BY 2
$$;

REVOKE ALL ON FUNCTION public.directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.directory() TO authenticated;