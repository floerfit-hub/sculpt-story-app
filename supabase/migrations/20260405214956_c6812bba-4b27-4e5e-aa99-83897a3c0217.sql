-- Add gif_url column to exercises table
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS gif_url text;

-- Create exercise-gifs storage bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('exercise-gifs', 'exercise-gifs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to exercise-gifs bucket
CREATE POLICY "Public read access for exercise gifs"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-gifs');
