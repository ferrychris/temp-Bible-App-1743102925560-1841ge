/*
  # Add Audio Storage Configuration

  1. Changes
    - Create dedicated bucket for chapter audio files
    - Configure storage policies for audio management
    - Enable public access for audio files

  2. Security
    - Enable RLS
    - Allow authenticated users to manage audio files
    - Public read access for audio playback
*/

-- Create chapter-audio bucket if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'chapter-audio'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('chapter-audio', 'chapter-audio', true);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for audio files
CREATE POLICY "Audio files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chapter-audio');

CREATE POLICY "Authenticated users can upload audio files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chapter-audio');

CREATE POLICY "Authenticated users can update audio files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'chapter-audio');

CREATE POLICY "Authenticated users can delete audio files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chapter-audio');