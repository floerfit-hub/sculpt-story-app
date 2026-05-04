
CREATE POLICY "Admins can view all progress photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'progress-photos' AND public.has_role(auth.uid(), 'admin'));
