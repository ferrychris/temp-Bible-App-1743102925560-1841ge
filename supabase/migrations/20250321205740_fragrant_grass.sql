/*
  # Add Author Column to Books Table

  1. Changes
    - Add author column to books table
    - Make it nullable since existing books won't have an author
    - Add index for better performance when querying by author

  2. Security
    - Maintain existing RLS policies
*/

-- Add author column to books table
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS author text;

-- Create index for author column
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);