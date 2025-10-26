import { useState, useEffect } from 'react';
import { Calendar, DollarSign, FileText, Download, TrendingUp, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getQuarterlyTaxSummary, getCurrentQuarter, getQuarterDateRange } from '../utils/taxCalculations';

export default function TaxReports() {
  const [activeTab, setActiveTab] = useState<'overview' | 'quarterly' | 'annual' | 'settings'>('overview');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter().quarter);
  const [quarterlyData, setQuarterlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [taxRates, setTaxRates] = useState<any[]>([]);

  useEffect(() => {
    loadQuarterlyData();
    loadTaxRates();
  }, [selectedYear, selectedQuarter]);

  async function loadQuarterlyData() {
    setLoading(true);
    const data = await getQuarterlyTaxSummary(selectedYear, selectedQuarter);
    setQuarterlyData(data);
    setLoading(false);
  }

  async function loadTaxRates() {
    const { data } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('is_active', true)
      .order('state_name');
    if (data) setTaxRates(data);
  }

  async function exportToCSV(type: 'quarterly' | 'annual') {
    const dateRange = getQuarterDateRange(selectedYear, selectedQuarter);

    const { data: transactions } = await supabase
      .from('tax_transactions')
      .select('*')
      .gte('transaction_date', dateRange.start)
      .lte('transaction_date', dateRange.end)
      .order('transaction_date');

    if (!transactions) return;

    const headers = [
      'Date',
      'State',
      'Sales Channel',
      'Subtotal',
      'Tax Rate',
      'Tax Amount',
      'Total',
      'Exempt',
      'Exemption Reason',
    ];

    const rows = transactions.map((t: any) => [
      t.transaction_date,
      t.state_code,
      t.sales_channel,
      t.subtotal,
      (Number(t.tax_rate) * 100).toFixed(2) + '%',
      t.tax_amount,
      t.total_amount,
      t.is_exempt ? 'Yes' : 'No',
      t.exemption_reason || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${type}-Q${selectedQuarter}-${selectedYear}.csv`;
    a.click();
  }

  const totalTaxCollected = quarterlyData.reduce((sum, item) => sum + item.taxCollected, 0);
  const totalSales = quarterlyData.reduce((sum, item) => sum + item.totalSales, 0);
  const totalTaxableSales = quarterlyData.reduce((sum, item) => sum + item.taxableSales, 0);
  const averageTaxRate = totalTaxableSales > 0 ? (totalTaxCollected / totalTaxableSales) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tax Reports</h1>
          <p className="text-slate-600 mt-1">Sales tax tracking and compliance reporting</p>
        </div>
        <button
          onClick={() => exportToCSV('quarterly')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Tax Collected</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${totalTaxCollected.toFixed(2)}</div>
          <p className="text-sm text-slate-500 mt-1">Q{selectedQuarter} {selectedYear}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Total Sales</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${totalSales.toFixed(2)}</div>
          <p className="text-sm text-slate-500 mt-1">All channels</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Taxable Sales</span>
            <FileText className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${totalTaxableSales.toFixed(2)}</div>
          <p className="text-sm text-slate-500 mt-1">Excluding exempt</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Avg Tax Rate</span>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{averageTaxRate.toFixed(2)}%</div>
          <p className="text-sm text-slate-500 mt-1">Effective rate</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex gap-2 p-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('quarterly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'quarterly' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Quarterly Report
            </button>
            <button
              onClick={() => setActiveTab('annual')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'annual' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Annual Report
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'settings' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SettingsIcon className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'quarterly' && (
            <QuarterlyTab
              year={selectedYear}
              quarter={selectedQuarter}
              onYearChange={setSelectedYear}
              onQuarterChange={setSelectedQuarter}
              data={quarterlyData}
              loading={loading}
            />
          )}
          {activeTab === 'annual' && <AnnualTab year={selectedYear} onYearChange={setSelectedYear} />}
          {activeTab === 'settings' && <TaxSettingsTab taxRates={taxRates} onUpdate={loadTaxRates} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Tax Compliance Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Nexus States</h3>
            <p className="text-sm text-blue-800 mb-3">
              States where your business collects sales tax
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Florida
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                California
              </span>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-2">Filing Schedule</h3>
            <p className="text-sm text-green-800 mb-3">
              Your business files quarterly tax returns
            </p>
            <div className="space-y-2 text-sm text-green-800">
              <div>Q1: Due April 30</div>
              <div>Q2: Due July 31</div>
              <div>Q3: Due October 31</div>
              <div>Q4: Due January 31</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-900 mb-2">Important Notes</h3>
        <ul className="space-y-2 text-sm text-yellow-800">
          <li>• Sales tax is automatically calculated based on customer location</li>
          <li>• Out-of-state sales are marked as tax-exempt unless nexus exists</li>
          <li>• All tax data can be exported to CSV for your CPA or accounting software</li>
          <li>• Keep records for at least 7 years for audit purposes</li>
        </ul>
      </div>
    </div>
  );
}

function QuarterlyTab({
  year,
  quarter,
  onYearChange,
  onQuarterChange,
  data,
  loading,
}: {
  year: number;
  quarter: number;
  onYearChange: (year: number) => void;
  onQuarterChange: (quarter: number) => void;
  data: any[];
  loading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Quarter</label>
          <select
            value={quarter}
            onChange={(e) => onQuarterChange(Number(e.target.value))}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value={1}>Q1 (Jan-Mar)</option>
            <option value={2}>Q2 (Apr-Jun)</option>
            <option value={3}>Q3 (Jul-Sep)</option>
            <option value={4}>Q4 (Oct-Dec)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No tax transactions for this period</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">State</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Total Sales</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Taxable Sales</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Tax Collected</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.stateCode} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-900 font-medium">{item.stateCode}</td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-right">
                    ${item.totalSales.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-right">
                    ${item.taxableSales.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                    ${item.taxCollected.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 text-right">{item.transactionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AnnualTab({ year, onYearChange }: { year: number; onYearChange: (year: number) => void }) {
  const [annualData, setAnnualData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnualData();
  }, [year]);

  async function loadAnnualData() {
    setLoading(true);
    const allQuarters = [];
    for (let q = 1; q <= 4; q++) {
      const data = await getQuarterlyTaxSummary(year, q);
      allQuarters.push(...data);
    }

    const byState = allQuarters.reduce((acc: any, item: any) => {
      if (!acc[item.stateCode]) {
        acc[item.stateCode] = {
          stateCode: item.stateCode,
          totalSales: 0,
          taxableSales: 0,
          taxCollected: 0,
          transactionCount: 0,
        };
      }
      acc[item.stateCode].totalSales += item.totalSales;
      acc[item.stateCode].taxableSales += item.taxableSales;
      acc[item.stateCode].taxCollected += item.taxCollected;
      acc[item.stateCode].transactionCount += item.transactionCount;
      return acc;
    }, {});

    setAnnualData(Object.values(byState));
    setLoading(false);
  }

  const totalTaxCollected = annualData.reduce((sum, item) => sum + item.taxCollected, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-600">Total Tax Collected ({year})</div>
          <div className="text-2xl font-bold text-slate-900">${totalTaxCollected.toFixed(2)}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : annualData.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No tax transactions for {year}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">State</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Total Sales</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Taxable Sales</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Tax Collected</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {annualData.map((item) => (
                <tr key={item.stateCode} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-900 font-medium">{item.stateCode}</td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-right">
                    ${item.totalSales.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-right">
                    ${item.taxableSales.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                    ${item.taxCollected.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 text-right">{item.transactionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TaxSettingsTab({ taxRates }: { taxRates: any[]; onUpdate: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Tax Rates by State</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">State</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Tax Rate</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Sales Channel</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {taxRates.map((rate) => (
                <tr key={rate.id} className="border-b border-slate-100">
                  <td className="py-3 px-4 text-sm text-slate-900">{rate.state_name}</td>
                  <td className="py-3 px-4 text-sm text-slate-900 font-medium">
                    {(Number(rate.tax_rate) * 100).toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{rate.sales_channel}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      {rate.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="font-medium text-slate-900 mb-2">CPA Export Format</h3>
        <p className="text-sm text-slate-600 mb-4">
          Tax reports are exported in CSV format compatible with QuickBooks, Xero, and most accounting
          software. Each export includes:
        </p>
        <ul className="space-y-1 text-sm text-slate-600">
          <li>• Transaction date and state</li>
          <li>• Sales channel and subtotal</li>
          <li>• Tax rate and tax amount</li>
          <li>• Exemption status and reason</li>
        </ul>
      </div>
    </div>
  );
}
