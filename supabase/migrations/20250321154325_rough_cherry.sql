/*
  # Configure Storage Bucket for Profile Pictures

  1. Changes
    - Create profile pictures bucket if it doesn't exist
    - Make bucket public
    - Configure security policies

  2. Security
    - Enable RLS
    - Set up access policies for authenticated users
*/

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

-- Create policies if they don't exist
DO $$
BEGIN
    -- Check and create public access policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Profile pictures are publicly accessible'
    ) THEN
        CREATE POLICY "Profile pictures are publicly accessible"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'profile-pictures');
    END IF;

    -- Check and create upload policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can upload their own profile picture'
    ) THEN
        CREATE POLICY "Users can upload their own profile picture"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (
            bucket_id = 'profile-pictures' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;

    -- Check and create update policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can update their own profile picture'
    ) THEN
        CREATE POLICY "Users can update their own profile picture"
        ON storage.objects FOR UPDATE TO authenticated
        USING (
            bucket_id = 'profile-pictures' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;

    -- Check and create delete policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can delete their own profile picture'
    ) THEN
        CREATE POLICY "Users can delete their own profile picture"
        ON storage.objects FOR DELETE TO authenticated
        USING (
            bucket_id = 'profile-pictures' AND
            (storage.foldername(name))[1] = auth.uid()::text
        );
    END IF;
END $$;