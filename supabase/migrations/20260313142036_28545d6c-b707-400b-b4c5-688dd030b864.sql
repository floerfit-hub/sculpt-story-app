
-- Add leaderboard opt-in flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leaderboard_visible boolean NOT NULL DEFAULT false;

-- Create a security definer function to get leaderboard for a specific exercise
CREATE OR REPLACE FUNCTION public.get_exercise_leaderboard(_exercise_name text)
RETURNS TABLE (
  user_name text,
  max_weight numeric,
  achieved_at timestamptz,
  is_current_user boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(p.full_name, 'Анонім') AS user_name,
    MAX(ws.weight) AS max_weight,
    MAX(w.started_at) AS achieved_at,
    (w.user_id = auth.uid()) AS is_current_user
  FROM workout_sets ws
  JOIN workouts w ON w.id = ws.workout_id
  JOIN exercises e ON e.id = ws.exercise_id
  JOIN profiles p ON p.user_id = w.user_id
  WHERE e.name = _exercise_name
    AND p.leaderboard_visible = true
  GROUP BY w.user_id, p.full_name
  ORDER BY max_weight DESC
  LIMIT 20;
$$;
