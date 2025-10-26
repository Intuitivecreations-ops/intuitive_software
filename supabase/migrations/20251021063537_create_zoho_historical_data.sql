/*
  # Create Zoho Historical Data Tables

  1. New Tables
    - `zoho_expenses_history`
      - Complete expense history from Zoho Books
      - Vendor tracking, categories, receipts
      - Tax amounts and payment status
    
    - `zoho_invoices_history`
      - Complete invoice history from Zoho Books
      - Line items, customer details, payment status
      - Sales channel tracking
    
    - `zoho_recurring_expenses`
      - Active recurring expense subscriptions
      - Monthly tracking for budgeting

  2. Security
    - Enable RLS on all tables
    - Authenticated users can read historical data
    - Only admins can modify (future enhancement)

  3. Features
    - Preserves original Zoho IDs for reference
    - Stores receipt/document names
    - Tracks all financial categories
    - Multi-line invoice support
*/

-- Zoho Expenses History
CREATE TABLE IF NOT EXISTS zoho_expenses_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zoho_transaction_id text,
  status text,
  date date NOT NULL,
  transaction_number text,
  vendor_name text,
  vendor_id text,
  account_name text,
  customer_name text,
  customer_id text,
  amount decimal(10, 2) NOT NULL DEFAULT 0,
  amount_with_tax decimal(10, 2) NOT NULL DEFAULT 0,
  transaction_type text,
  location_name text,
  receipt_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Zoho Invoices History
CREATE TABLE IF NOT EXISTS zoho_invoices_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zoho_invoice_id text,
  invoice_date date NOT NULL,
  invoice_number text,
  invoice_status text,
  customer_id text,
  customer_name text,
  due_date date,
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  balance decimal(10, 2) NOT NULL DEFAULT 0,
  payment_terms text,
  payment_terms_label text,
  notes text,
  terms_conditions text,
  sales_channel text,
  item_name text,
  item_description text,
  quantity decimal(10, 2) DEFAULT 0,
  item_price decimal(10, 2) DEFAULT 0,
  item_total decimal(10, 2) DEFAULT 0,
  sku text,
  product_id text,
  upc text,
  salesperson text,
  primary_contact_email text,
  primary_contact_phone text,
  billing_address text,
  billing_city text,
  billing_state text,
  billing_country text,
  billing_code text,
  billing_phone text,
  shipping_address text,
  shipping_city text,
  shipping_state text,
  shipping_country text,
  shipping_code text,
  shipping_phone text,
  last_payment_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Zoho Recurring Expenses
CREATE TABLE IF NOT EXISTS zoho_recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_name text NOT NULL,
  frequency text,
  repeat_every integer DEFAULT 1,
  start_date date NOT NULL,
  end_date date,
  status text DEFAULT 'Active',
  expense_description text,
  expense_account text,
  paid_through text,
  vendor_name text,
  location_name text,
  amount decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  currency_code text DEFAULT 'USD',
  is_billable boolean DEFAULT false,
  customer_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE zoho_expenses_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_invoices_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Authenticated users can read historical data
CREATE POLICY "Authenticated users can read expense history"
  ON zoho_expenses_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read invoice history"
  ON zoho_invoices_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read recurring expenses"
  ON zoho_recurring_expenses FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_zoho_expenses_date ON zoho_expenses_history(date);
CREATE INDEX IF NOT EXISTS idx_zoho_expenses_vendor ON zoho_expenses_history(vendor_name);
CREATE INDEX IF NOT EXISTS idx_zoho_expenses_account ON zoho_expenses_history(account_name);
CREATE INDEX IF NOT EXISTS idx_zoho_invoices_date ON zoho_invoices_history(invoice_date);
CREATE INDEX IF NOT EXISTS idx_zoho_invoices_customer ON zoho_invoices_history(customer_name);
CREATE INDEX IF NOT EXISTS idx_zoho_invoices_status ON zoho_invoices_history(invoice_status);
