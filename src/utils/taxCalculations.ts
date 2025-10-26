import { supabase } from '../lib/supabase';

export interface TaxRate {
  id: string;
  state_code: string;
  state_name: string;
  tax_rate: number;
  sales_channel: string;
}

export interface TaxCalculation {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  stateCode: string;
  isExempt: boolean;
  exemptionReason?: string;
}

export async function getTaxRate(stateCode: string, salesChannel: string = 'ALL'): Promise<TaxRate | null> {
  const { data, error } = await supabase
    .from('tax_rates')
    .select('*')
    .eq('state_code', stateCode)
    .eq('is_active', true)
    .or(`sales_channel.eq.${salesChannel},sales_channel.eq.ALL`)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching tax rate:', error);
    return null;
  }

  return data;
}

export async function calculateTax(
  subtotal: number,
  stateCode: string,
  salesChannel: string = 'RETAIL'
): Promise<TaxCalculation> {
  const taxExemptChannels = await getTaxExemptChannels();

  const isExempt = taxExemptChannels.includes(salesChannel) || stateCode === 'OUT_OF_STATE';

  if (isExempt) {
    return {
      subtotal,
      taxRate: 0,
      taxAmount: 0,
      total: subtotal,
      stateCode,
      isExempt: true,
      exemptionReason: stateCode === 'OUT_OF_STATE' ? 'Out of state sale' : 'Tax exempt channel',
    };
  }

  const taxRate = await getTaxRate(stateCode, salesChannel);

  if (!taxRate) {
    return {
      subtotal,
      taxRate: 0,
      taxAmount: 0,
      total: subtotal,
      stateCode,
      isExempt: false,
    };
  }

  const taxAmount = subtotal * Number(taxRate.tax_rate);
  const total = subtotal + taxAmount;

  return {
    subtotal,
    taxRate: Number(taxRate.tax_rate),
    taxAmount: Number(taxAmount.toFixed(2)),
    total: Number(total.toFixed(2)),
    stateCode,
    isExempt: false,
  };
}

export async function recordTaxTransaction(
  invoiceId: string,
  taxCalc: TaxCalculation,
  salesChannel: string
): Promise<void> {
  const { error } = await supabase.from('tax_transactions').insert({
    invoice_id: invoiceId,
    transaction_date: new Date().toISOString().split('T')[0],
    sales_channel: salesChannel,
    state_code: taxCalc.stateCode,
    subtotal: taxCalc.subtotal,
    tax_rate: taxCalc.taxRate,
    tax_amount: taxCalc.taxAmount,
    total_amount: taxCalc.total,
    is_exempt: taxCalc.isExempt,
    exemption_reason: taxCalc.exemptionReason,
  });

  if (error) {
    console.error('Error recording tax transaction:', error);
    throw error;
  }
}

export async function getTaxExemptChannels(): Promise<string[]> {
  const { data } = await supabase
    .from('tax_settings')
    .select('setting_value')
    .eq('setting_key', 'tax_exempt_channels')
    .maybeSingle();

  if (!data) return [];
  return data.setting_value as string[];
}

export async function getNexusStates(): Promise<string[]> {
  const { data } = await supabase
    .from('tax_settings')
    .select('setting_value')
    .eq('setting_key', 'nexus_states')
    .maybeSingle();

  if (!data) return [];
  return data.setting_value as string[];
}

export interface QuarterlyTaxSummary {
  quarter: number;
  year: number;
  stateCode: string;
  totalSales: number;
  taxableSales: number;
  taxCollected: number;
  transactionCount: number;
}

export async function getQuarterlyTaxSummary(
  year: number,
  quarter: number,
  stateCode?: string
): Promise<QuarterlyTaxSummary[]> {
  const quarterMonths = {
    1: [1, 2, 3],
    2: [4, 5, 6],
    3: [7, 8, 9],
    4: [10, 11, 12],
  };

  const months = quarterMonths[quarter as keyof typeof quarterMonths];
  const startDate = `${year}-${String(months[0]).padStart(2, '0')}-01`;
  const endMonth = months[2];
  const endDay = new Date(year, endMonth, 0).getDate();
  const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${endDay}`;

  let query = supabase
    .from('tax_transactions')
    .select('*')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (stateCode) {
    query = query.eq('state_code', stateCode);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching quarterly tax summary:', error);
    return [];
  }

  const groupedByState = data.reduce((acc: any, transaction: any) => {
    const state = transaction.state_code;
    if (!acc[state]) {
      acc[state] = {
        quarter,
        year,
        stateCode: state,
        totalSales: 0,
        taxableSales: 0,
        taxCollected: 0,
        transactionCount: 0,
      };
    }

    acc[state].totalSales += Number(transaction.total_amount);
    if (!transaction.is_exempt) {
      acc[state].taxableSales += Number(transaction.subtotal);
      acc[state].taxCollected += Number(transaction.tax_amount);
    }
    acc[state].transactionCount += 1;

    return acc;
  }, {});

  return Object.values(groupedByState);
}

export function getQuarterFromDate(date: Date): number {
  const month = date.getMonth() + 1;
  return Math.ceil(month / 3);
}

export function getCurrentQuarter(): { quarter: number; year: number } {
  const now = new Date();
  return {
    quarter: getQuarterFromDate(now),
    year: now.getFullYear(),
  };
}

export function getQuarterDateRange(year: number, quarter: number): { start: string; end: string } {
  const quarterMonths = {
    1: { start: '01-01', end: '03-31' },
    2: { start: '04-01', end: '06-30' },
    3: { start: '07-01', end: '09-30' },
    4: { start: '10-01', end: '12-31' },
  };

  const range = quarterMonths[quarter as keyof typeof quarterMonths];
  return {
    start: `${year}-${range.start}`,
    end: `${year}-${range.end}`,
  };
}
