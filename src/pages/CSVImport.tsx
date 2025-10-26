import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ImportType = 'invoices' | 'expenses' | 'customers';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function CSVImport() {
  const [importType, setImportType] = useState<ImportType>('invoices');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }

    return data;
  };

  const importInvoices = async (data: any[]) => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of data) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        const invoice = {
          user_id: userData.user.id,
          invoice_number: row['Invoice Number'] || row['invoice_number'] || `INV-${Date.now()}`,
          customer_name: row['Customer Name'] || row['customer_name'] || 'Unknown',
          amount: parseFloat(row['Amount'] || row['amount'] || row['Total'] || '0'),
          status: row['Status'] || row['status'] || 'draft',
          issue_date: row['Issue Date'] || row['issue_date'] || row['Date'] || new Date().toISOString().split('T')[0],
          due_date: row['Due Date'] || row['due_date'] || new Date().toISOString().split('T')[0],
          sales_channel: row['Sales Channel'] || row['sales_channel'] || 'manual'
        };

        const { error } = await supabase.from('invoices').insert(invoice);
        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Row ${result.success + result.failed}: ${error.message}`);
      }
    }

    return result;
  };

  const importExpenses = async (data: any[]) => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of data) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        const expense = {
          user_id: userData.user.id,
          description: row['Description'] || row['description'] || 'Imported Expense',
          amount: parseFloat(row['Amount'] || row['amount'] || '0'),
          category: row['Category'] || row['category'] || 'other',
          date: row['Date'] || row['date'] || new Date().toISOString().split('T')[0],
          vendor: row['Vendor'] || row['vendor'] || 'Unknown',
          payment_method: row['Payment Method'] || row['payment_method'] || 'other'
        };

        const { error } = await supabase.from('expenses').insert(expense);
        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Row ${result.success + result.failed}: ${error.message}`);
      }
    }

    return result;
  };

  const importCustomers = async (data: any[]) => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (const row of data) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        const customer = {
          user_id: userData.user.id,
          name: row['Name'] || row['name'] || row['Customer Name'] || 'Unknown',
          email: row['Email'] || row['email'] || '',
          phone: row['Phone'] || row['phone'] || '',
          company: row['Company'] || row['company'] || '',
          address: row['Address'] || row['address'] || ''
        };

        const { error } = await supabase.from('customers').insert(customer);
        if (error) throw error;
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Row ${result.success + result.failed}: ${error.message}`);
      }
    }

    return result;
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        throw new Error('No data found in CSV file');
      }

      let importResult: ImportResult;

      switch (importType) {
        case 'invoices':
          importResult = await importInvoices(data);
          break;
        case 'expenses':
          importResult = await importExpenses(data);
          break;
        case 'customers':
          importResult = await importCustomers(data);
          break;
        default:
          throw new Error('Invalid import type');
      }

      setResult(importResult);
    } catch (error: any) {
      setResult({
        success: 0,
        failed: 0,
        errors: [error.message]
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Import CSV Data</h1>
        <p className="text-gray-600">Upload CSV files to import invoices, expenses, or customers</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import Type
            </label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value as ImportType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={importing}
            >
              <option value="invoices">Invoices</option>
              <option value="expenses">Expenses</option>
              <option value="customers">Customers</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={importing}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                {file ? (
                  <p className="text-sm text-gray-700 font-medium">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-700 font-medium mb-1">
                      Click to upload CSV file
                    </p>
                    <p className="text-xs text-gray-500">
                      Supported format: .csv
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {importing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Import Data
              </>
            )}
          </button>

          {result && (
            <div className="mt-6">
              {result.success > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Successfully imported {result.success} record{result.success !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {result.failed > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 mb-2">
                        Failed to import {result.failed} record{result.failed !== 1 ? 's' : ''}
                      </p>
                      {result.errors.length > 0 && (
                        <div className="mt-2 text-xs text-red-800 max-h-40 overflow-y-auto">
                          {result.errors.slice(0, 10).map((error, index) => (
                            <div key={index} className="mb-1">{error}</div>
                          ))}
                          {result.errors.length > 10 && (
                            <div className="mt-2 italic">
                              ...and {result.errors.length - 10} more errors
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">CSV Format Guidelines</h3>
          <div className="text-xs text-blue-800 space-y-1">
            <p><strong>Invoices:</strong> Invoice Number, Customer Name, Amount, Status, Issue Date, Due Date, Sales Channel</p>
            <p><strong>Expenses:</strong> Description, Amount, Category, Date, Vendor, Payment Method</p>
            <p><strong>Customers:</strong> Name, Email, Phone, Company, Address</p>
            <p className="text-blue-600 mt-2">Column names are case-insensitive and flexible (e.g., "Amount" or "amount" both work)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
