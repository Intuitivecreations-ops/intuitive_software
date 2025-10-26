import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase-auth',
    storage: window.localStorage,
  },
});

export type Profile = {
  id: string;
  name: string;
  role: 'admin' | 'user' | 'investor';
  approved: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
};

export function canEdit(role: Profile['role']): boolean {
  return role === 'admin' || role === 'user';
}

export function canViewOnly(role: Profile['role']): boolean {
  return role === 'investor';
}

export function isAdmin(role: Profile['role']): boolean {
  return role === 'admin';
}

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  quantity_in_stock: number;
  cost_price: number | null;
  sale_price: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  customer_id: string | null;
  invoice_number: string;
  date: string;
  due_date: string | null;
  total_amount: number;
  status: 'paid' | 'unpaid' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
};

export type Expense = {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  date: string;
  vendor: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  receipt_filename: string | null;
  extracted_data: any | null;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  type: 'income' | 'expense' | 'investment' | 'loan';
  amount: number;
  date: string;
  description: string | null;
  linked_invoice_id: string | null;
  linked_expense_id: string | null;
  created_at: string;
};

export type Media = {
  id: string;
  user_id: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  description: string | null;
  type: 'photo' | 'idea' | 'comment' | 'document' | null;
  created_at: string;
};
