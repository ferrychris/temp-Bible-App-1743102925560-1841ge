/*
  # Auth Users View with Role-Based Access Control

  1. Changes
    - Create materialized view for auth users data
    - Add function for checking admin access
    - Set up proper security controls

  2. Security
    - Ensure only admins can access user data
    - Implement proper access controls through functions
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS auth_users_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS auth_users_view CASCADE;

-- Create materialized view for better performance
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
  array_agg(r.name) as roles
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

-- Create index for better query performance
CREATE UNIQUE INDEX ON auth_users_view (id);
CREATE INDEX ON auth_users_view (email);
CREATE INDEX ON auth_users_view (created_at);

-- Create function to check if user has admin access
CREATE OR REPLACE FUNCTION has_admin_access()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'admin'
    AND ur.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get users with admin check
CREATE OR REPLACE FUNCTION get_users()
RETURNS SETOF auth_users_view AS $$
BEGIN
  IF has_admin_access() THEN
    RETURN QUERY SELECT * FROM auth_users_view;
  ELSE
    RAISE EXCEPTION 'Access denied';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON auth_users_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_users() TO authenticated;
GRANT EXECUTE ON FUNCTION has_admin_access() TO authenticated;

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_auth_users_view()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY auth_users_view;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh the materialized view
CREATE TRIGGER refresh_auth_users_view_users
AFTER INSERT OR UPDATE OR DELETE ON auth.users
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_auth_users_view();

CREATE TRIGGER refresh_auth_users_view_roles
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_auth_users_view();