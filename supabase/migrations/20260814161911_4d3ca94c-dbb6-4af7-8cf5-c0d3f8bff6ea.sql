
-- Default owners
ALTER TABLE public.backlog_items ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.backlog_subtasks ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.backlog_comments ALTER COLUMN author_id SET DEFAULT auth.uid();
ALTER TABLE public.backlog_attachments ALTER COLUMN uploaded_by SET DEFAULT auth.uid();
ALTER TABLE public.feedback_requests ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.prds ALTER COLUMN updated_by SET DEFAULT auth.uid();

-- backlog_items
DROP POLICY IF EXISTS backlog_all ON public.backlog_items;
CREATE POLICY backlog_select ON public.backlog_items FOR SELECT TO authenticated USING (true);
CREATE POLICY backlog_insert ON public.backlog_items FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY backlog_update ON public.backlog_items FOR UPDATE TO authenticated USING (created_by IS NULL OR created_by = auth.uid()) WITH CHECK (created_by IS NULL OR created_by = auth.uid());
CREATE POLICY backlog_delete ON public.backlog_items FOR DELETE TO authenticated USING (created_by IS NULL OR created_by = auth.uid());

-- backlog_subtasks
DROP POLICY IF EXISTS subtasks_all ON public.backlog_subtasks;
CREATE POLICY subtasks_select ON public.backlog_subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY subtasks_insert ON public.backlog_subtasks FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY subtasks_update ON public.backlog_subtasks FOR UPDATE TO authenticated USING (created_by IS NULL OR created_by = auth.uid()) WITH CHECK (created_by IS NULL OR created_by = auth.uid());
CREATE POLICY subtasks_delete ON public.backlog_subtasks FOR DELETE TO authenticated USING (created_by IS NULL OR created_by = auth.uid());

-- backlog_comments
DROP POLICY IF EXISTS comments_all ON public.backlog_comments;
CREATE POLICY comments_select ON public.backlog_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY comments_insert ON public.backlog_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY comments_update ON public.backlog_comments FOR UPDATE TO authenticated USING (author_id IS NULL OR author_id = auth.uid()) WITH CHECK (author_id IS NULL OR author_id = auth.uid());
CREATE POLICY comments_delete ON public.backlog_comments FOR DELETE TO authenticated USING (author_id IS NULL OR author_id = auth.uid());

-- backlog_attachments
DROP POLICY IF EXISTS attachments_all ON public.backlog_attachments;
CREATE POLICY attachments_select ON public.backlog_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY attachments_insert ON public.backlog_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY attachments_update ON public.backlog_attachments FOR UPDATE TO authenticated USING (uploaded_by IS NULL OR uploaded_by = auth.uid()) WITH CHECK (uploaded_by IS NULL OR uploaded_by = auth.uid());
CREATE POLICY attachments_delete ON public.backlog_attachments FOR DELETE TO authenticated USING (uploaded_by IS NULL OR uploaded_by = auth.uid());

-- prds
DROP POLICY IF EXISTS prds_all ON public.prds;
CREATE POLICY prds_select ON public.prds FOR SELECT TO authenticated USING (true);
CREATE POLICY prds_insert ON public.prds FOR INSERT TO authenticated WITH CHECK (updated_by = auth.uid());
CREATE POLICY prds_update ON public.prds FOR UPDATE TO authenticated USING (updated_by IS NULL OR updated_by = auth.uid()) WITH CHECK (updated_by = auth.uid());
CREATE POLICY prds_delete ON public.prds FOR DELETE TO authenticated USING (updated_by IS NULL OR updated_by = auth.uid());

-- feedback_requests
DROP POLICY IF EXISTS feedback_all ON public.feedback_requests;
CREATE POLICY feedback_select ON public.feedback_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY feedback_insert ON public.feedback_requests FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY feedback_update ON public.feedback_requests FOR UPDATE TO authenticated USING (created_by IS NULL OR created_by = auth.uid()) WITH CHECK (created_by IS NULL OR created_by = auth.uid());
CREATE POLICY feedback_delete ON public.feedback_requests FOR DELETE TO authenticated USING (created_by IS NULL OR created_by = auth.uid());

-- storage
DROP POLICY IF EXISTS "backlog attachments all" ON storage.objects;
CREATE POLICY "backlog attachments select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'backlog-attachments');
CREATE POLICY "backlog attachments delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'backlog-attachments' AND owner = auth.uid());
