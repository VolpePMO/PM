CREATE TABLE public.backlog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_item_id uuid NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_id uuid,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backlog_comments TO authenticated;
GRANT ALL ON public.backlog_comments TO service_role;

ALTER TABLE public.backlog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_select ON public.backlog_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY comments_insert ON public.backlog_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY comments_update_own ON public.backlog_comments FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY comments_delete_own ON public.backlog_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER backlog_comments_updated_at BEFORE UPDATE ON public.backlog_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX backlog_comments_item_idx ON public.backlog_comments(backlog_item_id, created_at);

ALTER TABLE public.backlog_attachments
  ADD COLUMN comment_id uuid REFERENCES public.backlog_comments(id) ON DELETE CASCADE;

CREATE INDEX backlog_attachments_comment_idx ON public.backlog_attachments(comment_id);