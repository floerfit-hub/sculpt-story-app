
-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can view all progress entries
CREATE POLICY "Admins can view all entries"
ON public.progress_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete progress entries
CREATE POLICY "Admins can delete all entries"
ON public.progress_entries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can view all workouts
CREATE POLICY "Admins can view all workouts"
ON public.workouts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can view all workout exercises
CREATE POLICY "Admins can view all workout exercises"
ON public.workout_exercises FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can view all user roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete workouts
CREATE POLICY "Admins can delete all workouts"
ON public.workouts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete workout exercises
CREATE POLICY "Admins can delete all workout exercises"
ON public.workout_exercises FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
