
-- Allow authenticated users to upload to exercise-gifs bucket
CREATE POLICY "Authenticated users can upload exercise gifs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exercise-gifs');

-- Allow authenticated users to update exercise gifs
CREATE POLICY "Authenticated users can update exercise gifs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'exercise-gifs');

-- Allow authenticated users to delete exercise gifs
CREATE POLICY "Authenticated users can delete exercise gifs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'exercise-gifs');
