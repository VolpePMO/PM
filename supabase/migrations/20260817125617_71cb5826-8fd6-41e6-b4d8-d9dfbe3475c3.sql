-- backlog_items: leitura aberta, escrita só admin
DROP POLICY IF EXISTS backlog_insert ON public.backlog_items;
DROP POLICY IF EXISTS backlog_update ON public.backlog_items;
DROP POLICY IF EXISTS backlog_delete ON public.backlog_items;
CREATE POLICY backlog_insert ON public.backlog_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY backlog_update ON public.backlog_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY backlog_delete ON public.backlog_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- backlog_subtasks: escrita só admin
DROP POLICY IF EXISTS subtasks_insert ON public.backlog_subtasks;
DROP POLICY IF EXISTS subtasks_update ON public.backlog_subtasks;
DROP POLICY IF EXISTS subtasks_delete ON public.backlog_subtasks;
CREATE POLICY subtasks_insert ON public.backlog_subtasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY subtasks_update ON public.backlog_subtasks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY subtasks_delete ON public.backlog_subtasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- prds: escrita só admin
DROP POLICY IF EXISTS prds_insert ON public.prds;
DROP POLICY IF EXISTS prds_update ON public.prds;
DROP POLICY IF EXISTS prds_delete ON public.prds;
CREATE POLICY prds_insert ON public.prds FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY prds_update ON public.prds FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY prds_delete ON public.prds FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- objectives / key_results: escrita só admin
DROP POLICY IF EXISTS objectives_write ON public.objectives;
CREATE POLICY objectives_write ON public.objectives FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS key_results_write ON public.key_results;
CREATE POLICY key_results_write ON public.key_results FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- notas: qualquer autenticado cria; edita/exclui apenas autor ou admin
DROP POLICY IF EXISTS comments_update ON public.backlog_comments;
DROP POLICY IF EXISTS comments_delete ON public.backlog_comments;
CREATE POLICY comments_update ON public.backlog_comments FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY comments_delete ON public.backlog_comments FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- anexos: qualquer autenticado envia; edita/exclui apenas quem enviou ou admin
DROP POLICY IF EXISTS attachments_update ON public.backlog_attachments;
DROP POLICY IF EXISTS attachments_delete ON public.backlog_attachments;
CREATE POLICY attachments_update ON public.backlog_attachments FOR UPDATE TO authenticated USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY attachments_delete ON public.backlog_attachments FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- ideias: qualquer autenticado cria; edição/exclusão do autor ou admin (status/triagem via admin)
DROP POLICY IF EXISTS feedback_update ON public.feedback_requests;
DROP POLICY IF EXISTS feedback_delete ON public.feedback_requests;
CREATE POLICY feedback_update ON public.feedback_requests FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY feedback_delete ON public.feedback_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));