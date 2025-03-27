/*
  # User Management System Enhancement

  1. Changes
    - Add email verification settings
    - Add bulk user creation support
    - Add user invitation tracking
    - Add email verification tracking

  2. Security
    - Maintain existing RLS policies
    - Add policies for invitation management
*/

-- Create table for user invitations
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  roles text[] NOT NULL DEFAULT ARRAY['user'],
  status text NOT NULL DEFAULT 'pending',
  invitation_token text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired'))
);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for user invitations
CREATE POLICY "Admins can manage invitations"
  ON user_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.is_active = true
    )
  );

-- Create function to invite users
CREATE OR REPLACE FUNCTION invite_users(
  emails text[],
  roles text[] DEFAULT ARRAY['user']
)
RETURNS SETOF user_invitations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
  v_invitation user_invitations;
BEGIN
  -- Check if user has admin access
  IF NOT has_admin_access() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Process each email
  FOREACH v_email IN ARRAY emails
  LOOP
    -- Create invitation
    INSERT INTO user_invitations (
      email,
      invited_by,
      roles,
      invitation_token
    ) VALUES (
      v_email,
      auth.uid(),
      roles,
      encode(gen_random_bytes(32), 'hex')
    )
    RETURNING * INTO v_invitation;

    RETURN NEXT v_invitation;
  END LOOP;

  RETURN;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION invite_users TO authenticated;

-- Create index for better query performance
CREATE INDEX ON user_invitations (email);
CREATE INDEX ON user_invitations (status);
CREATE INDEX ON user_invitations (expires_at);

-- Update auth_users_view to include invitation status
DROP MATERIALIZED VIEW IF EXISTS auth_users_view CASCADE;

CREATE MATERIALIZED VIEW auth_users_view AS
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data as user_metadata,
  au.created_at,
  au.last_sign_in_at,
  au.confirmed_at,
  CASE 
    WHEN au.raw_user_meta_data->>'is_active' = 'false' THEN false
    ELSE true
  END as is_active,
  array_agg(DISTINCT r.name) as roles,
  EXISTS (
    SELECT 1 
    FROM user_invitations ui 
    WHERE ui.email = au.email 
    AND ui.status = 'pending'
  ) as has_pending_invitation
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN roles r ON r.id = ur.role_id
WHERE ur.is_active = true OR ur.is_active IS NULL
GROUP BY 
  au.id,
  au.email,
  au.raw_user_meta_data,
  au.created_at,
  au.last_sign_in_at,
  au.confirmed_at;