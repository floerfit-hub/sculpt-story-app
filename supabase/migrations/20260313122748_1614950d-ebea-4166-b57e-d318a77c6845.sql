-- Ensure upsert target exists for muscle recovery writes
CREATE UNIQUE INDEX IF NOT EXISTS muscle_recovery_user_muscle_unique_idx
ON public.muscle_recovery (user_id, muscle_group);

-- Recompute performance + fatigue when workout is completed
CREATE OR REPLACE FUNCTION public.compute_exercise_performance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.finished_at IS NOT NULL THEN
    -- 1) Rebuild exercise performance snapshot for this workout
    DELETE FROM public.exercise_performance
    WHERE workout_id = NEW.id;

    INSERT INTO public.exercise_performance (
      user_id,
      workout_id,
      exercise_id,
      total_sets,
      total_reps,
      total_volume,
      max_weight,
      avg_weight,
      estimated_1rm
    )
    SELECT
      NEW.user_id,
      NEW.id,
      ws.exercise_id,
      COUNT(*)::integer,
      COALESCE(SUM(ws.reps), 0)::integer,
      COALESCE(SUM(ws.weight * ws.reps), 0)::numeric,
      COALESCE(MAX(ws.weight), 0)::numeric,
      COALESCE(ROUND(AVG(ws.weight)::numeric, 2), 0),
      COALESCE(ROUND(MAX(ws.weight * (1 + ws.reps::numeric / 30))::numeric, 2), 0)
    FROM public.workout_sets ws
    WHERE ws.workout_id = NEW.id
    GROUP BY ws.exercise_id;

    -- 2) Rebuild muscle fatigue state (instant drop to fatigued on workout completion)
    INSERT INTO public.muscle_recovery (
      user_id,
      muscle_group,
      fatigue_score,
      recovery_percent,
      last_trained_at,
      updated_at
    )
    SELECT
      NEW.user_id,
      e.muscle_group,
      LEAST(
        100,
        GREATEST(
          20,
          (
            COUNT(ws.id)::numeric *
            COALESCE(
              AVG(
                (
                  CASE
                    WHEN ep.estimated_1rm > 0 THEN LEAST(1.2, ws.weight / ep.estimated_1rm)
                    ELSE 0.7
                  END
                ) *
                (
                  CASE
                    WHEN ws.rest_time IS NULL OR ws.rest_time > 480 THEN 1.0
                    WHEN ws.rest_time < 90 THEN 1.2
                    WHEN ws.rest_time <= 150 THEN 1.0
                    WHEN ws.rest_time <= 240 THEN 0.9
                    ELSE 0.8
                  END
                )
              ),
              0.7
            ) * 12
          )
        )
      )::numeric,
      0,
      COALESCE(MAX(ws.created_at), NEW.finished_at, NOW()),
      NOW()
    FROM public.workout_sets ws
    JOIN public.exercises e
      ON e.id = ws.exercise_id
    LEFT JOIN public.exercise_performance ep
      ON ep.workout_id = NEW.id
     AND ep.exercise_id = ws.exercise_id
    WHERE ws.workout_id = NEW.id
    GROUP BY e.muscle_group
    ON CONFLICT (user_id, muscle_group)
    DO UPDATE SET
      fatigue_score = LEAST(100, EXCLUDED.fatigue_score),
      recovery_percent = 0,
      last_trained_at = EXCLUDED.last_trained_at,
      updated_at = NOW();
  END IF;

  RETURN NULL;
END;
$$;

-- Attach trigger so updates happen immediately when a workout is completed
DROP TRIGGER IF EXISTS trg_compute_exercise_performance_on_workouts ON public.workouts;

CREATE TRIGGER trg_compute_exercise_performance_on_workouts
AFTER INSERT OR UPDATE OF finished_at ON public.workouts
FOR EACH ROW
WHEN (NEW.finished_at IS NOT NULL)
EXECUTE FUNCTION public.compute_exercise_performance();