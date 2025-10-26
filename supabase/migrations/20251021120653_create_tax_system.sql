/*
  # Tax Reporting System

  1. New Tables
    - `tax_rates`
      - State/location-based tax rates
      - Effective dates for rate changes
      - Sales channel specific rates
    
    - `tax_transactions`
      - Track tax collected on each sale
      - Link to invoices for audit trail
      - Sales channel tracking
    
    - `tax_settings`
      - Business tax configuration
      - Nexus states (where you collect tax)
      - Tax exemption rules

  2. Security
    - Enable RLS on all tables
    - Admin-only write access
    - Authenticated users can read for reporting

  3. Features
    - Multi-state tax support
    - Sales channel based calculations
    - Quarterly and annual reporting
    - Audit trail for compliance
*/

-- Tax Rates by State/Location
CREATE TABLE IF NOT EXISTS tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text NOT NULL,
  state_name text NOT NULL,
  county text,
  city text,
  tax_rate decimal(5, 4) NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  sales_channel text DEFAULT 'ALL',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tax Transactions (collected tax records)
CREATE TABLE IF NOT EXISTS tax_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  sales_channel text NOT NULL,
  state_code text NOT NULL,
  county text,
  city text,
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  tax_rate decimal(5, 4) NOT NULL,
  tax_amount decimal(10, 2) NOT NULL DEFAULT 0,
  total_amount decimal(10, 2) NOT NULL DEFAULT 0,
  is_exempt boolean DEFAULT false,
  exemption_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tax Settings and Configuration
CREATE TABLE IF NOT EXISTS tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tax Filing Records (for tracking quarterly filings)
CREATE TABLE IF NOT EXISTS tax_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_period text NOT NULL,
  quarter integer NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  year integer NOT NULL,
  state_code text NOT NULL,
  total_sales decimal(10, 2) NOT NULL DEFAULT 0,
  taxable_sales decimal(10, 2) NOT NULL DEFAULT 0,
  tax_collected decimal(10, 2) NOT NULL DEFAULT 0,
  tax_paid decimal(10, 2) DEFAULT 0,
  filing_date date,
  due_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'filed', 'paid', 'overdue')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(year, quarter, state_code)
);

-- Enable RLS
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_filings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Read access for authenticated users
CREATE POLICY "Authenticated users can read tax rates"
  ON tax_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read tax transactions"
  ON tax_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read tax settings"
  ON tax_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read tax filings"
  ON tax_filings FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tax_rates_state ON tax_rates(state_code);
CREATE INDEX IF NOT EXISTS idx_tax_rates_active ON tax_rates(is_active, effective_date);
CREATE INDEX IF NOT EXISTS idx_tax_transactions_date ON tax_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_tax_transactions_state ON tax_transactions(state_code);
CREATE INDEX IF NOT EXISTS idx_tax_transactions_channel ON tax_transactions(sales_channel);
CREATE INDEX IF NOT EXISTS idx_tax_filings_period ON tax_filings(year, quarter);

-- Insert default tax rates for key states
INSERT INTO tax_rates (state_code, state_name, tax_rate, sales_channel) VALUES
('FL', 'Florida', 0.0700, 'ALL'),
('CA', 'California', 0.0725, 'ALL'),
('NY', 'New York', 0.0400, 'ALL'),
('TX', 'Texas', 0.0625, 'ALL'),
('OUT_OF_STATE', 'Out of State (No Tax)', 0.0000, 'ALL')
ON CONFLICT DO NOTHING;

-- Insert default tax settings
INSERT INTO tax_settings (setting_key, setting_value, description) VALUES
('nexus_states', '["FL", "CA"]', 'States where business has tax nexus'),
('tax_exempt_channels', '["WHOLESALE"]', 'Sales channels that are tax exempt'),
('filing_frequency', '"QUARTERLY"', 'Tax filing frequency (QUARTERLY, MONTHLY, ANNUAL)'),
('business_info', '{"name": "Intuitive Creations LLC", "ein": "", "address": ""}', 'Business information for tax filings')
ON CONFLICT (setting_key) DO NOTHING;
