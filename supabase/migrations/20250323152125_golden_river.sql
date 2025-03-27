/*
  # Create Auth Users View

  1. Changes
    - Create a view to safely access auth.users data
    - Add appropriate RLS policies
    - Grant necessary permissions

  2. Security
    - Only expose necessary user fields
    - Restrict access to authenticated users with admin role
*/

-- Create a view for accessing auth.users data
CREATE OR REPLACE VIEW auth_users_view AS
SELECT 
  id,
  email,
  raw_user_meta_data as user_metadata,
  created_at,
  last_sign_in_at,
  confirmed_at,
  CASE 
    WHEN raw_user_meta_data->>'is_active' = 'false' THEN false
    ELSE true
  END as is_active
FROM auth.users;

-- Enable RLS
ALTER VIEW auth_users_view SET (security_invoker = true);

-- Create policy for admin access
CREATE POLICY "Admins can view all users"
  ON auth_users_view
  FOR SELECT
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

-- Grant necessary permissions
GRANT SELECT ON auth_users_view TO authenticated;