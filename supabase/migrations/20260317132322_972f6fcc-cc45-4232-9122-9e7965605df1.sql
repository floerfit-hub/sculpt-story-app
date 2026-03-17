
-- Add onboarding fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_goal text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS training_frequency integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS experience_level text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preferred_style text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS priority_focus text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Create fitness_stats table for XP/level/score tracking
CREATE TABLE public.fitness_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  fit_score integer NOT NULL DEFAULT 0,
  fit_score_previous integer NOT NULL DEFAULT 0,
  last_workout_at timestamp with time zone DEFAULT NULL,
  streak_days integer NOT NULL DEFAULT 0,
  last_streak_check date DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.fitness_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own fitness stats" ON public.fitness_stats FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own fitness stats" ON public.fitness_stats FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own fitness stats" ON public.fitness_stats FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Auto-create fitness_stats on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  INSERT INTO public.subscriptions (user_id, plan, status) VALUES (NEW.id, 'free', 'active');
  INSERT INTO public.fitness_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
