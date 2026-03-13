
-- Create muscle_recovery table
CREATE TABLE public.muscle_recovery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  muscle_group TEXT NOT NULL,
  fatigue_score NUMERIC NOT NULL DEFAULT 0,
  recovery_percent NUMERIC NOT NULL DEFAULT 100,
  last_trained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, muscle_group)
);

-- Add prep_buffer_seconds to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS prep_buffer_seconds INTEGER DEFAULT 10;

-- Enable RLS
ALTER TABLE public.muscle_recovery ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own recovery" ON public.muscle_recovery FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own recovery" ON public.muscle_recovery FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own recovery" ON public.muscle_recovery FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own recovery" ON public.muscle_recovery FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_muscle_recovery_user_id ON public.muscle_recovery (user_id);
CREATE INDEX idx_muscle_recovery_muscle_group ON public.muscle_recovery (muscle_group);

-- Trigger for updated_at
CREATE TRIGGER update_muscle_recovery_updated_at
  BEFORE UPDATE ON public.muscle_recovery
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update compute_exercise_performance to also update muscle_recovery
CREATE OR REPLACE FUNCTION public.compute_exercise_performance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.finished_at IS NOT NULL THEN
    -- Compute exercise performance as before
    DELETE FROM exercise_performance WHERE workout_id = NEW.id;
    INSERT INTO exercise_performance (user_id, workout_id, exercise_id, total_sets, total_reps, total_volume, max_weight, avg_weight, estimated_1rm)
    SELECT
      NEW.user_id, NEW.id, ws.exercise_id,
      COUNT(*)::integer,
      COALESCE(SUM(ws.reps), 0)::integer,
      COALESCE(SUM(ws.weight * ws.reps), 0)::numeric,
      COALESCE(MAX(ws.weight), 0)::numeric,
      COALESCE(ROUND(AVG(ws.weight)::numeric, 2), 0),
      COALESCE(ROUND(MAX(ws.weight * (1 + ws.reps::numeric / 30))::numeric, 2), 0)
    FROM workout_sets ws
    WHERE ws.workout_id = NEW.id
    GROUP BY ws.exercise_id;

    -- Compute muscle recovery / fatigue
    -- For each muscle group in this workout, calculate fatigue_score
    INSERT INTO muscle_recovery (user_id, muscle_group, fatigue_score, recovery_percent, last_trained_at)
    SELECT
      NEW.user_id,
      e.muscle_group,
      LEAST(100, (
        COUNT(ws.id)::numeric * 
        CASE 
          WHEN MAX(ep.estimated_1rm) > 0 THEN LEAST(1.0, MAX(ws.weight) / NULLIF(MAX(ep.estimated_1rm), 0))
          ELSE 0.7
        END
      )),
      0, -- recovery starts at 0% (100% fatigued)
      NOW()
    FROM workout_sets ws
    JOIN exercises e ON e.id = ws.exercise_id
    LEFT JOIN exercise_performance ep ON ep.exercise_id = ws.exercise_id AND ep.workout_id = NEW.id
    WHERE ws.workout_id = NEW.id
    GROUP BY e.muscle_group
    ON CONFLICT (user_id, muscle_group)
    DO UPDATE SET
      fatigue_score = LEAST(100, EXCLUDED.fatigue_score),
      recovery_percent = 0,
      last_trained_at = NOW(),
      updated_at = NOW();
  END IF;
  RETURN NULL;
END;
$function$;

-- Recreate the trigger (drop if exists, then create)
DROP TRIGGER IF EXISTS trg_compute_performance ON public.workouts;
CREATE TRIGGER trg_compute_performance
  AFTER UPDATE ON public.workouts
  FOR EACH ROW
  EXECUTE FUNCTION compute_exercise_performance();
