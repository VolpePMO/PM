DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "backlog_attachments_update" ON storage.objects;
CREATE POLICY "backlog_attachments_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'backlog-attachments' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role)))
  WITH CHECK (bucket_id = 'backlog-attachments' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role)));