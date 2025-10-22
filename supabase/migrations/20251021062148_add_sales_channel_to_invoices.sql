/*
  # Add Sales Channel to Invoices

  1. Changes to invoices table
    - Add `sales_channel` column (enum: 'RETAIL', 'DTC', 'ONLINE')
    - Default value: 'RETAIL'
  
  2. Purpose
    - Track where each sale originated (retail store, direct-to-consumer, online)
    - Different channels have different pricing models:
      - RETAIL (wholesale/in-person): $10/unit
      - DTC (pop-ups/trade shows): $15/unit  
      - ONLINE (Amazon/Ecwid): $17.99/unit after fees
    - Enables accurate profit margin and tax calculations
    - Allows sales segmentation and reporting by channel
  
  3. Important Notes
    - Uses CHECK constraint to enforce valid enum values
    - Default is RETAIL for backward compatibility
    - Existing invoices will automatically be set to RETAIL
*/

-- Add sales_channel column to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'sales_channel'
  ) THEN
    ALTER TABLE invoices 
    ADD COLUMN sales_channel text NOT NULL DEFAULT 'RETAIL'
    CHECK (sales_channel IN ('RETAIL', 'DTC', 'ONLINE'));
  END IF;
END $$;

-- Create index for sales channel filtering/reporting
CREATE INDEX IF NOT EXISTS idx_invoices_sales_channel ON invoices(sales_channel);

-- Add helpful comment
COMMENT ON COLUMN invoices.sales_channel IS 'Sales channel: RETAIL ($10/unit), DTC ($15/unit), ONLINE ($17.99/unit)';
