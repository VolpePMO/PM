ALTER TABLE public.prioritization_items
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS due_date text,
  ADD COLUMN IF NOT EXISTS pace integer;