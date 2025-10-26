import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Incubator from './pages/Incubator';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ZohoImport from './pages/ZohoImport';
import ZohoArchive from './pages/ZohoArchive';
import TaxReports from './pages/TaxReports';
import BankFeeds from './pages/BankFeeds';
import SalesChannels from './pages/SalesChannels';
import CSVImport from './pages/CSVImport';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { LogOut } from 'lucide-react';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showSignup, setShowSignup] = useState(false);
  const { user, isApproved, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) {
    return showSignup ? (
      <Signup onToggle={() => setShowSignup(false)} />
    ) : (
      <Login onToggle={() => setShowSignup(true)} />
    );
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <img src="/Intuitive_creations_logo5.png" alt="Intuitive Creations" className="h-24 mx-auto mb-6" />
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Awaiting Approval</h1>
          <p className="text-slate-600 mb-2">
            Your account is currently pending administrator approval.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            You'll receive an email once your access has been approved. This typically takes 24-48 hours.
          </p>
          <button
            onClick={(e) => {
              e.preventDefault();
              signOut();
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'incubator':
        return <Incubator />;
      case 'products':
        return <Products />;
      case 'customers':
        return <Customers />;
      case 'invoices':
        return <Invoices />;
      case 'expenses':
        return <Expenses />;
      case 'transactions':
        return <Transactions />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'zoho-import':
        return <ZohoImport />;
      case 'zoho-archive':
        return <ZohoArchive />;
      case 'tax-reports':
        return <TaxReports />;
      case 'bank-feeds':
        return <BankFeeds />;
      case 'sales-channels':
        return <SalesChannels />;
      case 'csv-import':
        return <CSVImport />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
