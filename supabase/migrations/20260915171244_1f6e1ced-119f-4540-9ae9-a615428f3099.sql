CREATE TABLE public.app_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  label text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_pages TO authenticated;
GRANT ALL ON public.app_pages TO service_role;

ALTER TABLE public.app_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_pages_select ON public.app_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY app_pages_write ON public.app_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT INSERT, UPDATE, DELETE ON public.app_pages TO authenticated;

CREATE TRIGGER app_pages_updated_at BEFORE UPDATE ON public.app_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_pages (path, label, sort_order) VALUES
  ('/dashboard', 'Início', 1),
  ('/backlog', 'Backlog', 2),
  ('/roadmap', 'Roadmap', 3),
  ('/ideias', 'Ideias', 4),
  ('/priorizacao', 'Priorização', 5),
  ('/esteira', 'Esteira', 6),
  ('/kanban', 'Kanban', 7);