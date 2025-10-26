/*
  # Create Access Approval System

  1. New Tables
    - `access_requests`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `message` (text) - Why they want access
      - `status` (text) - 'pending', 'approved', 'denied'
      - `requested_at` (timestamptz)
      - `reviewed_at` (timestamptz, nullable)
      - `reviewed_by` (uuid, nullable) - Admin who reviewed
      - `user_id` (uuid, nullable) - Created user after approval

  2. Changes to profiles table
    - Add `approved` boolean column (default false)
    - Add `approved_by` uuid column (references profiles)
    - Add `approved_at` timestamptz column

  3. Security
    - Enable RLS on access_requests
    - Admins can view all requests
    - Users can view their own request status
    - Only admins can approve/deny
    - Block non-approved users from accessing the app

  4. Important Notes
    - First user who signs up is automatically approved and made admin
    - After that, all signups require approval
    - Only existing admins can promote users to admin role
    - Admin role can only be set by existing admins, not during signup
*/

-- Create access_requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Add approval columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approved'
  ) THEN
    ALTER TABLE profiles ADD COLUMN approved boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN approved_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON profiles(approved);

-- Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for access_requests
CREATE POLICY "Admins can view all access requests"
  ON access_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  );

CREATE POLICY "Users can view own access request"
  ON access_requests FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Admins can update access requests"
  ON access_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  );

-- Function to check if user is first user (auto-approve as admin)
CREATE OR REPLACE FUNCTION is_first_user()
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (SELECT 1 FROM profiles LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user_registration()
RETURNS trigger AS $$
DECLARE
  is_first boolean;
BEGIN
  is_first := is_first_user();
  
  -- If this is the first user, approve them as admin automatically
  IF is_first THEN
    NEW.approved := true;
    NEW.approved_at := now();
    NEW.role := 'admin';
  ELSE
    -- All other users need approval and default to guest
    NEW.approved := false;
    NEW.role := 'guest';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle new user registration
DROP TRIGGER IF EXISTS on_new_user_registration ON profiles;
CREATE TRIGGER on_new_user_registration
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_registration();

-- Update existing RLS policies to check approval status
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate policies with approval check
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Users cannot change their own role or approval status
    AND (role = (SELECT role FROM profiles WHERE id = auth.uid()))
    AND (approved = (SELECT approved FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.approved = true
    )
  );
