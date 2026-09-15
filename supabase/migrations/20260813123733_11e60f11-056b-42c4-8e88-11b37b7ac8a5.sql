-- backlog_items
DROP POLICY IF EXISTS backlog_admin_write ON public.backlog_items;
DROP POLICY IF EXISTS backlog_select ON public.backlog_items;
CREATE POLICY backlog_all ON public.backlog_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- backlog_subtasks
DROP POLICY IF EXISTS subtasks_admin_write ON public.backlog_subtasks;
DROP POLICY IF EXISTS subtasks_select ON public.backlog_subtasks;
CREATE POLICY subtasks_all ON public.backlog_subtasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- backlog_comments (notas)
DROP POLICY IF EXISTS comments_delete_own ON public.backlog_comments;
DROP POLICY IF EXISTS comments_insert ON public.backlog_comments;
DROP POLICY IF EXISTS comments_select ON public.backlog_comments;
DROP POLICY IF EXISTS comments_update_own ON public.backlog_comments;
CREATE POLICY comments_all ON public.backlog_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- backlog_attachments
DROP POLICY IF EXISTS attachments_delete ON public.backlog_attachments;
DROP POLICY IF EXISTS attachments_insert ON public.backlog_attachments;
DROP POLICY IF EXISTS attachments_select ON public.backlog_attachments;
CREATE POLICY attachments_all ON public.backlog_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- prds
DROP POLICY IF EXISTS prds_admin_write ON public.prds;
DROP POLICY IF EXISTS prds_select ON public.prds;
CREATE POLICY prds_all ON public.prds FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- feedback_requests (ideias)
DROP POLICY IF EXISTS feedback_admin_delete ON public.feedback_requests;
DROP POLICY IF EXISTS feedback_admin_update ON public.feedback_requests;
DROP POLICY IF EXISTS feedback_insert ON public.feedback_requests;
DROP POLICY IF EXISTS feedback_select ON public.feedback_requests;
CREATE POLICY feedback_all ON public.feedback_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- objectives / key_results (sem uso na UI, mantidos)
DROP POLICY IF EXISTS objectives_admin_write ON public.objectives;
DROP POLICY IF EXISTS key_results_admin_write ON public.key_results;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backlog_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backlog_subtasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backlog_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backlog_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_requests TO authenticated;

-- Storage: qualquer usuário autenticado gerencia os anexos
DROP POLICY IF EXISTS "backlog attachments read" ON storage.objects;
DROP POLICY IF EXISTS "backlog attachments insert" ON storage.objects;
DROP POLICY IF EXISTS "backlog attachments update" ON storage.objects;
DROP POLICY IF EXISTS "backlog attachments delete" ON storage.objects;
CREATE POLICY "backlog attachments all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'backlog-attachments') WITH CHECK (bucket_id = 'backlog-attachments');