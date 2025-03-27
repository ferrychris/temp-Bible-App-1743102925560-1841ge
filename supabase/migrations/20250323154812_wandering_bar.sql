/*
  # Fix Materialized View for User Management

  1. Changes
    - Drop existing materialized view with proper error handling
    - Recreate materialized view with improved role aggregation
    - Add proper indexes and permissions

  2. Security
    - Maintain existing RLS policies
    - Keep security definer functions
*/

-- Drop existing materialized view with proper error handling
DO $$
BEGIN
  -- Drop the materialized view if it exists
  DROP MATERIALIZED VIEW IF EXISTS auth_users_view;
EXCEPTION WHEN others THEN
  -- Log error details but continue
  RAISE NOTICE 'Error dropping materialized view: %', SQLERRM;
END $$;

-- Create materialized view with proper error handling
DO $$
BEGIN
  -- Create materialized view
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
    array_remove(array_agg(DISTINCT r.name), NULL) as roles,
    EXISTS (
      SELECT 1 
      FROM user_invitations ui 
      WHERE ui.email = au.email 
      AND ui.status = 'pending'
    ) as has_pending_invitation
  FROM auth.users au
  LEFT JOIN user_roles ur ON ur.user_id = au.id
  LEFT JOIN roles r ON r.id = ur.role_id AND ur.is_active = true
  GROUP BY 
    au.id,
    au.email,
    au.raw_user_meta_data,
    au.created_at,
    au.last_sign_in_at,
    au.confirmed_at;

  -- Create indexes
  CREATE UNIQUE INDEX IF NOT EXISTS auth_users_view_id_idx ON auth_users_view (id);
  CREATE INDEX IF NOT EXISTS auth_users_view_email_idx ON auth_users_view (email);
  CREATE INDEX IF NOT EXISTS auth_users_view_created_at_idx ON auth_users_view (created_at);

EXCEPTION WHEN others THEN
  -- Log error details
  RAISE NOTICE 'Error creating materialized view: %', SQLERRM;
  -- Re-raise the error
  RAISE;
END $$;

-- Recreate admin access check function
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

-- Recreate users getter function
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

-- Grant permissions
GRANT SELECT ON auth_users_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_users() TO authenticated;
GRANT EXECUTE ON FUNCTION has_admin_access() TO authenticated;

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_auth_users_view()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY auth_users_view;
  RETURN NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Error refreshing materialized view: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers with proper error handling
DROP TRIGGER IF EXISTS refresh_auth_users_view_users ON auth.users;
CREATE TRIGGER refresh_auth_users_view_users
AFTER INSERT OR UPDATE OR DELETE ON auth.users
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_auth_users_view();

DROP TRIGGER IF EXISTS refresh_auth_users_view_roles ON user_roles;
CREATE TRIGGER refresh_auth_users_view_roles
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_auth_users_view();