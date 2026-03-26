
-- Add image_url column to custom_exercises
ALTER TABLE public.custom_exercises ADD COLUMN IF NOT EXISTS image_url text;

-- Create exercise-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-images', 'exercise-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for exercise-images bucket
CREATE POLICY "Users can upload exercise images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exercise-images');
CREATE POLICY "Users can update own exercise images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'exercise-images');
CREATE POLICY "Anyone can view exercise images" ON storage.objects FOR SELECT USING (bucket_id = 'exercise-images');
CREATE POLICY "Users can delete own exercise images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'exercise-images');
