/*
  # Fix Profiles SELECT Policy Circular Dependency

  1. Problem
    - The "Admins can view all profiles" policy has a circular dependency
    - It queries the profiles table to check if user is admin
    - But to query profiles, you need the policy to pass first
    - This creates a deadlock preventing users from accessing their profile

  2. Solution
    - Remove the problematic "Admins can view all profiles" policy
    - Keep only the "Users can view own profile" policy for SELECT
    - Add a new admin policy that doesn't have circular dependency
    - Use a security definer function to break the circular dependency

  3. Security
    - Users can view their own profile (auth.uid() = id)
    - Admins can view all profiles (using security definer function)
*/

-- Drop the problematic policy with circular dependency
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a security definer function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate admin policy using the security definer function
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());
