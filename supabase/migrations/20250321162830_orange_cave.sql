/*
  # Fix Daily Verse Function

  1. Updates
    - Fix ambiguous column references in get_daily_verse function
    - Add proper table aliases and qualified column names
    - Improve error handling
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_daily_verse();

-- Create the fixed function with proper column references
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
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- First try to get an unshown verse
  SELECT bv.id, bv.verse_text
  INTO selected_verse_id, selected_verse
  FROM bible_verses bv
  WHERE NOT EXISTS (
    SELECT 1 
    FROM verse_history vh 
    WHERE vh.verse_id = bv.id 
    AND vh.user_id = current_user_id
  )
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- If all verses have been shown, reset history and get a new verse
  IF selected_verse_id IS NULL THEN
    -- Delete history for this user
    DELETE FROM verse_history vh 
    WHERE vh.user_id = current_user_id;
    
    -- Get a new random verse
    SELECT bv.id, bv.verse_text
    INTO selected_verse_id, selected_verse
    FROM bible_verses bv
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;
  
  -- Record this verse as shown
  INSERT INTO verse_history (user_id, verse_id)
  VALUES (current_user_id, selected_verse_id);
  
  RETURN QUERY SELECT selected_verse::text;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_verse TO authenticated;