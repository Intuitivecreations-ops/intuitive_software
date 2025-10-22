import { useState, useEffect } from 'react';
import { ShoppingBag, Save, Check, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AmazonSettings() {
  const [credentials, setCredentials] = useState({
    refresh_token: '',
    client_id: '',
    client_secret: '',
    marketplace_id: 'ATVPDKIKX0DER',
    selling_partner_id: '',
  });
  const [isActive, setIsActive] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data } = await supabase
      .from('channel_settings')
      .select('*')
      .eq('channel', 'AMAZON')
      .maybeSingle();

    if (data) {
      setIsActive(data.is_active || false);
      setAutoSync(data.auto_sync_orders || false);
      setLastSync(data.last_sync_at);
      if (data.api_credentials) {
        setCredentials({
          refresh_token: data.api_credentials.refresh_token || '',
          client_id: data.api_credentials.client_id || '',
          client_secret: data.api_credentials.client_secret || '',
          marketplace_id: data.api_credentials.marketplace_id || 'ATVPDKIKX0DER',
          selling_partner_id: data.api_credentials.selling_partner_id || '',
        });
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('channel_settings')
        .update({
          is_active: isActive,
          auto_sync_orders: autoSync,
          api_credentials: credentials,
          updated_at: new Date().toISOString(),
        })
        .eq('channel', 'AMAZON');

      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/amazon-sync?action=sync-orders`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();

      await supabase
        .from('channel_settings')
        .update({
          last_sync_at: new Date().toISOString(),
        })
        .eq('channel', 'AMAZON');

      setLastSync(new Date().toISOString());
      alert(`Synced! Imported: ${result.imported}, Updated: ${result.updated}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Amazon Seller Central</h2>
            <p className="text-sm text-slate-600">Configure your Amazon SP-API integration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Status:</span>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Error</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Setup Instructions</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li>
            1. Go to{' '}
            <a
              href="https://sellercentral.amazon.com/apps/authorize/consent"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-900"
            >
              Amazon Seller Central → Apps & Services
              <ExternalLink className="w-3 h-3 inline ml-1" />
            </a>
          </li>
          <li>2. Register your application in the Developer Console</li>
          <li>3. Get your LWA credentials (Client ID, Client Secret)</li>
          <li>4. Complete the OAuth flow to get your Refresh Token</li>
          <li>5. Enter all credentials below and click Save</li>
        </ol>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Client ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={credentials.client_id}
            onChange={(e) => setCredentials({ ...credentials, client_id: e.target.value })}
            placeholder="amzn1.application-oa2-client.xxxxx"
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Client Secret <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={credentials.client_secret}
            onChange={(e) => setCredentials({ ...credentials, client_secret: e.target.value })}
            placeholder="Enter your client secret"
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Refresh Token <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={credentials.refresh_token}
            onChange={(e) => setCredentials({ ...credentials, refresh_token: e.target.value })}
            placeholder="Atzr|xxxxx"
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <p className="text-sm text-slate-500 mt-1">
            Obtained through the OAuth authorization flow
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Marketplace ID</label>
          <select
            value={credentials.marketplace_id}
            onChange={(e) => setCredentials({ ...credentials, marketplace_id: e.target.value })}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="ATVPDKIKX0DER">United States (ATVPDKIKX0DER)</option>
            <option value="A2EUQ1WTGCTBG2">Canada (A2EUQ1WTGCTBG2)</option>
            <option value="A1AM78C64UM0Y8">Mexico (A1AM78C64UM0Y8)</option>
            <option value="A1RKKUPIHCS9HS">Spain (A1RKKUPIHCS9HS)</option>
            <option value="A1F83G8C2ARO7P">UK (A1F83G8C2ARO7P)</option>
            <option value="A13V1IB3VIYZZH">France (A13V1IB3VIYZZH)</option>
            <option value="APJ6JRA9NG5V4">Italy (APJ6JRA9NG5V4)</option>
            <option value="A1PA6795UKMFR9">Germany (A1PA6795UKMFR9)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Selling Partner ID
          </label>
          <input
            type="text"
            value={credentials.selling_partner_id}
            onChange={(e) =>
              setCredentials({ ...credentials, selling_partner_id: e.target.value })
            }
            placeholder="A1234567890ABC"
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-slate-900">Enable Integration</h3>
            <p className="text-sm text-slate-600">Activate Amazon Seller Central sync</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-slate-900">Auto-Sync Orders</h3>
            <p className="text-sm text-slate-600">Automatically sync orders every hour</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
          </label>
        </div>
      </div>

      {lastSync && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600">
            Last synced: {new Date(lastSync).toLocaleString()}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !credentials.client_id || !credentials.client_secret || !credentials.refresh_token}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <Check className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Credentials'}
        </button>

        {isActive && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
}
