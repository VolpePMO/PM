INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role FROM public.profiles p
WHERE p.email = 'joao.neto@valori.com.vc'
ON CONFLICT (user_id, role) DO NOTHING;

CREATE TABLE public.backlog_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_item_id uuid NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid,
  uploader_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backlog_attachments TO authenticated;
GRANT ALL ON public.backlog_attachments TO service_role;

ALTER TABLE public.backlog_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY attachments_select ON public.backlog_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY attachments_insert ON public.backlog_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY attachments_delete ON public.backlog_attachments FOR DELETE TO authenticated USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER backlog_attachments_updated_at BEFORE UPDATE ON public.backlog_attachments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "backlog attachments read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'backlog-attachments');
CREATE POLICY "backlog attachments upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'backlog-attachments' AND auth.uid() = owner);
CREATE POLICY "backlog attachments delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'backlog-attachments' AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'::public.app_role)));