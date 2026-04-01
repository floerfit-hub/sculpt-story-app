
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS normalized_name text,
  ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_deprecated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS equipment text,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS exercise_type text,
  ADD COLUMN IF NOT EXISTS sub_group text,
  ADD COLUMN IF NOT EXISTS animation_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

UPDATE public.exercises
SET normalized_name = lower(regexp_replace(name, '[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9 ]', '', 'g'))
WHERE normalized_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_exercises_normalized_name ON public.exercises (normalized_name);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON public.exercises (muscle_group);
