import { supabase } from '../lib/supabase';

export interface BankAccount {
  id: string;
  plaid_account_id: string;
  institution_name: string;
  account_name: string;
  account_type: string;
  account_subtype: string;
  mask: string;
  current_balance: number;
  available_balance: number;
  is_active: boolean;
  last_synced_at: string | null;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  plaid_transaction_id: string;
  date: string;
  merchant_name: string | null;
  name: string;
  amount: number;
  category: string[] | null;
  pending: boolean;
  suggested_category: string | null;
  approved_category: string | null;
  confidence_score: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'synced';
  linked_expense_id: string | null;
  notes: string | null;
}

export interface TransactionRule {
  id: string;
  rule_name: string;
  merchant_pattern: string;
  category: string;
  match_type: 'contains' | 'starts_with' | 'ends_with' | 'exact' | 'regex';
  auto_approve: boolean;
  priority: number;
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('is_active', true)
    .order('institution_name');

  if (error) {
    console.error('Error fetching bank accounts:', error);
    return [];
  }

  return data || [];
}

export async function getBankTransactions(
  accountId?: string,
  status?: string
): Promise<BankTransaction[]> {
  let query = supabase
    .from('bank_transactions')
    .select('*')
    .order('date', { ascending: false });

  if (accountId) {
    query = query.eq('bank_account_id', accountId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching bank transactions:', error);
    return [];
  }

  return data || [];
}

export async function getTransactionRules(): Promise<TransactionRule[]> {
  const { data, error } = await supabase
    .from('transaction_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching transaction rules:', error);
    return [];
  }

  return data || [];
}

export function matchRule(merchantName: string, rule: TransactionRule): boolean {
  const merchant = merchantName.toUpperCase();
  const pattern = rule.merchant_pattern.toUpperCase();

  switch (rule.match_type) {
    case 'contains':
      return merchant.includes(pattern);
    case 'starts_with':
      return merchant.startsWith(pattern);
    case 'ends_with':
      return merchant.endsWith(pattern);
    case 'exact':
      return merchant === pattern;
    case 'regex':
      try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(merchant);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export async function categorizeBankTransaction(
  transaction: BankTransaction
): Promise<{ category: string; confidence: number }> {
  const rules = await getTransactionRules();

  const merchantName = transaction.merchant_name || transaction.name;

  for (const rule of rules) {
    if (matchRule(merchantName, rule)) {
      return {
        category: rule.category,
        confidence: 0.95,
      };
    }
  }

  if (transaction.category && transaction.category.length > 0) {
    return {
      category: transaction.category[0],
      confidence: 0.60,
    };
  }

  return {
    category: 'Uncategorized',
    confidence: 0.0,
  };
}

export async function autoCategorizePendingTransactions(): Promise<number> {
  const transactions = await getBankTransactions(undefined, 'pending');
  let categorized = 0;

  for (const transaction of transactions) {
    const { category, confidence } = await categorizeBankTransaction(transaction);

    const { error } = await supabase
      .from('bank_transactions')
      .update({
        suggested_category: category,
        confidence_score: confidence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    if (!error) {
      categorized++;
    }
  }

  return categorized;
}

export async function approveBankTransaction(
  transactionId: string,
  category: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('bank_transactions')
    .update({
      status: 'approved',
      approved_category: category,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  return !error;
}

export async function syncTransactionToExpense(transactionId: string): Promise<string | null> {
  const { data: transaction } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (!transaction || transaction.status !== 'approved') {
    return null;
  }

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      description: transaction.merchant_name || transaction.name,
      category: transaction.approved_category,
      amount: Math.abs(transaction.amount),
      date: transaction.date,
      vendor: transaction.merchant_name,
      payment_method: 'Bank Account',
    })
    .select()
    .single();

  if (error || !expense) {
    console.error('Error creating expense:', error);
    return null;
  }

  await supabase
    .from('bank_transactions')
    .update({
      status: 'synced',
      linked_expense_id: expense.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  return expense.id;
}

export async function rejectBankTransaction(transactionId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('bank_transactions')
    .update({
      status: 'rejected',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId);

  return !error;
}

export async function detectDuplicates(transaction: BankTransaction): Promise<string[]> {
  const dateRange = {
    start: new Date(transaction.date),
    end: new Date(transaction.date),
  };

  dateRange.start.setDate(dateRange.start.getDate() - 3);
  dateRange.end.setDate(dateRange.end.getDate() + 3);

  const { data: existing } = await supabase
    .from('expenses')
    .select('id, description, amount, date')
    .gte('date', dateRange.start.toISOString().split('T')[0])
    .lte('date', dateRange.end.toISOString().split('T')[0])
    .eq('amount', Math.abs(transaction.amount));

  if (!existing || existing.length === 0) {
    return [];
  }

  const merchantName = (transaction.merchant_name || transaction.name).toLowerCase();

  const duplicates = existing.filter((expense) => {
    const expenseDesc = expense.description.toLowerCase();
    return (
      merchantName.includes(expenseDesc) ||
      expenseDesc.includes(merchantName) ||
      levenshteinDistance(merchantName, expenseDesc) < 5
    );
  });

  return duplicates.map((d) => d.id);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getTransactionStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'approved':
      return 'bg-blue-100 text-blue-700';
    case 'synced':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function getConfidenceColor(confidence: number | null): string {
  if (!confidence) return 'bg-slate-100 text-slate-700';
  if (confidence >= 0.9) return 'bg-green-100 text-green-700';
  if (confidence >= 0.7) return 'bg-blue-100 text-blue-700';
  if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
}
