import { supabase } from '../lib/supabase';

interface ZohoExpense {
  status: string;
  date: string;
  transaction_number: string;
  vendor_name: string;
  account_name: string;
  customer_name: string;
  amount: string;
  amount_with_tax: string;
  transaction_type: string;
  transaction_id: string;
  vendor_id: string;
  customer_id: string;
  location_name: string;
  receipt_name: string;
}

interface ZohoInvoice {
  'Invoice Date': string;
  'Invoice ID': string;
  'Invoice Number': string;
  'Invoice Status': string;
  'Customer ID': string;
  'Customer Name': string;
  'Due Date': string;
  SubTotal: string;
  Total: string;
  Balance: string;
  'Payment Terms': string;
  'Payment Terms Label': string;
  Notes: string;
  'Terms & Conditions': string;
  'Item Name': string;
  'Item Desc': string;
  Quantity: string;
  'Item Price': string;
  'Item Total': string;
  SKU: string;
  'Product ID': string;
  UPC: string;
  'Sales person': string;
  'Primary Contact EmailID': string;
  'Primary Contact Phone': string;
  'Billing Address': string;
  'Billing City': string;
  'Billing State': string;
  'Billing Country': string;
  'Billing Code': string;
  'Billing Phone': string;
  'Shipping Address': string;
  'Shipping City': string;
  'Shipping State': string;
  'Shipping Country': string;
  'Shipping Code': string;
  'Shipping Phone Number': string;
  'Last Payment Date': string;
  'Invoice Level Tax Exemption Reason': string;
}

interface ZohoRecurringExpense {
  'Recurring Expense Name': string;
  'Recurrence Frequency': string;
  'Repeat Every': string;
  'Start Date': string;
  'End Date': string;
  'Recurrence Status': string;
  'Expense Description': string;
  'Expense Account': string;
  'Paid Through': string;
  Vendor: string;
  'Location Name': string;
  'Expense Amount': string;
  Total: string;
  'Currency Code': string;
  'Is Billable': string;
  'Customer Name': string;
}

function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const result: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let char of lines[i]) {
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    result.push(row);
  }

  return result;
}

export async function importZohoExpenses(csvText: string): Promise<{ success: number; errors: any[] }> {
  const expenses = parseCSV(csvText) as ZohoExpense[];
  let success = 0;
  const errors: any[] = [];

  for (const expense of expenses) {
    try {
      const { error } = await supabase
        .from('zoho_expenses_history')
        .insert({
          zoho_transaction_id: expense.transaction_id,
          status: expense.status,
          date: expense.date || null,
          transaction_number: expense.transaction_number || null,
          vendor_name: expense.vendor_name || null,
          vendor_id: expense.vendor_id || null,
          account_name: expense.account_name || null,
          customer_name: expense.customer_name || null,
          customer_id: expense.customer_id || null,
          amount: parseFloat(expense.amount) || 0,
          amount_with_tax: parseFloat(expense.amount_with_tax) || 0,
          transaction_type: expense.transaction_type || null,
          location_name: expense.location_name || null,
          receipt_name: expense.receipt_name || null,
        });

      if (error) {
        errors.push({ expense, error: error.message });
      } else {
        success++;
      }
    } catch (err) {
      errors.push({ expense, error: String(err) });
    }
  }

  return { success, errors };
}

export async function importZohoInvoices(csvText: string): Promise<{ success: number; errors: any[] }> {
  const invoices = parseCSV(csvText) as ZohoInvoice[];
  let success = 0;
  const errors: any[] = [];

  for (const invoice of invoices) {
    try {
      const { error } = await supabase
        .from('zoho_invoices_history')
        .insert({
          zoho_invoice_id: invoice['Invoice ID'],
          invoice_date: invoice['Invoice Date'] || null,
          invoice_number: invoice['Invoice Number'] || null,
          invoice_status: invoice['Invoice Status'] || null,
          customer_id: invoice['Customer ID'] || null,
          customer_name: invoice['Customer Name'] || null,
          due_date: invoice['Due Date'] || null,
          subtotal: parseFloat(invoice.SubTotal) || 0,
          total: parseFloat(invoice.Total) || 0,
          balance: parseFloat(invoice.Balance) || 0,
          payment_terms: invoice['Payment Terms'] || null,
          payment_terms_label: invoice['Payment Terms Label'] || null,
          notes: invoice.Notes || null,
          terms_conditions: invoice['Terms & Conditions'] || null,
          sales_channel: invoice['Invoice Level Tax Exemption Reason'] || null,
          item_name: invoice['Item Name'] || null,
          item_description: invoice['Item Desc'] || null,
          quantity: parseFloat(invoice.Quantity) || 0,
          item_price: parseFloat(invoice['Item Price']) || 0,
          item_total: parseFloat(invoice['Item Total']) || 0,
          sku: invoice.SKU || null,
          product_id: invoice['Product ID'] || null,
          upc: invoice.UPC || null,
          salesperson: invoice['Sales person'] || null,
          primary_contact_email: invoice['Primary Contact EmailID'] || null,
          primary_contact_phone: invoice['Primary Contact Phone'] || null,
          billing_address: invoice['Billing Address'] || null,
          billing_city: invoice['Billing City'] || null,
          billing_state: invoice['Billing State'] || null,
          billing_country: invoice['Billing Country'] || null,
          billing_code: invoice['Billing Code'] || null,
          billing_phone: invoice['Billing Phone'] || null,
          shipping_address: invoice['Shipping Address'] || null,
          shipping_city: invoice['Shipping City'] || null,
          shipping_state: invoice['Shipping State'] || null,
          shipping_country: invoice['Shipping Country'] || null,
          shipping_code: invoice['Shipping Code'] || null,
          shipping_phone: invoice['Shipping Phone Number'] || null,
          last_payment_date: invoice['Last Payment Date'] || null,
        });

      if (error) {
        errors.push({ invoice, error: error.message });
      } else {
        success++;
      }
    } catch (err) {
      errors.push({ invoice, error: String(err) });
    }
  }

  return { success, errors };
}

export async function importZohoRecurringExpenses(csvText: string): Promise<{ success: number; errors: any[] }> {
  const recurring = parseCSV(csvText) as ZohoRecurringExpense[];
  let success = 0;
  const errors: any[] = [];

  for (const expense of recurring) {
    try {
      const { error } = await supabase
        .from('zoho_recurring_expenses')
        .insert({
          recurring_name: expense['Recurring Expense Name'],
          frequency: expense['Recurrence Frequency'] || null,
          repeat_every: parseInt(expense['Repeat Every']) || 1,
          start_date: expense['Start Date'] || null,
          end_date: expense['End Date'] || null,
          status: expense['Recurrence Status'] || 'Active',
          expense_description: expense['Expense Description'] || null,
          expense_account: expense['Expense Account'] || null,
          paid_through: expense['Paid Through'] || null,
          vendor_name: expense.Vendor || null,
          location_name: expense['Location Name'] || null,
          amount: parseFloat(expense['Expense Amount']) || 0,
          total: parseFloat(expense.Total) || 0,
          currency_code: expense['Currency Code'] || 'USD',
          is_billable: expense['Is Billable'] === 'true',
          customer_name: expense['Customer Name'] || null,
        });

      if (error) {
        errors.push({ expense, error: error.message });
      } else {
        success++;
      }
    } catch (err) {
      errors.push({ expense, error: String(err) });
    }
  }

  return { success, errors };
}
