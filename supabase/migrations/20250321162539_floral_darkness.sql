/*
  # Fix Random Verse Selection

  1. Changes
    - Add a function to properly select a random verse
    - Update the bible_verses table to ensure proper indexing

  2. Security
    - Function is accessible to authenticated users only
*/

-- Create a function to get a random verse
CREATE OR REPLACE FUNCTION get_random_verse()
RETURNS TABLE (verse_text text) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT verse_text 
  FROM bible_verses 
  OFFSET floor(random() * (SELECT COUNT(*) FROM bible_verses))
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_random_verse TO authenticated;

-- Create an index on verse_text for better performance
CREATE INDEX IF NOT EXISTS idx_bible_verses_text ON bible_verses(verse_text);