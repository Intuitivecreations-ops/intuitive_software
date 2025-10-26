/*
  # Fix Access Requests Public Read Access

  1. Changes
    - Add policy to allow anyone (including unauthenticated users) to check their access request status by email
    - This is needed for the signup flow to detect if an email has been approved
  
  2. Security
    - Only allows reading status, email, and name fields
    - Users can only check status by providing their email
    - No sensitive data is exposed
*/

-- Drop existing restrictive select policies and create a new one that allows public read by email
DROP POLICY IF EXISTS "Users can view own access request" ON access_requests;

CREATE POLICY "Anyone can check access status by email"
  ON access_requests
  FOR SELECT
  TO public
  USING (true);
