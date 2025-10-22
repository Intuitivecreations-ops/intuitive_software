import { useState, useEffect } from 'react';
import { Archive, DollarSign, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ZohoArchive() {
  const [view, setView] = useState<'expenses' | 'invoices' | 'recurring'>('expenses');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [recurring, setRecurring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [expensesRes, invoicesRes, recurringRes] = await Promise.all([
        supabase.from('zoho_expenses_history').select('*').order('date', { ascending: false }),
        supabase.from('zoho_invoices_history').select('*').order('invoice_date', { ascending: false }),
        supabase.from('zoho_recurring_expenses').select('*').order('start_date', { ascending: false }),
      ]);

      if (expensesRes.data) setExpenses(expensesRes.data);
      if (invoicesRes.data) setInvoices(invoicesRes.data);
      if (recurringRes.data) setRecurring(recurringRes.data);
    } catch (error) {
      console.error('Error loading Zoho archive:', error);
    } finally {
      setLoading(false);
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount_with_tax || 0), 0);
  const totalInvoices = invoices.reduce((sum, i) => sum + Number(i.total || 0), 0);
  const monthlyRecurring = recurring.reduce((sum, r) => sum + Number(r.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Zoho Archive</h1>
          <p className="text-slate-600 mt-1">Historical data from Zoho Books</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Total Expenses</span>
            <DollarSign className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${totalExpenses.toFixed(2)}</div>
          <p className="text-sm text-slate-500 mt-1">{expenses.length} records</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Total Revenue</span>
            <FileText className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${totalInvoices.toFixed(2)}</div>
          <p className="text-sm text-slate-500 mt-1">{invoices.length} invoices</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Monthly Recurring</span>
            <RefreshCw className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${monthlyRecurring.toFixed(2)}</div>
          <p className="text-sm text-slate-500 mt-1">{recurring.length} subscriptions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex gap-2 p-2">
            <button
              onClick={() => setView('expenses')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'expenses' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Expenses ({expenses.length})
            </button>
            <button
              onClick={() => setView('invoices')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'invoices' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Invoices ({invoices.length})
            </button>
            <button
              onClick={() => setView('recurring')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'recurring' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Recurring ({recurring.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <>
              {view === 'expenses' && <ExpensesTable data={expenses} />}
              {view === 'invoices' && <InvoicesTable data={invoices} />}
              {view === 'recurring' && <RecurringTable data={recurring} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpensesTable({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No expenses found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Date</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Vendor</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Category</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Amount</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((expense) => (
            <tr key={expense.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-4 text-sm text-slate-900">
                {new Date(expense.date).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-sm text-slate-900">{expense.vendor_name || '-'}</td>
              <td className="py-3 px-4 text-sm text-slate-600">{expense.account_name}</td>
              <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                ${Number(expense.amount_with_tax).toFixed(2)}
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  {expense.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoicesTable({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No invoices found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Date</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Invoice #</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Customer</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Item</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Total</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((invoice) => (
            <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-4 text-sm text-slate-900">
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-sm text-slate-900 font-medium">
                {invoice.invoice_number}
              </td>
              <td className="py-3 px-4 text-sm text-slate-900">{invoice.customer_name}</td>
              <td className="py-3 px-4 text-sm text-slate-600">{invoice.item_name}</td>
              <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                ${Number(invoice.total).toFixed(2)}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    invoice.invoice_status === 'Closed'
                      ? 'bg-green-100 text-green-700'
                      : invoice.invoice_status === 'Draft'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {invoice.invoice_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecurringTable({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No recurring expenses found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Name</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Vendor</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Frequency</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Start Date</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Amount</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((recurring) => (
            <tr key={recurring.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-4 text-sm text-slate-900 font-medium">
                {recurring.recurring_name}
              </td>
              <td className="py-3 px-4 text-sm text-slate-900">{recurring.vendor_name || '-'}</td>
              <td className="py-3 px-4 text-sm text-slate-600">
                Every {recurring.repeat_every} {recurring.frequency}
              </td>
              <td className="py-3 px-4 text-sm text-slate-900">
                {new Date(recurring.start_date).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                ${Number(recurring.total).toFixed(2)}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    recurring.status === 'Active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {recurring.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
