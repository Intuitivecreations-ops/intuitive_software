import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { importZohoExpenses, importZohoInvoices, importZohoRecurringExpenses } from '../utils/zohoImport';

interface ImportResults {
  expenses: { success: number; errors: unknown[] };
  invoices: { success: number; errors: unknown[] };
  recurring: { success: number; errors: unknown[] };
}

export default function ZohoImport() {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);

  const handleAutoImport = async () => {
    setImporting(true);
    setResults(null);

    try {
      const results: ImportResults = {
        expenses: { success: 0, errors: [] },
        invoices: { success: 0, errors: [] },
        recurring: { success: 0, errors: [] },
      };

      const expensesResponse = await fetch('/src/data/Expense Details.csv');
      const expensesText = await expensesResponse.text();
      results.expenses = await importZohoExpenses(expensesText);

      const invoicesResponse = await fetch('/src/data/Invoice.csv');
      const invoicesText = await invoicesResponse.text();
      results.invoices = await importZohoInvoices(invoicesText);

      const recurringResponse = await fetch('/src/data/Recurring_Expense.csv');
      const recurringText = await recurringResponse.text();
      results.recurring = await importZohoRecurringExpenses(recurringText);

      setResults(results);
    } catch (error) {
      console.error('Import error:', error);
      alert('Import failed: ' + String(error));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Zoho Data Import</h1>
          <p className="text-gray-600">
            Import your historical data from Zoho Books into Clean Head
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Database className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Auto Import</h2>
                <p className="text-sm text-gray-600">
                  Import all Zoho data with one click
                </p>
              </div>
            </div>
            <button
              onClick={handleAutoImport}
              disabled={importing}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                importing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {importing ? (
                <span className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Importing...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Start Import</span>
                </span>
              )}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">What will be imported:</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• 67 Expense records (Mar - Oct 2025)</li>
              <li>• 13 Invoice records with line items</li>
              <li>• 4 Recurring expense subscriptions</li>
            </ul>
          </div>
        </div>

        {results && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Expenses</p>
                    <p className="text-sm text-green-700">
                      {results.expenses.success} records imported
                    </p>
                  </div>
                </div>
                {results.expenses.errors.length > 0 && (
                  <span className="text-sm text-red-600">
                    {results.expenses.errors.length} errors
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Invoices</p>
                    <p className="text-sm text-green-700">
                      {results.invoices.success} records imported
                    </p>
                  </div>
                </div>
                {results.invoices.errors.length > 0 && (
                  <span className="text-sm text-red-600">
                    {results.invoices.errors.length} errors
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Recurring Expenses</p>
                    <p className="text-sm text-green-700">
                      {results.recurring.success} records imported
                    </p>
                  </div>
                </div>
                {results.recurring.errors.length > 0 && (
                  <span className="text-sm text-red-600">
                    {results.recurring.errors.length} errors
                  </span>
                )}
              </div>

              {(results.expenses.errors.length > 0 ||
                results.invoices.errors.length > 0 ||
                results.recurring.errors.length > 0) && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-red-900 mb-2">Errors Details:</p>
                      <pre className="text-xs text-red-800 overflow-auto max-h-40">
                        {JSON.stringify(
                          {
                            expenses: results.expenses.errors,
                            invoices: results.invoices.errors,
                            recurring: results.recurring.errors,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  ✅ Your Zoho data has been imported into separate history tables. You can now view it in the Zoho Archive section.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
