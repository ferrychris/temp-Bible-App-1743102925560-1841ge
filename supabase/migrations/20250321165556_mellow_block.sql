/*
  # Profile Pictures Storage Setup

  1. Storage Configuration
    - Create profile-pictures bucket
    - Set bucket as public
    - Configure storage policies

  2. Security
    - Enable RLS on storage.objects
    - Add policies for:
      - Public read access
      - Authenticated user upload/update/delete
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Profile pictures are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile picture" ON storage.objects;

-- Create or update storage bucket for profile pictures
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'profile-pictures'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('profile-pictures', 'profile-pictures', true);
    ELSE
        UPDATE storage.buckets
        SET public = true
        WHERE id = 'profile-pictures';
    END IF;
END $$;

-- Enable Row Level Security on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create consolidated policies
CREATE POLICY "Profile pictures are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
);