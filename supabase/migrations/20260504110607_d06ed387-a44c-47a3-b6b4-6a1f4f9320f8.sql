
-- 1) Make progress-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'progress-photos';

-- Drop overly-permissive SELECT and recreate owner-scoped
DROP POLICY IF EXISTS "Anyone can view progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own progress photos" ON storage.objects;
CREATE POLICY "Users can view own progress photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2) exercise-images: add owner check on UPDATE/DELETE
DROP POLICY IF EXISTS "Users can update own exercise images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own exercise images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload exercise images" ON storage.objects;

CREATE POLICY "Users can upload own exercise images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'exercise-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own exercise images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'exercise-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'exercise-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own exercise images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'exercise-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can manage any exercise image
CREATE POLICY "Admins manage exercise-images"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'exercise-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'exercise-images' AND public.has_role(auth.uid(), 'admin'));

-- 3) exercise-gifs: mutations admin-only
DROP POLICY IF EXISTS "Authenticated users can upload gifs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update gifs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete gifs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view exercise gifs" ON storage.objects;

CREATE POLICY "Public can view exercise-gifs"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-gifs');

CREATE POLICY "Admins manage exercise-gifs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'exercise-gifs' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'exercise-gifs' AND public.has_role(auth.uid(), 'admin'));

-- 4) Subscriptions: remove client INSERT (handled by handle_new_user trigger)
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

-- 5) fitness_stats: allow admins to delete (cleanup of stale rows)
CREATE POLICY "Admins can delete fitness stats"
ON public.fitness_stats FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
