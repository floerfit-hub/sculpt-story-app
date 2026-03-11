
CREATE TABLE public.custom_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  exercise_name text NOT NULL,
  muscle_group text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom exercises" ON public.custom_exercises FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom exercises" ON public.custom_exercises FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom exercises" ON public.custom_exercises FOR DELETE TO authenticated USING (auth.uid() = user_id);
