/*
  # Storage configuration for profile pictures

  1. Storage Setup
    - Create profile pictures bucket if it doesn't exist
    - Enable RLS on storage.objects
  
  2. Policies
    - Public read access for profile pictures
    - Authenticated users can manage their own pictures
    - Policies are created only if they don't exist
*/

-- Create storage bucket for profile pictures if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'profile-pictures'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('profile-pictures', 'profile-pictures', true);
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