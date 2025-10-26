import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Calendar, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export default function Reports() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryExpenses, setCategoryExpenses] = useState<Array<{ category: string; amount: number }>>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportsData();
  }, [dateRange]);

  async function fetchReportsData() {
    setLoading(true);
    try {
      const [{ data: transactions }, { data: expenses }] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .gte('date', dateRange.start)
          .lte('date', dateRange.end)
          .order('date', { ascending: true }),
        supabase
          .from('expenses')
          .select('*')
          .gte('date', dateRange.start)
          .lte('date', dateRange.end)
          .order('date', { ascending: true }),
      ]);

      const monthlyMap = new Map<string, { revenue: number; expenses: number }>();

      transactions?.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { revenue: 0, expenses: 0 });
        }

        const data = monthlyMap.get(monthKey)!;
        if (transaction.type === 'income') {
          data.revenue += transaction.amount;
        } else if (transaction.type === 'expense') {
          data.expenses += transaction.amount;
        }
      });

      expenses?.forEach(expense => {
        const date = new Date(expense.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { revenue: 0, expenses: 0 });
        }

        const data = monthlyMap.get(monthKey)!;
        data.expenses += expense.amount;
      });

      const monthlyDataArray = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.revenue - data.expenses,
        }))
        .sort((a, b) => {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateA.getTime() - dateB.getTime();
        });

      setMonthlyData(monthlyDataArray);

      const categoryMap = new Map<string, number>();
      expenses?.forEach(expense => {
        const category = expense.category || 'Uncategorized';
        categoryMap.set(category, (categoryMap.get(category) || 0) + expense.amount);
      });

      const categoryArray = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

      setCategoryExpenses(categoryArray);
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    const headers = ['Month', 'Revenue', 'Expenses', 'Profit'];
    const rows = monthlyData.map(d => [d.month, d.revenue.toFixed(2), d.expenses.toFixed(2), d.profit.toFixed(2)]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const totalRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = monthlyData.reduce((sum, d) => sum + d.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const avgMonthlyRevenue = monthlyData.length > 0 ? totalRevenue / monthlyData.length : 0;
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-slate-600 mt-1">Analyze your business performance</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={monthlyData.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Date Range</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-2">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-2">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <SummaryCard
          title="Total Expenses"
          value={`$${totalExpenses.toFixed(2)}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-red-600"
          bgColor="bg-red-50"
        />
        <SummaryCard
          title="Net Profit"
          value={`$${totalProfit.toFixed(2)}`}
          icon={<BarChart3 className="w-5 h-5" />}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <SummaryCard
          title="Avg Monthly Revenue"
          value={`$${avgMonthlyRevenue.toFixed(2)}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-slate-600"
          bgColor="bg-slate-50"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Monthly Performance</h2>
        </div>
        {monthlyData.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No data available for selected date range</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Month</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Expenses</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Profit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monthlyData.map((data, index) => {
                  const profitMargin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
                  return (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{data.month}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                        ${data.revenue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                        ${data.expenses.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        <span className={data.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}>
                          ${data.profit.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className={`h-2 rounded-full ${
                                data.profit >= 0 ? 'bg-blue-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${Math.min(Math.abs((data.revenue / maxRevenue) * 100), 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            profitMargin >= 0 ? 'text-blue-600' : 'text-orange-600'
                          }`}>
                            {profitMargin.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {categoryExpenses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Expenses by Category</h2>
          </div>
          <div className="space-y-4">
            {categoryExpenses.map((cat, index) => {
              const percentage = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">{cat.category}</span>
                    <span className="text-sm font-semibold text-slate-900">${cat.amount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{percentage.toFixed(1)}% of total expenses</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
  bgColor,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`${bgColor} ${color} p-3 rounded-lg`}>{icon}</div>
      </div>
    </div>
  );
}
