-- 1. Add columns to workout_templates
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS days jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2. Add column to workout_template_exercises
ALTER TABLE public.workout_template_exercises
  ADD COLUMN IF NOT EXISTS day_id text;

-- 3. Update RLS policies on workout_templates
DROP POLICY IF EXISTS "Users can view own templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.workout_templates;

CREATE POLICY "Users can view own or global templates"
  ON public.workout_templates FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_global = true);

CREATE POLICY "Users can insert own templates"
  ON public.workout_templates FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (is_global = false OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Users can update own or admin global templates"
  ON public.workout_templates FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR (is_global = true AND has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Users can delete own or admin global templates"
  ON public.workout_templates FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR (is_global = true AND has_role(auth.uid(), 'admin'::app_role))
  );

-- 4. Update RLS on workout_template_exercises so global template exercises are visible
DROP POLICY IF EXISTS "Users can view own template exercises" ON public.workout_template_exercises;

CREATE POLICY "Users can view own or global template exercises"
  ON public.workout_template_exercises FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = workout_template_exercises.template_id
        AND (t.user_id = auth.uid() OR t.is_global = true)
    )
  );

-- 5. New table user_assigned_programs
CREATE TABLE IF NOT EXISTS public.user_assigned_programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  dismissed boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, template_id)
);

ALTER TABLE public.user_assigned_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own assigned programs"
  ON public.user_assigned_programs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own assigned programs"
  ON public.user_assigned_programs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own assigned programs"
  ON public.user_assigned_programs FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own assigned programs"
  ON public.user_assigned_programs FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_assigned_programs_user ON public.user_assigned_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_templates_global ON public.workout_templates(is_global) WHERE is_global = true;