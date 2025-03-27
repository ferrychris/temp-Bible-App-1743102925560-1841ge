/*
  # Add Cover URL to Books Table

  1. Changes
    - Add cover_url column to books table
    - Create index for cover_url for better performance

  2. Security
    - Maintain existing RLS policies
*/

-- Add cover_url column to books table
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS cover_url text;

-- Create index for cover_url column
CREATE INDEX IF NOT EXISTS idx_books_cover_url ON books(cover_url);