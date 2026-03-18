ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS haptic_feedback boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS timer_vibration boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS pr_celebration_vibration boolean NOT NULL DEFAULT true;