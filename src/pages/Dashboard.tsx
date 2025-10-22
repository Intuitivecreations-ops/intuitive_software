import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, TrendingUp, Package, Users, FileText, Receipt, ArrowUpRight, ArrowDownRight, Activity, AlertCircle } from 'lucide-react';

interface RecentActivity {
  id: string;
  type: 'invoice' | 'expense' | 'product' | 'customer';
  description: string;
  amount?: number;
  date: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalCustomers: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    revenueChange: 0,
    expenseChange: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; quantity: number; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const [
        { data: transactions },
        { data: expenses },
        { data: products },
        { data: customers },
        { data: invoices },
      ] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').order('date', { ascending: false }),
      ]);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const currentMonthRevenue = transactions
        ?.filter(t => {
          const date = new Date(t.date);
          return t.type === 'income' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      const lastMonthRevenue = transactions
        ?.filter(t => {
          const date = new Date(t.date);
          return t.type === 'income' && date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      const currentMonthExpenses = expenses
        ?.filter(e => {
          const date = new Date(e.date);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      const lastMonthExpenses = expenses
        ?.filter(e => {
          const date = new Date(e.date);
          return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      const revenue = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      const expenseTotal = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const lowStock = products?.filter(p => p.quantity_in_stock <= 5).length || 0;

      const revenueChange = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
      const expenseChange = lastMonthExpenses > 0 ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;

      setStats({
        totalRevenue: revenue,
        totalExpenses: expenseTotal,
        netIncome: revenue - expenseTotal,
        totalProducts: products?.length || 0,
        lowStockProducts: lowStock,
        totalCustomers: customers?.length || 0,
        pendingInvoices: invoices?.filter(i => i.status === 'unpaid').length || 0,
        overdueInvoices: invoices?.filter(i => i.status === 'overdue').length || 0,
        revenueChange,
        expenseChange,
      });

      const activity: RecentActivity[] = [];

      invoices?.slice(0, 3).forEach(invoice => {
        activity.push({
          id: invoice.id,
          type: 'invoice',
          description: `Invoice ${invoice.invoice_number} created`,
          amount: invoice.total_amount,
          date: invoice.date,
        });
      });

      expenses?.slice(0, 3).forEach(expense => {
        activity.push({
          id: expense.id,
          type: 'expense',
          description: expense.description,
          amount: expense.amount,
          date: expense.date,
        });
      });

      customers?.slice(0, 2).forEach(customer => {
        activity.push({
          id: customer.id,
          type: 'customer',
          description: `New customer: ${customer.name}`,
          date: customer.created_at,
        });
      });

      activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activity.slice(0, 8));

      const topProds = products
        ?.filter(p => p.sale_price && p.quantity_in_stock > 0)
        .map(p => ({
          name: p.name,
          quantity: p.quantity_in_stock,
          value: p.quantity_in_stock * (p.sale_price || 0),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5) || [];

      setTopProducts(topProds);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome to Intuitive Creations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          bgColor="bg-gradient-to-br from-green-500 to-green-600"
          change={stats.revenueChange}
        />
        <StatCard
          title="Total Expenses"
          value={`$${stats.totalExpenses.toFixed(2)}`}
          icon={<Receipt className="w-6 h-6" />}
          bgColor="bg-gradient-to-br from-red-500 to-red-600"
          change={stats.expenseChange}
        />
        <StatCard
          title="Net Income"
          value={`$${stats.netIncome.toFixed(2)}`}
          icon={<TrendingUp className="w-6 h-6" />}
          bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Products"
          value={stats.totalProducts.toString()}
          subtitle={stats.lowStockProducts > 0 ? `${stats.lowStockProducts} low stock` : 'All stocked'}
          icon={<Package className="w-6 h-6" />}
          bgColor="bg-gradient-to-br from-slate-700 to-slate-800"
          alert={stats.lowStockProducts > 0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickStatCard
          title="Customers"
          value={stats.totalCustomers}
          icon={<Users className="w-5 h-5" />}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <QuickStatCard
          title="Pending Invoices"
          value={stats.pendingInvoices}
          icon={<FileText className="w-5 h-5" />}
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        <QuickStatCard
          title="Overdue Invoices"
          value={stats.overdueInvoices}
          icon={<AlertCircle className="w-5 h-5" />}
          color="text-red-600"
          bgColor="bg-red-50"
          alert={stats.overdueInvoices > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{activity.description}</p>
                    <p className="text-xs text-slate-500">{new Date(activity.date).toLocaleDateString()}</p>
                  </div>
                  {activity.amount && (
                    <span className={`text-sm font-semibold ${
                      activity.type === 'invoice' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {activity.type === 'invoice' ? '+' : '-'}${activity.amount.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Top Products by Value</h2>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No products available</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.quantity} units in stock</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">
                    ${product.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  bgColor,
  change,
  alert,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  bgColor: string;
  change?: number;
  alert?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className={`text-xs mt-1 ${alert ? 'text-orange-600 font-medium' : 'text-slate-500'}`}>
              {alert && <AlertCircle className="w-3 h-3 inline mr-1" />}
              {subtitle}
            </p>
          )}
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(change).toFixed(1)}% vs last month
            </div>
          )}
        </div>
        <div className={`${bgColor} text-white p-3 rounded-lg shadow-sm`}>{icon}</div>
      </div>
    </div>
  );
}

function QuickStatCard({
  title,
  value,
  icon,
  color,
  bgColor,
  alert,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  alert?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
        </div>
        <div className={`${bgColor} ${color} p-3 rounded-lg`}>{icon}</div>
      </div>
    </div>
  );
}
