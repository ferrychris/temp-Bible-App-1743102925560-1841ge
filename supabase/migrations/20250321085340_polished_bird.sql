/*
  # Authentication and Role Management System Setup

  1. Tables
    - roles: Role definitions and hierarchy
    - user_roles: User role assignments
    - role_permissions: Role-based permissions
    - role_transitions: Role change audit log
    - two_factor_auth: 2FA settings and backup codes

  2. Security
    - RLS policies for all tables
    - Role-based access control
    - Audit logging
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS role_transitions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS two_factor_auth CASCADE;

-- Create roles table
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  level integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role_name CHECK (name IN (
    'admin',
    'staff',
    'user',
    'guest'
  ))
);

-- Create user_roles table
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(user_id, role_id)
);

-- Create role_permissions table
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  conditions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, resource, action)
);

-- Create role_transitions table
CREATE TABLE role_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  old_role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  new_role_id uuid REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Create two_factor_auth table
CREATE TABLE two_factor_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  secret text NOT NULL,
  backup_codes text[] NOT NULL,
  is_enabled boolean DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;

-- Create helper functions
CREATE OR REPLACE FUNCTION has_role(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1
    AND r.name = $2
    AND ur.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
END;
$$ language plpgsql SECURITY DEFINER;

-- Create RLS policies
CREATE POLICY "Admins can manage roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage their own 2FA"
  ON two_factor_auth
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert default roles
INSERT INTO roles (name, description, level) VALUES
  ('admin', 'Full system access', 100),
  ('staff', 'Support access', 50),
  ('user', 'Standard user access', 10),
  ('guest', 'Limited access', 0);

-- Insert default permissions
INSERT INTO role_permissions (role_id, resource, action)
SELECT r.id, p.resource, p.action
FROM roles r
CROSS JOIN (
  VALUES
    ('admin', '*', '*'),
    ('staff', 'users', 'read'),
    ('staff', 'users', 'update'),
    ('user', 'profile', 'read'),
    ('user', 'profile', 'update'),
    ('guest', 'profile', 'read')
) AS p(role_name, resource, action)
WHERE r.name = p.role_name;