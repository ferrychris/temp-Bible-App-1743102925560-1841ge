/*
  # Verse Tracking System

  1. New Tables
    - verse_history: Tracks which verses have been shown to users
    - Creates function to get unshown verses first

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create verse_history table
CREATE TABLE verse_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  verse_id uuid REFERENCES bible_verses(id) ON DELETE CASCADE NOT NULL,
  shown_at timestamptz DEFAULT now(),
  UNIQUE(user_id, verse_id)
);

-- Enable RLS
ALTER TABLE verse_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own history
CREATE POLICY "Users can view their verse history"
  ON verse_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for inserting history
CREATE POLICY "System can insert verse history"
  ON verse_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to get a verse that hasn't been shown to the user
CREATE OR REPLACE FUNCTION get_daily_verse()
RETURNS TABLE (verse_text text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  selected_verse_id uuid;
  selected_verse text;
BEGIN
  -- Get current user ID
  user_id := auth.uid();
  
  -- First try to get an unshown verse
  SELECT bv.id, bv.verse_text
  INTO selected_verse_id, selected_verse
  FROM bible_verses bv
  WHERE NOT EXISTS (
    SELECT 1 
    FROM verse_history vh 
    WHERE vh.verse_id = bv.id 
    AND vh.user_id = user_id
  )
  ORDER BY random()
  LIMIT 1;
  
  -- If all verses have been shown, reset history and get a new verse
  IF selected_verse_id IS NULL THEN
    -- Delete history for this user
    DELETE FROM verse_history WHERE user_id = user_id;
    
    -- Get a new random verse
    SELECT bv.id, bv.verse_text
    INTO selected_verse_id, selected_verse
    FROM bible_verses bv
    ORDER BY random()
    LIMIT 1;
  END IF;
  
  -- Record this verse as shown
  INSERT INTO verse_history (user_id, verse_id)
  VALUES (user_id, selected_verse_id);
  
  RETURN QUERY SELECT selected_verse;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_verse TO authenticated;

-- Drop the old function as it's being replaced
DROP FUNCTION IF EXISTS get_random_verse();