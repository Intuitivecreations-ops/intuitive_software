import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Building2, Bell, Shield, Save, UserCheck, Database, ShoppingBag } from 'lucide-react';
import AccessRequestsSettings from '../components/AccessRequestsSettings';
import AmazonSettings from '../components/AmazonSettings';

export default function Settings() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'notifications' | 'security' | 'access' | 'zoho' | 'amazon'>('profile');
  const [saved, setSaved] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const tabs = [
    { id: 'profile' as const, name: 'Profile', icon: User },
    { id: 'company' as const, name: 'Company', icon: Building2 },
    { id: 'notifications' as const, name: 'Notifications', icon: Bell },
    { id: 'security' as const, name: 'Security', icon: Shield },
    ...(isAdmin ? [{ id: 'access' as const, name: 'Access Requests', icon: UserCheck }] : []),
    ...(isAdmin ? [{ id: 'amazon' as const, name: 'Amazon API', icon: ShoppingBag }] : []),
    ...(isAdmin ? [{ id: 'zoho' as const, name: 'Zoho Import', icon: Database }] : []),
  ];

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account and preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex gap-2 p-2 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && <ProfileSettings profile={profile} onSave={handleSave} saved={saved} />}
          {activeTab === 'company' && <CompanySettings onSave={handleSave} saved={saved} />}
          {activeTab === 'notifications' && <NotificationSettings onSave={handleSave} saved={saved} />}
          {activeTab === 'security' && <SecuritySettings onSave={handleSave} saved={saved} />}
          {activeTab === 'access' && isAdmin && <AccessRequestsSettings />}
          {activeTab === 'amazon' && isAdmin && <AmazonSettings />}
          {activeTab === 'zoho' && isAdmin && <ZohoImportTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({ profile, onSave, saved }: { profile: any; onSave: () => void; saved: boolean }) {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: '',
    title: '',
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
              Job Title
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="e.g., Accountant"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        {saved && (
          <p className="text-sm text-green-600 font-medium">Settings saved successfully!</p>
        )}
        <button
          onClick={onSave}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}

function CompanySettings({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [formData, setFormData] = useState({
    companyName: 'Intuitive Creations LLC',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    taxId: '',
    website: 'www.intuitivecreations.net',
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Company Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-2">
              Company Name
            </label>
            <input
              id="companyName"
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
              Address
            </label>
            <input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Street address"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-2">
              City
            </label>
            <input
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-2">
              State
            </label>
            <input
              id="state"
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="zip" className="block text-sm font-medium text-slate-700 mb-2">
              ZIP Code
            </label>
            <input
              id="zip"
              type="text"
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-2">
              Country
            </label>
            <input
              id="country"
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="taxId" className="block text-sm font-medium text-slate-700 mb-2">
              Tax ID
            </label>
            <input
              id="taxId"
              type="text"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="EIN or Tax ID"
            />
          </div>
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-slate-700 mb-2">
              Website
            </label>
            <input
              id="website"
              type="text"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        {saved && (
          <p className="text-sm text-green-600 font-medium">Settings saved successfully!</p>
        )}
        <button
          onClick={onSave}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}

function NotificationSettings({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [settings, setSettings] = useState({
    emailInvoices: true,
    emailExpenses: false,
    emailLowStock: true,
    pushInvoices: false,
    pushExpenses: false,
    pushLowStock: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Notification Preferences</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-3">Email Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <span className="text-sm text-slate-700">New invoices created</span>
                <input
                  type="checkbox"
                  checked={settings.emailInvoices}
                  onChange={(e) => setSettings({ ...settings, emailInvoices: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <span className="text-sm text-slate-700">New expenses added</span>
                <input
                  type="checkbox"
                  checked={settings.emailExpenses}
                  onChange={(e) => setSettings({ ...settings, emailExpenses: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <span className="text-sm text-slate-700">Low stock alerts</span>
                <input
                  type="checkbox"
                  checked={settings.emailLowStock}
                  onChange={(e) => setSettings({ ...settings, emailLowStock: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-3">Push Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <span className="text-sm text-slate-700">New invoices created</span>
                <input
                  type="checkbox"
                  checked={settings.pushInvoices}
                  onChange={(e) => setSettings({ ...settings, pushInvoices: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <span className="text-sm text-slate-700">New expenses added</span>
                <input
                  type="checkbox"
                  checked={settings.pushExpenses}
                  onChange={(e) => setSettings({ ...settings, pushExpenses: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <span className="text-sm text-slate-700">Low stock alerts</span>
                <input
                  type="checkbox"
                  checked={settings.pushLowStock}
                  onChange={(e) => setSettings({ ...settings, pushLowStock: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        {saved && (
          <p className="text-sm text-green-600 font-medium">Settings saved successfully!</p>
        )}
        <button
          onClick={onSave}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}

function SecuritySettings({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h2>
        <div className="space-y-5 max-w-md">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-2">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        {saved && (
          <p className="text-sm text-green-600 font-medium">Password changed successfully!</p>
        )}
        <button
          onClick={onSave}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Save className="w-4 h-4" />
          Change Password
        </button>
      </div>
    </div>
  );
}

interface ImportResults {
  expenses: { success: number; errors: unknown[] };
  invoices: { success: number; errors: unknown[] };
  recurring: { success: number; errors: unknown[] };
}

function ZohoImportTab() {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);

  async function handleAutoImport() {
    setImporting(true);
    setResults(null);

    try {
      const { importZohoExpenses, importZohoInvoices, importZohoRecurringExpenses } = await import('../utils/zohoImport');

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
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Zoho Books Data Import</h2>
        <p className="text-sm text-slate-600 mb-6">
          Import your historical data from Zoho Books into Clean Head's archive system.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">What will be imported:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• 67 Expense records (Mar - Oct 2025)</li>
            <li>• 13 Invoice records with line items</li>
            <li>• 4 Recurring expense subscriptions</li>
          </ul>
        </div>

        <button
          onClick={handleAutoImport}
          disabled={importing}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            importing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {importing ? (
            <span className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Importing...</span>
            </span>
          ) : (
            'Start Import'
          )}
        </button>
      </div>

      {results && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <h3 className="font-medium text-slate-900">Import Results</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="font-medium text-green-900">Expenses</p>
                <p className="text-sm text-green-700">{results.expenses.success} records imported</p>
              </div>
              {results.expenses.errors.length > 0 && (
                <span className="text-sm text-red-600">{results.expenses.errors.length} errors</span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="font-medium text-green-900">Invoices</p>
                <p className="text-sm text-green-700">{results.invoices.success} records imported</p>
              </div>
              {results.invoices.errors.length > 0 && (
                <span className="text-sm text-red-600">{results.invoices.errors.length} errors</span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="font-medium text-green-900">Recurring Expenses</p>
                <p className="text-sm text-green-700">{results.recurring.success} records imported</p>
              </div>
              {results.recurring.errors.length > 0 && (
                <span className="text-sm text-red-600">{results.recurring.errors.length} errors</span>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-slate-700">
              ✅ Your Zoho data has been imported and is available in the system.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
