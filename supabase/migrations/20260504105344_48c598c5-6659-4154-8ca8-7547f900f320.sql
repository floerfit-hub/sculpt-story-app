-- Allow users to view templates that have been personally assigned to them
DROP POLICY IF EXISTS "Users can view own or global templates" ON public.workout_templates;
CREATE POLICY "Users can view own global or assigned templates"
ON public.workout_templates
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR is_global = true
  OR EXISTS (
    SELECT 1 FROM public.user_assigned_programs uap
    WHERE uap.template_id = workout_templates.id
      AND uap.user_id = auth.uid()
      AND uap.dismissed = false
  )
);

-- Allow users to view exercises of templates that are assigned to them
DROP POLICY IF EXISTS "Users can view own or global template exercises" ON public.workout_template_exercises;
CREATE POLICY "Users can view template exercises if visible"
ON public.workout_template_exercises
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workout_templates t
    WHERE t.id = workout_template_exercises.template_id
      AND (
        t.user_id = auth.uid()
        OR t.is_global = true
        OR EXISTS (
          SELECT 1 FROM public.user_assigned_programs uap
          WHERE uap.template_id = t.id
            AND uap.user_id = auth.uid()
            AND uap.dismissed = false
        )
      )
  )
);

-- Allow admins to insert assignments for any user (so they can send to specific clients)
DROP POLICY IF EXISTS "Admins can assign programs to anyone" ON public.user_assigned_programs;
CREATE POLICY "Admins can assign programs to anyone"
ON public.user_assigned_programs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view assignment rows
DROP POLICY IF EXISTS "Admins can view all assignments" ON public.user_assigned_programs;
CREATE POLICY "Admins can view all assignments"
ON public.user_assigned_programs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));