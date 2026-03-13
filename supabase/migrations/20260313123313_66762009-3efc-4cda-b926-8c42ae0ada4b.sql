-- Remove legacy duplicate triggers to avoid multiple recalculations per workout event
DROP TRIGGER IF EXISTS trg_compute_exercise_performance ON public.workouts;
DROP TRIGGER IF EXISTS trg_compute_performance ON public.workouts;
DROP TRIGGER IF EXISTS trg_compute_exercise_performance_on_workouts ON public.workouts;

CREATE TRIGGER trg_compute_exercise_performance_on_workouts
AFTER INSERT OR UPDATE OF finished_at ON public.workouts
FOR EACH ROW
WHEN (NEW.finished_at IS NOT NULL)
EXECUTE FUNCTION public.compute_exercise_performance();