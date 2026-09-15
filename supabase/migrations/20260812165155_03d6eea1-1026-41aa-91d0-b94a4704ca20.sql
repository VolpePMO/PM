CREATE TABLE public.backlog_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_item_id uuid NOT NULL REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.item_status NOT NULL DEFAULT 'ideia',
  position integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backlog_subtasks TO authenticated;
GRANT ALL ON public.backlog_subtasks TO service_role;

ALTER TABLE public.backlog_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY subtasks_select ON public.backlog_subtasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY subtasks_admin_write ON public.backlog_subtasks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER backlog_subtasks_updated_at
  BEFORE UPDATE ON public.backlog_subtasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX backlog_subtasks_item_idx ON public.backlog_subtasks(backlog_item_id, position);

ALTER TABLE public.backlog_attachments
  ADD COLUMN subtask_id uuid REFERENCES public.backlog_subtasks(id) ON DELETE CASCADE;