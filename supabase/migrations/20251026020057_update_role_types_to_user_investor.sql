/*
  # Update Profile Role Types

  1. Changes
    - Drop old role constraint
    - Add new role constraint with 'admin', 'user', 'investor'
    - Update any existing 'member' or 'guest' roles to 'user'
  
  2. Security
    - Maintains existing RLS policies
    - No changes to access control logic
*/

-- Update existing roles from old to new naming
UPDATE profiles SET role = 'user' WHERE role = 'member' OR role = 'guest';

-- Drop old constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

-- Add new constraint with updated role types
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin'::text, 'user'::text, 'investor'::text]));