import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Receipt,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Eye,
  BarChart3,
  Settings,
  Lightbulb,
  Archive,
  Calculator,
  Building2,
  ShoppingBag,
  Upload
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { signOut, profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
    { name: 'The Incubator', page: 'incubator', icon: Lightbulb },
    { name: 'Products', page: 'products', icon: Package },
    { name: 'Customers', page: 'customers', icon: Users },
    { name: 'Invoices', page: 'invoices', icon: FileText },
    { name: 'Expenses', page: 'expenses', icon: Receipt },
    { name: 'Sales Channels', page: 'sales-channels', icon: ShoppingBag },
    { name: 'Bank Feeds', page: 'bank-feeds', icon: Building2 },
    { name: 'Transactions', page: 'transactions', icon: TrendingUp },
    { name: 'Reports', page: 'reports', icon: BarChart3 },
    { name: 'Tax Reports', page: 'tax-reports', icon: Calculator },
    { name: 'Import CSV', page: 'csv-import', icon: Upload },
    { name: 'Zoho Archive', page: 'zoho-archive', icon: Archive },
    { name: 'Settings', page: 'settings', icon: Settings },
  ];

  async function handleSignOut(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    console.log('Sign out button clicked');
    try {
      await signOut();
    } catch (error) {
      console.error('Error in handleSignOut:', error);
      alert('Error signing out. Please refresh the page and try again.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6 flex-1">
              <img src="/Intuitive_creations_logo5.png" alt="Intuitive Creations" className="h-12 flex-shrink-0" />
              <div className="hidden lg:flex items-center gap-6 border-l border-slate-300 pl-6 flex-1">
                <div className="text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">Intuitive Creations, LLC DBA Clean Head</div>
                </div>
                <div className="text-xs text-slate-600">
                  <div>768 NE 13<sup>th</sup> Ct. #6</div>
                  <div>Fort Lauderdale, FL 33304</div>
                </div>
                <div className="text-xs text-slate-600">
                  <div>2831 E. Oakland Park Blvd.</div>
                  <div>Suite 9 PMB 1141</div>
                  <div>Fort Lauderdale, FL 33306-1803</div>
                </div>
                <div className="text-xs text-slate-600">
                  <div>954-228-3558</div>
                  <div>FEIN: 93-3121884</div>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                {profile?.role === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                ) : profile?.role === 'user' ? (
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-700" />
                )}
                <span className="text-sm font-medium text-slate-700">
                  {profile?.name}
                </span>
                <span className="text-xs text-slate-500">
                  ({profile?.role || 'loading...'})
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.page}
                  onClick={() => {
                    onNavigate(item.page);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    currentPage === item.page
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              ))}
              <div className="pt-3 mt-3 border-t border-slate-200">
                <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600">
                  {profile?.role === 'admin' ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  <span>{profile?.name} ({profile?.role})</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="flex">
        <aside className="hidden md:block w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentPage === item.page
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
