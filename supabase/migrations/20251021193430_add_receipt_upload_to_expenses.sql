/*
  # Add Receipt Upload to Expenses

  1. Changes to Tables
    - Add `receipt_url` column to store Supabase Storage path
    - Add `receipt_filename` column to store original filename
    - Add `extracted_data` JSONB column to store AI-parsed receipt data
  
  2. Storage
    - Create 'receipts' storage bucket for uploaded files
    - Enable RLS on storage bucket
  
  3. Security
    - Users can only upload receipts for their own expenses
    - Users can only view their own receipts
    - Files are private and require authentication
*/

-- Add receipt columns to expenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE expenses ADD COLUMN receipt_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'receipt_filename'
  ) THEN
    ALTER TABLE expenses ADD COLUMN receipt_filename text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'extracted_data'
  ) THEN
    ALTER TABLE expenses ADD COLUMN extracted_data jsonb;
  END IF;
END $$;

-- Create receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts bucket
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
CREATE POLICY "Users can upload their own receipts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
CREATE POLICY "Users can view their own receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;
CREATE POLICY "Users can delete their own receipts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);