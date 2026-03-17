
-- Ensure existing users have fitness_stats rows
INSERT INTO public.fitness_stats (user_id)
SELECT p.user_id FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.fitness_stats fs WHERE fs.user_id = p.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Set existing users as onboarding_completed = false so they see the questionnaire
-- (they can skip it)
