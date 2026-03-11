ALTER TABLE public.progress_entries 
  ADD COLUMN IF NOT EXISTS arm_circumference numeric,
  ADD COLUMN IF NOT EXISTS glute_circumference numeric,
  ADD COLUMN IF NOT EXISTS thigh_circumference numeric;