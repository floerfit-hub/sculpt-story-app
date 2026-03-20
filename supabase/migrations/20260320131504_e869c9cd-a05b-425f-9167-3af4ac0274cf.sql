
-- Add nutrition target columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS daily_calories integer DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS daily_protein integer DEFAULT 150,
  ADD COLUMN IF NOT EXISTS daily_fat integer DEFAULT 65,
  ADD COLUMN IF NOT EXISTS daily_carbs integer DEFAULT 250;

-- Create food_logs table
CREATE TABLE public.food_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  food_name TEXT NOT NULL,
  kcal INTEGER NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  coach_advice TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own food logs" ON public.food_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food logs" ON public.food_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own food logs" ON public.food_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own food logs" ON public.food_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
