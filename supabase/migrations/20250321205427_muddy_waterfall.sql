/*
  # Fix Storage Policies for Book Covers

  1. Changes
    - Create dedicated bucket for book covers
    - Add appropriate RLS policies for book cover management
    - Fix permissions for authenticated users

  2. Security
    - Enable RLS
    - Allow authenticated users to manage book covers
    - Public read access for book covers
*/

-- Create book-covers bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'book-covers'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('book-covers', 'book-covers', true);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for book covers
CREATE POLICY "Book covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-covers');

CREATE POLICY "Authenticated users can upload book covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'book-covers');

CREATE POLICY "Authenticated users can update book covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'book-covers');

CREATE POLICY "Authenticated users can delete book covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'book-covers');