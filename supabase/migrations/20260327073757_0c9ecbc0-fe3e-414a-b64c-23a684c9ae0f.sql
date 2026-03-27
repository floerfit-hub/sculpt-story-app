
-- A) exercises: remove open INSERT, add admin-only INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated can insert exercises" ON public.exercises;

CREATE POLICY "Admins can insert exercises" ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update exercises" ON public.exercises
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete exercises" ON public.exercises
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- B) custom_exercises: Pro-only INSERT
DROP POLICY IF EXISTS "Users can insert own custom exercises" ON public.custom_exercises;

CREATE POLICY "Pro users can insert own custom exercises" ON public.custom_exercises
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.plan != 'free'
        AND s.status IN ('active', 'trialing')
    )
  );

-- C) subscriptions: remove user UPDATE, add admin-only UPDATE
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

CREATE POLICY "Admins can update subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- D) fitness_stats: remove leaderboard USING(true)
DROP POLICY IF EXISTS "Authenticated can read fitness_stats for leaderboard" ON public.fitness_stats;
