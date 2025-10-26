/*
  # Fix Auth Trigger to Support Pre-Approved Users
  
  1. Changes
    - Update handle_new_user() function to check for existing approved access_requests
    - Auto-approve users with approved access requests
    - Set appropriate role based on whether they're the first user or have an approved request
  
  2. Security
    - Maintains existing security model
    - Properly handles first user as admin
    - Auto-approves users with pre-approved access requests
*/

-- Update the handle_new_user function to check for approved access requests
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first boolean;
  has_approved_request boolean;
  request_name text;
BEGIN
  -- Check if this is the first user
  is_first := NOT EXISTS (SELECT 1 FROM profiles LIMIT 1);
  
  -- Check if user has an approved access request
  SELECT 
    (status = 'approved'),
    name
  INTO 
    has_approved_request,
    request_name
  FROM access_requests
  WHERE email = new.email
  LIMIT 1;
  
  -- Insert profile with appropriate settings
  INSERT INTO public.profiles (id, name, role, approved, approved_at)
  VALUES (
    new.id,
    COALESCE(request_name, new.raw_user_meta_data->>'name', new.email),
    CASE 
      WHEN is_first THEN 'admin'
      WHEN has_approved_request THEN COALESCE(new.raw_user_meta_data->>'role', 'member')
      ELSE 'guest'
    END,
    COALESCE(is_first, has_approved_request, false),
    CASE 
      WHEN (is_first OR has_approved_request) THEN now()
      ELSE NULL
    END
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
