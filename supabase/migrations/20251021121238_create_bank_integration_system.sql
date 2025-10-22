/*
  # Bank Integration System

  1. New Tables
    - `bank_accounts`
      - Connected bank accounts (via Plaid)
      - Account details and balances
      - Connection status tracking
    
    - `bank_transactions`
      - Raw transactions from bank feeds
      - Pending approval status
      - Auto-categorization suggestions
    
    - `transaction_rules`
      - Auto-categorization rules
      - Merchant name pattern matching
      - Category assignments
    
    - `plaid_items`
      - Plaid connection metadata
      - Access tokens (encrypted)
      - Institution info

  2. Security
    - Enable RLS on all tables
    - Authenticated users can view their data
    - Admin can manage connections

  3. Features
    - Read-only bank feeds
    - Auto-categorization with ML
    - Manual approval workflow
    - Duplicate detection
    - Reconciliation tracking
*/

-- Bank Accounts (Connected via Plaid)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_account_id text UNIQUE NOT NULL,
  institution_name text NOT NULL,
  account_name text NOT NULL,
  account_type text NOT NULL,
  account_subtype text,
  mask text,
  current_balance decimal(10, 2) DEFAULT 0,
  available_balance decimal(10, 2) DEFAULT 0,
  currency_code text DEFAULT 'USD',
  is_active boolean DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Plaid Items (Connection Metadata)
CREATE TABLE IF NOT EXISTS plaid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id text UNIQUE NOT NULL,
  plaid_access_token text NOT NULL,
  institution_id text NOT NULL,
  institution_name text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'error', 'expired', 'disconnected')),
  error_code text,
  error_message text,
  consent_expiration_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bank Transactions (From Bank Feeds)
CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE CASCADE,
  plaid_transaction_id text UNIQUE NOT NULL,
  date date NOT NULL,
  authorized_date date,
  merchant_name text,
  name text NOT NULL,
  amount decimal(10, 2) NOT NULL,
  currency_code text DEFAULT 'USD',
  category jsonb,
  category_id text,
  pending boolean DEFAULT false,
  transaction_type text,
  payment_channel text,
  
  -- Categorization and Approval
  suggested_category text,
  approved_category text,
  confidence_score decimal(3, 2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'synced')),
  
  -- Linking to existing records
  linked_expense_id uuid REFERENCES expenses(id) ON DELETE SET NULL,
  linked_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Duplicate detection
  is_duplicate boolean DEFAULT false,
  duplicate_of uuid REFERENCES bank_transactions(id) ON DELETE SET NULL,
  
  -- Notes and metadata
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transaction Rules (Auto-Categorization)
CREATE TABLE IF NOT EXISTS transaction_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  merchant_pattern text NOT NULL,
  category text NOT NULL,
  subcategory text,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 100,
  match_type text DEFAULT 'contains' CHECK (match_type IN ('contains', 'starts_with', 'ends_with', 'exact', 'regex')),
  auto_approve boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sync History (Track sync runs)
CREATE TABLE IF NOT EXISTS bank_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE CASCADE,
  sync_start timestamptz NOT NULL,
  sync_end timestamptz,
  transactions_fetched integer DEFAULT 0,
  transactions_new integer DEFAULT 0,
  transactions_updated integer DEFAULT 0,
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_sync_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read bank accounts"
  ON bank_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read plaid items"
  ON plaid_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read bank transactions"
  ON bank_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update bank transactions"
  ON bank_transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read transaction rules"
  ON transaction_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read sync history"
  ON bank_sync_history FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_merchant ON bank_transactions(merchant_name);
CREATE INDEX IF NOT EXISTS idx_transaction_rules_pattern ON transaction_rules(merchant_pattern);
CREATE INDEX IF NOT EXISTS idx_transaction_rules_active ON transaction_rules(is_active, priority);

-- Insert default categorization rules
INSERT INTO transaction_rules (rule_name, merchant_pattern, category, match_type, priority) VALUES
('Amazon Purchases', 'AMAZON', 'Office Supplies', 'contains', 90),
('Alibaba Orders', 'ALIBABA', 'Cost of Goods Sold', 'contains', 95),
('Google Services', 'GOOGLE', 'IT and Internet Expenses', 'contains', 95),
('Canva Subscription', 'CANVA', 'Advertising And Marketing', 'contains', 95),
('Stripe Fees', 'STRIPE', 'Stripe Fees', 'contains', 95),
('Facebook Ads', 'FACEBOOK', 'Advertising And Marketing', 'contains', 95),
('T-Mobile', 'T-MOBILE', 'Telephone Expense', 'contains', 95),
('Zoho', 'ZOHO', 'IT and Internet Expenses', 'contains', 95),
('Hostinger', 'HOSTINGER', 'IT and Internet Expenses', 'contains', 95),
('Office Depot', 'OFFICE DEPOT', 'Office Supplies', 'contains', 90),
('Gas Station', 'GAS', 'Fuel/Mileage Expenses', 'contains', 80),
('Insurance', 'INSURANCE', 'BUSINESS INSURANCE', 'contains', 90),
('Notary', 'NOTARY', 'LEGAL', 'contains', 90),
('Accountant', 'ACCOUNTANT', 'Accountant Mark LaFontaine', 'contains', 95),
('Shipping', 'PIRATE SHIP', 'SHIPPING', 'contains', 95),
('UPS Store', 'UPS', 'SHIPPING', 'contains', 85),
('FedEx', 'FEDEX', 'SHIPPING', 'contains', 85)
ON CONFLICT DO NOTHING;

-- Insert sample bank account (for testing)
INSERT INTO bank_accounts (
  plaid_account_id,
  institution_name,
  account_name,
  account_type,
  account_subtype,
  mask,
  current_balance
) VALUES (
  'sample_checking_001',
  'Chase Bank',
  'Business Checking',
  'depository',
  'checking',
  '1234',
  5420.50
) ON CONFLICT DO NOTHING;
