/*
  # Assign Admin Role to User

  1. Changes
    - Assign admin role to sam@reachloud.com
    - Ensure role is active
    - Add audit trail entry

  2. Security
    - Use secure role assignment
    - Add proper audit logging
*/

DO $$
DECLARE
  v_user_id uuid;
  v_admin_role_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'sam@reachloud.com';

  -- Get admin role ID
  SELECT id INTO v_admin_role_id
  FROM roles
  WHERE name = 'admin';

  -- Ensure we have both IDs
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found';
  END IF;

  -- Remove any existing role assignments for this user
  DELETE FROM user_roles
  WHERE user_id = v_user_id;

  -- Assign admin role
  INSERT INTO user_roles (
    user_id,
    role_id,
    is_active,
    assigned_at
  ) VALUES (
    v_user_id,
    v_admin_role_id,
    true,
    now()
  );

  -- Add role transition record
  INSERT INTO role_transitions (
    user_id,
    new_role_id,
    changed_by,
    reason
  ) VALUES (
    v_user_id,
    v_admin_role_id,
    v_user_id,
    'Initial admin role assignment'
  );

END $$;