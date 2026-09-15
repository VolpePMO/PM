ALTER TABLE public.backlog_comments DROP CONSTRAINT backlog_comments_backlog_item_id_fkey,
  ADD CONSTRAINT backlog_comments_backlog_item_id_fkey FOREIGN KEY (backlog_item_id) REFERENCES public.backlog_items(id) ON DELETE CASCADE;

ALTER TABLE public.backlog_subtasks DROP CONSTRAINT backlog_subtasks_backlog_item_id_fkey,
  ADD CONSTRAINT backlog_subtasks_backlog_item_id_fkey FOREIGN KEY (backlog_item_id) REFERENCES public.backlog_items(id) ON DELETE CASCADE;

ALTER TABLE public.backlog_attachments DROP CONSTRAINT backlog_attachments_backlog_item_id_fkey,
  ADD CONSTRAINT backlog_attachments_backlog_item_id_fkey FOREIGN KEY (backlog_item_id) REFERENCES public.backlog_items(id) ON DELETE CASCADE;

ALTER TABLE public.backlog_attachments DROP CONSTRAINT backlog_attachments_comment_id_fkey,
  ADD CONSTRAINT backlog_attachments_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.backlog_comments(id) ON DELETE CASCADE;

ALTER TABLE public.backlog_attachments DROP CONSTRAINT backlog_attachments_subtask_id_fkey,
  ADD CONSTRAINT backlog_attachments_subtask_id_fkey FOREIGN KEY (subtask_id) REFERENCES public.backlog_subtasks(id) ON DELETE CASCADE;

ALTER TABLE public.prds DROP CONSTRAINT prds_backlog_item_id_fkey,
  ADD CONSTRAINT prds_backlog_item_id_fkey FOREIGN KEY (backlog_item_id) REFERENCES public.backlog_items(id) ON DELETE CASCADE;

ALTER TABLE public.prd_versions DROP CONSTRAINT prd_versions_prd_id_fkey,
  ADD CONSTRAINT prd_versions_prd_id_fkey FOREIGN KEY (prd_id) REFERENCES public.prds(id) ON DELETE CASCADE;

ALTER TABLE public.feedback_requests DROP CONSTRAINT feedback_requests_backlog_item_id_fkey,
  ADD CONSTRAINT feedback_requests_backlog_item_id_fkey FOREIGN KEY (backlog_item_id) REFERENCES public.backlog_items(id) ON DELETE SET NULL;

ALTER TABLE public.feedback_votes DROP CONSTRAINT feedback_votes_request_id_fkey,
  ADD CONSTRAINT feedback_votes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.feedback_requests(id) ON DELETE CASCADE;