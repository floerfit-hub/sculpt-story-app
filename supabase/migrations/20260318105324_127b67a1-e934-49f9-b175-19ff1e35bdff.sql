CREATE POLICY "Authenticated can read fitness_stats for leaderboard"
ON public.fitness_stats
FOR SELECT
TO authenticated
USING (true);