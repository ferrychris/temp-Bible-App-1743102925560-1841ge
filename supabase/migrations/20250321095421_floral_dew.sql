/*
  # Add profile pictures support

  1. Changes
    - Add profile_picture_url column to auth.users
    - Create storage bucket for profile pictures
    - Add storage policies for profile pictures

  2. Security
    - Enable RLS on storage bucket
    - Add policies for authenticated users to manage their own profile pictures
*/

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', false);

-- Add profile_picture_url to auth.users metadata
ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS raw_app_meta_data jsonb;

-- Enable Row Level Security on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
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

CREATE POLICY "Profile pictures are accessible by authenticated users"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-pictures');