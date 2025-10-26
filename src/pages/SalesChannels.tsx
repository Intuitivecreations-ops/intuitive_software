import { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Upload,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Package,
  Link as LinkIcon,
  X,
  Check,
} from 'lucide-react';
import {
  getChannelOrders,
  getChannelOrderItems,
  getChannelFees,
  importEcwidOrders,
  parseEcwidCSV,
  parseEcwidJSON,
  matchOrderToInvoice,
  syncFeesToExpenses,
  syncInventory,
  getChannelStats,
  getChannelStatusColor,
  ChannelOrder,
  ChannelOrderItem,
  ChannelFee,
} from '../utils/channelIntegration';

export default function SalesChannels() {
  const [activeTab, setActiveTab] = useState<'orders' | 'fees' | 'inventory' | 'import'>('orders');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [orders, setOrders] = useState<ChannelOrder[]>([]);
  const [fees, setFees] = useState<ChannelFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalRevenue: number;
    orderCount: number;
    totalFees: number;
    netRevenue: number;
    pendingOrders: number;
  }>({ totalRevenue: 0, orderCount: 0, totalFees: 0, netRevenue: 0, pendingOrders: 0 });
  const [selectedOrder, setSelectedOrder] = useState<ChannelOrder | null>(null);
  const [orderItems, setOrderItems] = useState<ChannelOrderItem[]>([]);
  const [orderFees, setOrderFees] = useState<ChannelFee[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedChannel]);

  async function loadData() {
    setLoading(true);
    const channelFilter = selectedChannel === 'all' ? undefined : selectedChannel;

    const ordersData = await getChannelOrders(channelFilter);
    setOrders(ordersData);

    const feesData = await getChannelFees();
    setFees(feesData);

    const statsData = await getChannelStats(channelFilter);
    setStats(statsData);

    setLoading(false);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      let parsedOrders: unknown[] = [];

      if (file.name.endsWith('.csv')) {
        parsedOrders = parseEcwidCSV(content);
      } else if (file.name.endsWith('.json')) {
        parsedOrders = parseEcwidJSON(content);
      }

      if (parsedOrders.length > 0) {
        const imported = await importEcwidOrders(parsedOrders as any);
        alert(`Successfully imported ${imported} orders from Ecwid`);
        loadData();
      } else {
        alert('No orders found in file');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  }

  async function handleMatchOrder(orderId: string) {
    const invoiceId = await matchOrderToInvoice(orderId);
    if (invoiceId) {
      alert('Order matched to invoice successfully!');
      loadData();
    } else {
      alert('No matching invoice found');
    }
  }

  async function handleSyncFees(orderId: string) {
    const synced = await syncFeesToExpenses(orderId);
    alert(`Synced ${synced} fees to expenses`);
    loadData();
  }

  async function handleSyncInventory() {
    const channel = selectedChannel === 'all' ? 'AMAZON' : selectedChannel;
    const synced = await syncInventory(channel);
    alert(`Synced ${synced} products to ${channel}`);
  }

  async function loadOrderDetails(order: ChannelOrder) {
    setSelectedOrder(order);
    const items = await getChannelOrderItems(order.id);
    setOrderItems(items);
    const orderFeesData = await getChannelFees(order.id);
    setOrderFees(orderFeesData);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sales Channels</h1>
          <p className="text-slate-600 mt-1">Amazon, Ecwid, and marketplace integrations</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSyncInventory}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Inventory
          </button>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${stats.totalRevenue?.toFixed(2) || '0.00'}
          </div>
          <p className="text-sm text-slate-500 mt-1">{stats.orderCount || 0} orders</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Platform Fees</span>
            <TrendingUp className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${stats.totalFees?.toFixed(2) || '0.00'}
          </div>
          <p className="text-sm text-slate-500 mt-1">Amazon + Ecwid</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Net Revenue</span>
            <ShoppingBag className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${stats.netRevenue?.toFixed(2) || '0.00'}
          </div>
          <p className="text-sm text-slate-500 mt-1">After fees</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Pending Orders</span>
            <Package className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.pendingOrders || 0}</div>
          <p className="text-sm text-slate-500 mt-1">Need attention</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex items-center justify-between p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'orders' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveTab('fees')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'fees' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Fees
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'inventory'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Inventory
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'import' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Import
              </button>
            </div>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Channels</option>
              <option value="AMAZON">Amazon</option>
              <option value="ECWID">Ecwid</option>
              <option value="SHOPIFY">Shopify</option>
              <option value="EBAY">eBay</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              loading={loading}
              onSelectOrder={loadOrderDetails}
              onMatchOrder={handleMatchOrder}
              onSyncFees={handleSyncFees}
            />
          )}
          {activeTab === 'fees' && <FeesTab fees={fees} loading={loading} />}
          {activeTab === 'inventory' && <InventoryTab channel={selectedChannel} />}
          {activeTab === 'import' && <ImportTab onFileUpload={handleFileUpload} />}
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          items={orderItems}
          fees={orderFees}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

function OrdersTab({
  orders,
  loading,
  onSelectOrder,
  onMatchOrder,
  onSyncFees,
}: {
  orders: ChannelOrder[];
  loading: boolean;
  onSelectOrder: (order: ChannelOrder) => void;
  onMatchOrder: (orderId: string) => void;
  onSyncFees: (orderId: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No orders found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Order ID</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Channel</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Date</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Customer</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Total</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              onClick={() => onSelectOrder(order)}
            >
              <td className="py-3 px-4 text-sm font-medium text-slate-900">
                {order.channel_order_id}
              </td>
              <td className="py-3 px-4">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {order.channel}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-slate-600">
                {new Date(order.order_date).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-sm text-slate-900">{order.customer_name}</td>
              <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                ${order.total_amount.toFixed(2)}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getChannelStatusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {!order.linked_invoice_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMatchOrder(order.id);
                      }}
                      className="p-1 hover:bg-blue-100 rounded transition-colors"
                      title="Match to Invoice"
                    >
                      <LinkIcon className="w-4 h-4 text-blue-600" />
                    </button>
                  )}
                  {order.linked_invoice_id && (
                    <span className="text-xs text-green-600 font-medium">Linked</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSyncFees(order.id);
                    }}
                    className="p-1 hover:bg-green-100 rounded transition-colors"
                    title="Sync Fees"
                  >
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeesTab({ fees, loading }: { fees: ChannelFee[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const totalFees = fees.reduce((sum, fee) => sum + Math.abs(Number(fee.amount)), 0);

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="text-sm text-slate-600">Total Fees</div>
        <div className="text-2xl font-bold text-slate-900">${totalFees.toFixed(2)}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Channel</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Fee Type</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                Description
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Amount</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id} className="border-b border-slate-100">
                <td className="py-3 px-4 text-sm text-slate-600">
                  {new Date(fee.date).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {fee.channel}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-900">{fee.fee_type}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{fee.fee_description}</td>
                <td className="py-3 px-4 text-sm text-red-600 text-right font-medium">
                  -${Math.abs(fee.amount).toFixed(2)}
                </td>
                <td className="py-3 px-4">
                  {fee.linked_expense_id ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Synced
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      Pending
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryTab({ channel: _channel }: { channel: string }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Inventory Sync</h3>
        <p className="text-sm text-blue-800 mb-3">
          Sync your product inventory across all sales channels to prevent overselling.
        </p>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Amazon: Sync via Seller Central API</li>
          <li>• Ecwid: Manual CSV export/import</li>
          <li>• Real-time updates when products sell</li>
          <li>• Low stock alerts</li>
        </ul>
      </div>

      <div className="text-center py-8">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Inventory sync ready</p>
        <p className="text-sm text-slate-400 mt-1">Click "Sync Inventory" to update stock levels</p>
      </div>
    </div>
  );
}

function ImportTab({ onFileUpload }: { onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Import Ecwid Orders</h3>
        <p className="text-sm text-slate-600 mb-4">
          Upload a CSV or JSON file exported from Ecwid
        </p>
        <label className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
          <Upload className="w-5 h-5" />
          Choose File
          <input
            type="file"
            accept=".csv,.json"
            onChange={onFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How to Export from Ecwid</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li>1. Log in to your Ecwid admin panel</li>
          <li>2. Go to My Sales → Orders</li>
          <li>3. Click "Export" and select CSV or JSON format</li>
          <li>4. Download the file and upload it here</li>
        </ol>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-900 mb-2">Amazon Integration</h3>
        <p className="text-sm text-green-800 mb-3">
          Amazon orders are automatically synced via the Seller API. No manual import needed!
        </p>
        <p className="text-sm text-green-700">
          Configure your Amazon Seller Central API credentials in Settings to enable automatic sync.
        </p>
      </div>
    </div>
  );
}

function OrderDetailModal({
  order,
  items,
  fees,
  onClose,
}: {
  order: ChannelOrder;
  items: ChannelOrderItem[];
  fees: ChannelFee[];
  onClose: () => void;
}) {
  const totalFees = fees.reduce((sum, fee) => sum + Math.abs(Number(fee.amount)), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Order Details</h2>
              <p className="text-sm text-slate-600 mt-1">{order.channel_order_id}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
              <div className="text-slate-900">{order.customer_name}</div>
              <div className="text-sm text-slate-600">{order.customer_email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Order Date</label>
              <div className="text-slate-900">
                {new Date(order.order_date).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-slate-900 mb-3">Items</h3>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-700">Product</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-slate-700">Qty</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-slate-700">Price</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-slate-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-2 px-3 text-sm">
                      <div className="font-medium text-slate-900">{item.product_name}</div>
                      <div className="text-xs text-slate-500">SKU: {item.sku}</div>
                    </td>
                    <td className="py-2 px-3 text-sm text-slate-600 text-right">{item.quantity}</td>
                    <td className="py-2 px-3 text-sm text-slate-600 text-right">
                      ${item.unit_price.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-sm text-slate-900 text-right font-medium">
                      ${item.total_price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="text-slate-900">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax</span>
                <span className="text-slate-900">${order.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Shipping</span>
                <span className="text-slate-900">${order.shipping_amount.toFixed(2)}</span>
              </div>
              {totalFees > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Platform Fees</span>
                  <span className="text-red-600">-${totalFees.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2 mt-2">
                <span className="text-slate-900">Total</span>
                <span className="text-slate-900">${order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {fees.length > 0 && (
            <div>
              <h3 className="font-medium text-slate-900 mb-3">Fees</h3>
              <div className="space-y-2">
                {fees.map((fee) => (
                  <div key={fee.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{fee.fee_description}</span>
                    <span className="text-red-600">-${Math.abs(fee.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.linked_invoice_id && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-800">
                <Check className="w-5 h-5" />
                <span className="font-medium">Linked to Invoice</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
