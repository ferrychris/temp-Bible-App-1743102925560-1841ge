/*
  # Bulk User Creation and Email Verification System

  1. Changes
    - Add function to create multiple users with pending verification
    - Add function to verify email addresses
    - Add trigger to handle user verification status

  2. Security
    - Only admins can create users
    - Email verification required by default
*/

-- Create function to bulk create users with pending verification
CREATE OR REPLACE FUNCTION bulk_create_users(
  user_emails text[],
  user_roles text[] DEFAULT ARRAY['user']
)
RETURNS TABLE (
  email text,
  status text,
  message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
  v_result RECORD;
  v_invitation user_invitations;
BEGIN
  -- Check if user has admin access
  IF NOT has_admin_access() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Process each email
  FOREACH v_email IN ARRAY user_emails
  LOOP
    BEGIN
      -- Check if user already exists
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        RETURN QUERY SELECT 
          v_email,
          'error'::text,
          'User already exists'::text;
        CONTINUE;
      END IF;

      -- Create invitation
      INSERT INTO user_invitations (
        email,
        invited_by,
        roles,
        invitation_token,
        status
      ) VALUES (
        v_email,
        auth.uid(),
        user_roles,
        encode(gen_random_bytes(32), 'hex'),
        'pending'
      )
      RETURNING * INTO v_invitation;

      -- Return success status
      RETURN QUERY SELECT 
        v_email,
        'success'::text,
        'Invitation sent'::text;

    EXCEPTION WHEN others THEN
      -- Return error status
      RETURN QUERY SELECT 
        v_email,
        'error'::text,
        SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Create function to verify email
CREATE OR REPLACE FUNCTION verify_user_email(
  user_id uuid,
  verification_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation user_invitations;
BEGIN
  -- Find matching invitation
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE email = (SELECT email FROM auth.users WHERE id = user_id)
  AND invitation_token = verification_token
  AND status = 'pending'
  AND expires_at > now();

  -- If found, mark as verified
  IF FOUND THEN
    -- Update invitation status
    UPDATE user_invitations
    SET status = 'accepted'
    WHERE id = v_invitation.id;

    -- Update user metadata
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email_verified}',
      'true'
    )
    WHERE id = user_id;

    -- Assign roles from invitation
    INSERT INTO user_roles (
      user_id,
      role_id,
      is_active
    )
    SELECT 
      user_id,
      r.id,
      true
    FROM unnest(v_invitation.roles) role_name
    JOIN roles r ON r.name = role_name;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION bulk_create_users TO authenticated;
GRANT EXECUTE ON FUNCTION verify_user_email TO authenticated;

-- Create trigger to handle user verification
CREATE OR REPLACE FUNCTION handle_user_verification()
RETURNS trigger AS $$
BEGIN
  -- Check if email was verified
  IF NEW.raw_user_meta_data->>'email_verified' = 'true' AND
     (OLD.raw_user_meta_data->>'email_verified' IS NULL OR 
      OLD.raw_user_meta_data->>'email_verified' = 'false') THEN
    
    -- Refresh materialized view
    REFRESH MATERIALIZED VIEW CONCURRENTLY auth_users_view;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS user_verification_trigger ON auth.users;
CREATE TRIGGER user_verification_trigger
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_user_verification();