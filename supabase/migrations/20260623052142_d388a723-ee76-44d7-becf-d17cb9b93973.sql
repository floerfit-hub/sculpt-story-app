
-- 1) exercise_gifs_any_authenticated_mutate: drop permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload exercise gifs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update exercise gifs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete exercise gifs" ON storage.objects;

-- 2) resolve_exercise_rpc_bypass: restrict insertion to admins
CREATE OR REPLACE FUNCTION public.resolve_exercise_id(_name text, _muscle_group text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
BEGIN
  SELECT id INTO _id FROM public.exercises WHERE name = _name AND muscle_group = _muscle_group LIMIT 1;
  IF _id IS NOT NULL THEN
    RETURN _id;
  END IF;

  -- Only admins may create new global exercises
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.exercises (name, muscle_group) VALUES (_name, _muscle_group)
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;

-- 3) SECURITY DEFINER function exposure: revoke EXECUTE from anon/authenticated for trigger/internal functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compute_exercise_performance() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- resolve_exercise_id and get_exercise_leaderboard are called by signed-in users from the app.
-- Restrict to authenticated only (revoke from anon).
REVOKE EXECUTE ON FUNCTION public.resolve_exercise_id(text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_exercise_leaderboard(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_exercise_leaderboard(text, integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_exercise_id(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exercise_leaderboard(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_exercise_leaderboard(text, integer) TO authenticated;

-- has_role is used inside RLS policies; keep callable
-- (no change needed, EXECUTE remains for authenticated)

-- 4) fitness_stats_missing_admin_select: add admin SELECT for consistency
CREATE POLICY "Admins can view all fitness stats"
ON public.fitness_stats
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5) progress_photos_missing_update_policy: add owner UPDATE policy
CREATE POLICY "Users can update their own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
