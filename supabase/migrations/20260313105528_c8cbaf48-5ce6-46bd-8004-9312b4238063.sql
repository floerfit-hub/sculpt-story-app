
-- 1. Profiles: add language/theme
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language text DEFAULT 'uk';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme text DEFAULT 'system';

-- 2. Workouts: add duration
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- 3. Exercises master table
CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  muscle_group text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, muscle_group)
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view exercises" ON exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert exercises" ON exercises FOR INSERT TO authenticated WITH CHECK (true);

-- Populate built-in exercises
INSERT INTO exercises (name, muscle_group) VALUES
  ('Barbell Squat','Legs & Glutes'),('Goblet Squat','Legs & Glutes'),('Leg Press','Legs & Glutes'),
  ('Forward Lunges','Legs & Glutes'),('Bulgarian Split Squat','Legs & Glutes'),('Romanian Deadlift','Legs & Glutes'),
  ('Glute Bridge','Legs & Glutes'),('Hip Thrust','Legs & Glutes'),('Cable Glute Kickback','Legs & Glutes'),
  ('Lying Leg Curl','Legs & Glutes'),('Leg Extension','Legs & Glutes'),('Standing Calf Raises','Legs & Glutes'),
  ('Lat Pulldown','Back'),('Seated Cable Row','Back'),('Dumbbell Row','Back'),('Pull-ups','Back'),
  ('Barbell Row','Back'),('Hyperextensions','Back'),('Face Pull','Back'),
  ('Incline Barbell Bench Press','Chest'),('Hammer Strength Chest Press','Chest'),('Cable Chest Fly','Chest'),
  ('Incline Dumbbell Press','Chest'),('Machine Chest Fly','Chest'),('Push-ups','Chest'),('Dips','Chest'),
  ('Seated Dumbbell Press','Shoulders'),('Standing Barbell Press','Shoulders'),('Dumbbell Lateral Raise','Shoulders'),
  ('Dumbbell Front Raise','Shoulders'),('Reverse Dumbbell Fly','Shoulders'),('Rear Delt Machine Fly','Shoulders'),
  ('Barbell Biceps Curl','Arms'),('Dumbbell Biceps Curl','Arms'),('Incline Dumbbell Curl','Arms'),
  ('Cable Lying Curl','Arms'),('Hammer Curl','Arms'),('Triceps Pushdown','Arms'),
  ('Single-arm Triceps Extension','Arms'),('Dumbbell French Press','Arms'),('Bench Dips','Arms'),
  ('Plank','Core'),('Crunches','Core'),('Leg Raises','Core'),('Dead Bug','Core'),('Bicycle Crunch','Core')
ON CONFLICT (name, muscle_group) DO NOTHING;

-- Insert custom exercises into master table
INSERT INTO exercises (name, muscle_group)
SELECT DISTINCT exercise_name, muscle_group FROM custom_exercises
ON CONFLICT (name, muscle_group) DO NOTHING;

-- Insert any exercises from workout history not yet in the table
INSERT INTO exercises (name, muscle_group)
SELECT DISTINCT exercise_name, muscle_group FROM workout_exercises
ON CONFLICT (name, muscle_group) DO NOTHING;

-- 4. Workout sets (normalized)
CREATE TABLE IF NOT EXISTS workout_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  set_number integer NOT NULL DEFAULT 1,
  weight numeric NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 0,
  rest_time integer,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sets" ON workout_sets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_sets.workout_id AND w.user_id = auth.uid()));
CREATE POLICY "Users can insert own sets" ON workout_sets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_sets.workout_id AND w.user_id = auth.uid()));
CREATE POLICY "Users can update own sets" ON workout_sets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_sets.workout_id AND w.user_id = auth.uid()));
CREATE POLICY "Users can delete own sets" ON workout_sets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_sets.workout_id AND w.user_id = auth.uid()));
CREATE POLICY "Admins can view all sets" ON workout_sets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 5. Exercise performance (aggregation)
CREATE TABLE IF NOT EXISTS exercise_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  total_sets integer NOT NULL DEFAULT 0,
  total_reps integer NOT NULL DEFAULT 0,
  total_volume numeric NOT NULL DEFAULT 0,
  max_weight numeric NOT NULL DEFAULT 0,
  avg_weight numeric NOT NULL DEFAULT 0,
  estimated_1rm numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exercise_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own perf" ON exercise_performance FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own perf" ON exercise_performance FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own perf" ON exercise_performance FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own perf" ON exercise_performance FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all perf" ON exercise_performance FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_perf_user ON exercise_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_perf_workout ON exercise_performance(workout_id);
CREATE INDEX IF NOT EXISTS idx_exercise_perf_exercise ON exercise_performance(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_entries_date ON progress_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_exercises_group ON exercises(muscle_group);

-- 7. Migrate JSONB sets to workout_sets
INSERT INTO workout_sets (workout_id, exercise_id, set_number, weight, reps, sort_order)
SELECT
  we.workout_id,
  e.id,
  (row_number() OVER (PARTITION BY we.id ORDER BY s.ordinality))::integer,
  COALESCE((s.value->>'weight')::numeric, 0),
  COALESCE((s.value->>'reps')::integer, 0),
  we.sort_order
FROM workout_exercises we
CROSS JOIN LATERAL jsonb_array_elements(we.sets) WITH ORDINALITY AS s(value, ordinality)
JOIN exercises e ON e.name = we.exercise_name AND e.muscle_group = we.muscle_group
WHERE jsonb_array_length(we.sets) > 0;

-- 8. Populate exercise_performance from migrated data
INSERT INTO exercise_performance (user_id, workout_id, exercise_id, total_sets, total_reps, total_volume, max_weight, avg_weight, estimated_1rm)
SELECT
  w.user_id, ws.workout_id, ws.exercise_id,
  COUNT(*)::integer,
  COALESCE(SUM(ws.reps), 0)::integer,
  COALESCE(SUM(ws.weight * ws.reps), 0)::numeric,
  COALESCE(MAX(ws.weight), 0)::numeric,
  COALESCE(ROUND(AVG(ws.weight)::numeric, 2), 0),
  COALESCE(ROUND(MAX(ws.weight * (1 + ws.reps::numeric / 30))::numeric, 2), 0)
FROM workout_sets ws
JOIN workouts w ON w.id = ws.workout_id
GROUP BY w.user_id, ws.workout_id, ws.exercise_id;

-- 9. Update duration for existing workouts
UPDATE workouts SET duration_seconds = EXTRACT(EPOCH FROM (finished_at - started_at))::integer
WHERE finished_at IS NOT NULL AND duration_seconds IS NULL;

-- 10. Trigger for auto-computing exercise_performance on workout update
CREATE OR REPLACE FUNCTION public.compute_exercise_performance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.finished_at IS NOT NULL THEN
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
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_compute_exercise_performance
  AFTER UPDATE ON workouts
  FOR EACH ROW
  EXECUTE FUNCTION compute_exercise_performance();
