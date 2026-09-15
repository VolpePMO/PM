ALTER TABLE public.prioritization_items
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS source_area text,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'priorizado';