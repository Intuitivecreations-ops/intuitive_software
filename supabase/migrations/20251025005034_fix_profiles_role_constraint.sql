/*
  # Fix Profiles Role Constraint
  
  1. Changes
    - Update role check constraint to allow 'member' role
    - Existing roles: admin, guest
    - New role: member
  
  2. Security
    - Maintains existing security policies
*/

-- Drop existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with member role
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['admin'::text, 'member'::text, 'guest'::text]));
