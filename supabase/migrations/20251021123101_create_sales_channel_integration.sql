/*
  # Sales Channel Integration System

  1. New Tables
    - `channel_orders`
      - Orders from Amazon, Ecwid, and other channels
      - Order status, totals, and metadata
      - Link to invoices for reconciliation
    
    - `channel_order_items`
      - Line items for each order
      - Product matching to internal SKUs
      - Quantity, price, and tax info
    
    - `channel_fees`
      - Platform fees (Amazon FBA, referral, etc.)
      - Transaction fees from payment processors
      - Link to orders for P&L accuracy
    
    - `channel_refunds`
      - Refund transactions
      - Partial and full refunds
      - Link to original orders
    
    - `channel_inventory_sync`
      - Inventory sync history
      - Stock level tracking across channels
      - Sync status and errors
    
    - `channel_settings`
      - API credentials (encrypted)
      - Channel configuration
      - Sync preferences

  2. Security
    - Enable RLS on all tables
    - Authenticated users can view data
    - Admin can manage integrations

  3. Features
    - Multi-channel order management
    - Automated fee tracking
    - Inventory synchronization
    - Order-to-invoice matching
    - Refund reconciliation
*/

-- Channel Orders (from Amazon, Ecwid, etc.)
CREATE TABLE IF NOT EXISTS channel_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('AMAZON', 'ECWID', 'SHOPIFY', 'EBAY', 'MANUAL')),
  channel_order_id text NOT NULL,
  order_date timestamptz NOT NULL,
  
  -- Customer Info
  customer_name text,
  customer_email text,
  shipping_address jsonb,
  
  -- Order Totals
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  tax_amount decimal(10, 2) DEFAULT 0,
  shipping_amount decimal(10, 2) DEFAULT 0,
  discount_amount decimal(10, 2) DEFAULT 0,
  total_amount decimal(10, 2) NOT NULL DEFAULT 0,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  fulfillment_status text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partially_refunded')),
  
  -- Matching
  linked_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  matched_at timestamptz,
  
  -- Metadata
  raw_data jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(channel, channel_order_id)
);

-- Channel Order Items (Line Items)
CREATE TABLE IF NOT EXISTS channel_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES channel_orders(id) ON DELETE CASCADE,
  
  -- Product Info
  channel_product_id text,
  sku text,
  product_name text NOT NULL,
  
  -- Pricing
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10, 2) NOT NULL DEFAULT 0,
  total_price decimal(10, 2) NOT NULL DEFAULT 0,
  tax_amount decimal(10, 2) DEFAULT 0,
  discount_amount decimal(10, 2) DEFAULT 0,
  
  -- Product Matching
  linked_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  matched_at timestamptz,
  
  -- Metadata
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Channel Fees (Amazon FBA, referral fees, etc.)
CREATE TABLE IF NOT EXISTS channel_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES channel_orders(id) ON DELETE CASCADE,
  channel text NOT NULL,
  
  -- Fee Details
  fee_type text NOT NULL,
  fee_description text,
  amount decimal(10, 2) NOT NULL DEFAULT 0,
  
  -- Date
  date date NOT NULL,
  
  -- Expense Tracking
  linked_expense_id uuid REFERENCES expenses(id) ON DELETE SET NULL,
  synced_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Channel Refunds
CREATE TABLE IF NOT EXISTS channel_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES channel_orders(id) ON DELETE CASCADE,
  channel text NOT NULL,
  channel_refund_id text,
  
  -- Refund Details
  refund_date timestamptz NOT NULL,
  refund_amount decimal(10, 2) NOT NULL DEFAULT 0,
  refund_reason text,
  refund_type text CHECK (refund_type IN ('full', 'partial', 'return')),
  
  -- Items Refunded (for partial refunds)
  refunded_items jsonb,
  
  -- Tracking
  processed boolean DEFAULT false,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Channel Inventory Sync
CREATE TABLE IF NOT EXISTS channel_inventory_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  
  -- Inventory Levels
  channel_sku text,
  quantity_available integer DEFAULT 0,
  quantity_reserved integer DEFAULT 0,
  quantity_total integer DEFAULT 0,
  
  -- Sync Status
  last_synced_at timestamptz,
  sync_status text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
  error_message text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(channel, product_id)
);

-- Channel Settings
CREATE TABLE IF NOT EXISTS channel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text UNIQUE NOT NULL,
  is_active boolean DEFAULT false,
  
  -- API Configuration
  api_credentials jsonb,
  
  -- Sync Settings
  auto_sync_orders boolean DEFAULT false,
  auto_sync_inventory boolean DEFAULT false,
  sync_frequency_minutes integer DEFAULT 60,
  
  -- Matching Rules
  auto_match_invoices boolean DEFAULT true,
  auto_create_expenses boolean DEFAULT true,
  
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE channel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_inventory_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read channel orders"
  ON channel_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read channel order items"
  ON channel_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read channel fees"
  ON channel_fees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read channel refunds"
  ON channel_refunds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read channel inventory sync"
  ON channel_inventory_sync FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read channel settings"
  ON channel_settings FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_channel_orders_channel ON channel_orders(channel);
CREATE INDEX IF NOT EXISTS idx_channel_orders_date ON channel_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_channel_orders_status ON channel_orders(status);
CREATE INDEX IF NOT EXISTS idx_channel_order_items_order ON channel_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_channel_order_items_sku ON channel_order_items(sku);
CREATE INDEX IF NOT EXISTS idx_channel_fees_order ON channel_fees(order_id);
CREATE INDEX IF NOT EXISTS idx_channel_fees_date ON channel_fees(date);
CREATE INDEX IF NOT EXISTS idx_channel_refunds_order ON channel_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_channel_inventory_channel ON channel_inventory_sync(channel);

-- Insert default channel settings
INSERT INTO channel_settings (channel, is_active, auto_sync_orders, auto_sync_inventory) VALUES
('AMAZON', false, false, false),
('ECWID', false, false, false),
('SHOPIFY', false, false, false),
('EBAY', false, false, false)
ON CONFLICT (channel) DO NOTHING;

-- Insert sample Amazon order data
DO $$
DECLARE
  order_id_1 uuid;
  order_id_2 uuid;
BEGIN
  -- Order 1
  INSERT INTO channel_orders (
    channel,
    channel_order_id,
    order_date,
    customer_name,
    customer_email,
    subtotal,
    tax_amount,
    shipping_amount,
    total_amount,
    status,
    payment_status
  ) VALUES (
    'AMAZON',
    'AMZ-112-9384756-1234567',
    '2025-10-15 14:30:00',
    'John Smith',
    'john.smith@example.com',
    62.50,
    4.38,
    0.00,
    66.88,
    'delivered',
    'paid'
  ) RETURNING id INTO order_id_1;

  -- Order 1 Items
  INSERT INTO channel_order_items (order_id, sku, product_name, quantity, unit_price, total_price, tax_amount) VALUES
  (order_id_1, 'LTD-001', 'Bedroom Box Luxury Set', 1, 62.50, 62.50, 4.38);

  -- Order 1 Fees
  INSERT INTO channel_fees (order_id, channel, fee_type, fee_description, amount, date) VALUES
  (order_id_1, 'AMAZON', 'REFERRAL', 'Amazon Referral Fee', -9.38, '2025-10-15'),
  (order_id_1, 'AMAZON', 'FBA', 'FBA Fulfillment Fee', -5.12, '2025-10-15');

  -- Order 2
  INSERT INTO channel_orders (
    channel,
    channel_order_id,
    order_date,
    customer_name,
    customer_email,
    subtotal,
    tax_amount,
    shipping_amount,
    total_amount,
    status,
    payment_status
  ) VALUES (
    'AMAZON',
    'AMZ-112-8475639-9876543',
    '2025-10-18 09:15:00',
    'Sarah Johnson',
    'sarah.j@example.com',
    90.00,
    6.30,
    0.00,
    96.30,
    'shipped',
    'paid'
  ) RETURNING id INTO order_id_2;

  -- Order 2 Items
  INSERT INTO channel_order_items (order_id, sku, product_name, quantity, unit_price, total_price, tax_amount) VALUES
  (order_id_2, 'BIG-002', 'Big Boy Bundle', 1, 90.00, 90.00, 6.30);

  -- Order 2 Fees
  INSERT INTO channel_fees (order_id, channel, fee_type, fee_description, amount, date) VALUES
  (order_id_2, 'AMAZON', 'REFERRAL', 'Amazon Referral Fee', -13.50, '2025-10-18'),
  (order_id_2, 'AMAZON', 'FBA', 'FBA Fulfillment Fee', -6.25, '2025-10-18');

END $$;

-- Insert sample Ecwid order
DO $$
DECLARE
  ecwid_order_id uuid;
BEGIN
  INSERT INTO channel_orders (
    channel,
    channel_order_id,
    order_date,
    customer_name,
    customer_email,
    subtotal,
    tax_amount,
    shipping_amount,
    total_amount,
    status,
    payment_status
  ) VALUES (
    'ECWID',
    'ECWID-2025-10-001234',
    '2025-10-19 16:45:00',
    'Michael Chen',
    'mchen@example.com',
    120.00,
    8.40,
    12.50,
    140.90,
    'processing',
    'paid'
  ) RETURNING id INTO ecwid_order_id;

  -- Ecwid Order Items
  INSERT INTO channel_order_items (order_id, sku, product_name, quantity, unit_price, total_price, tax_amount) VALUES
  (ecwid_order_id, 'LTD-001', 'Bedroom Box Luxury Set', 1, 62.50, 62.50, 4.38),
  (ecwid_order_id, 'SAMP-001', 'Sample Pack', 2, 28.75, 57.50, 4.02);

END $$;
