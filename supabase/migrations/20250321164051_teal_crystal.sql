/*
  # Fix Daily Verse Function

  1. Changes
    - Fix ambiguous column references
    - Add better error handling
    - Improve transaction handling
    - Add proper type casting

  2. Security
    - Maintain RLS policies
    - Keep security definer setting
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_daily_verse();

-- Create the improved function
CREATE OR REPLACE FUNCTION get_daily_verse()
RETURNS TABLE (verse_text text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  selected_verse_id uuid;
  selected_verse text;
BEGIN
  -- Get current user ID with error handling
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- First try to get an unshown verse with explicit table aliases
  SELECT 
    verses.id,
    verses.verse_text
  INTO 
    selected_verse_id,
    selected_verse
  FROM bible_verses verses
  WHERE NOT EXISTS (
    SELECT 1 
    FROM verse_history history 
    WHERE history.verse_id = verses.id 
    AND history.user_id = current_user_id
  )
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- If all verses have been shown, reset history and get a new verse
  IF selected_verse_id IS NULL THEN
    -- Delete history for this user
    DELETE FROM verse_history 
    WHERE verse_history.user_id = current_user_id;
    
    -- Get a new random verse
    SELECT 
      verses.id,
      verses.verse_text
    INTO 
      selected_verse_id,
      selected_verse
    FROM bible_verses verses
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  -- Verify we got a verse
  IF selected_verse_id IS NULL OR selected_verse IS NULL THEN
    RAISE EXCEPTION 'No verses available';
  END IF;
  
  -- Record this verse as shown
  INSERT INTO verse_history (
    user_id,
    verse_id
  ) VALUES (
    current_user_id,
    selected_verse_id
  );
  
  RETURN QUERY SELECT selected_verse::text;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details (in production, you might want to log to a proper logging system)
    RAISE NOTICE 'Error in get_daily_verse: %', SQLERRM;
    -- Re-raise the error
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_verse TO authenticated;

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_verse_history_user_verse 
ON verse_history(user_id, verse_id);

CREATE INDEX IF NOT EXISTS idx_bible_verses_random 
ON bible_verses(id, verse_text);