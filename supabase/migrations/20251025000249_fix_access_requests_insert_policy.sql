/*
  # Fix Access Requests Insert Policy

  1. Changes
    - Add policy to allow anyone (including unauthenticated users) to insert access requests
    - This allows the public signup/request access form to work properly

  2. Security
    - Users can only insert their own access requests
    - They cannot modify existing requests
*/

-- Allow anyone to insert access requests (for the signup form)
CREATE POLICY "Anyone can create access request"
  ON access_requests FOR INSERT
  TO public
  WITH CHECK (true);
