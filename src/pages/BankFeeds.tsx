import { useState, useEffect } from 'react';
import {
  Building2,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Search,
  ChevronRight,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getBankAccounts,
  getBankTransactions,
  approveBankTransaction,
  rejectBankTransaction,
  syncTransactionToExpense,
  autoCategorizePendingTransactions,
  formatCurrency,
  getTransactionStatusColor,
  getConfidenceColor,
  BankAccount,
  BankTransaction,
} from '../utils/bankIntegration';
import PlaidLink from '../components/PlaidLink';

export default function BankFeeds() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedAccount, statusFilter]);

  async function loadData() {
    setLoading(true);
    const accountsData = await getBankAccounts();
    setAccounts(accountsData);

    const transactionsData = await getBankTransactions(
      selectedAccount === 'all' ? undefined : selectedAccount,
      statusFilter === 'all' ? undefined : statusFilter
    );
    setTransactions(transactionsData);
    setLoading(false);
  }

  async function handleAutoCategor() {
    setCategorizing(true);
    const count = await autoCategorizePendingTransactions();
    setCategorizing(false);
    alert(`Categorized ${count} transactions`);
    loadData();
  }

  async function handleApprove(transaction: BankTransaction, category: string) {
    if (!profile) return;
    const success = await approveBankTransaction(transaction.id, category, profile.id);
    if (success) {
      loadData();
    }
  }

  async function handleReject(transactionId: string) {
    if (!profile) return;
    const success = await rejectBankTransaction(transactionId, profile.id);
    if (success) {
      loadData();
    }
  }

  async function handleSync(transactionId: string) {
    setSyncing(true);
    const expenseId = await syncTransactionToExpense(transactionId);
    setSyncing(false);
    if (expenseId) {
      alert('Transaction synced to expenses!');
      loadData();
    } else {
      alert('Failed to sync transaction');
    }
  }

  const filteredTransactions = transactions.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.merchant_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = transactions.filter((t) => t.status === 'pending').length;
  const approvedCount = transactions.filter((t) => t.status === 'approved').length;
  const syncedCount = transactions.filter((t) => t.status === 'synced').length;

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bank Feeds</h1>
          <p className="text-slate-600 mt-1">Connect and sync your bank accounts</p>
        </div>
        <div className="flex gap-3">
          <PlaidLink onSuccess={loadData} />
          {accounts.length > 0 && (
            <>
              <button
                onClick={handleAutoCategor}
                disabled={categorizing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${categorizing ? 'animate-spin' : ''}`} />
                Auto-Categorize
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No Bank Accounts Connected</h2>
          <p className="text-slate-600 mb-6">
            Connect your Novo and Wells Fargo accounts to automatically sync transactions and manage expenses.
          </p>
          <PlaidLink onSuccess={loadData} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600 text-sm font-medium">Total Balance</span>
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalBalance)}</div>
              <p className="text-sm text-slate-500 mt-1">{accounts.length} connected accounts</p>
            </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Pending Review</span>
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{pendingCount}</div>
          <p className="text-sm text-slate-500 mt-1">Awaiting approval</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Approved</span>
            <Check className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{approvedCount}</div>
          <p className="text-sm text-slate-500 mt-1">Ready to sync</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm font-medium">Synced</span>
            <LinkIcon className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{syncedCount}</div>
          <p className="text-sm text-slate-500 mt-1">In ledger</p>
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Connected Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors cursor-pointer"
                onClick={() => setSelectedAccount(account.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-slate-900">{account.account_name}</h3>
                    <p className="text-sm text-slate-600">{account.institution_name}</p>
                  </div>
                  <Building2 className="w-5 h-5 text-slate-400" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(Number(account.current_balance))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {account.account_type} •••• {account.mask}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="synced">Synced</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No transactions found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Merchant</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Confidence</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {transaction.merchant_name || transaction.name}
                        </div>
                        {transaction.pending && (
                          <span className="text-xs text-orange-600">Pending</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span
                        className={`font-medium ${
                          transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {transaction.approved_category || transaction.suggested_category || 'Uncategorized'}
                    </td>
                    <td className="py-3 px-4">
                      {transaction.confidence_score && (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(
                            transaction.confidence_score
                          )}`}
                        >
                          {Math.round(transaction.confidence_score * 100)}%
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTransactionStatusColor(
                          transaction.status
                        )}`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {transaction.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(
                                  transaction,
                                  transaction.suggested_category || 'Uncategorized'
                                );
                              }}
                              className="p-1 hover:bg-green-100 rounded transition-colors"
                              title="Approve"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(transaction.id);
                              }}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}
                        {transaction.status === 'approved' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSync(transaction.id);
                            }}
                            disabled={syncing}
                            className="p-1 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                            title="Sync to Expenses"
                          >
                            <LinkIcon className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransaction(transaction);
                          }}
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onApprove={(category) => handleApprove(selectedTransaction, category)}
          onReject={() => handleReject(selectedTransaction.id)}
          onSync={() => handleSync(selectedTransaction.id)}
        />
      )}
      </>
      )}
    </div>
  );
}

function TransactionDetailModal({
  transaction,
  onClose,
  onApprove,
  onReject,
  onSync,
}: {
  transaction: BankTransaction;
  onClose: () => void;
  onApprove: (category: string) => void;
  onReject: () => void;
  onSync: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState(
    transaction.approved_category || transaction.suggested_category || 'Uncategorized'
  );

  const categories = [
    'Cost of Goods Sold',
    'Office Supplies',
    'Advertising And Marketing',
    'IT and Internet Expenses',
    'MARKETING',
    'Telephone Expense',
    'SHIPPING',
    'LEGAL',
    'BUSINESS INSURANCE',
    'Fuel/Mileage Expenses',
    'Employee Advance',
    'INDEPENDANT CONTRACTORS',
    'Uncategorized',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Transaction Details</h2>
              <p className="text-sm text-slate-600 mt-1">
                {new Date(transaction.date).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Merchant</label>
            <div className="text-lg font-semibold text-slate-900">
              {transaction.merchant_name || transaction.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
              <div
                className={`text-2xl font-bold ${
                  transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {formatCurrency(transaction.amount)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTransactionStatusColor(
                  transaction.status
                )}`}
              >
                {transaction.status}
              </span>
            </div>
          </div>

          {transaction.status === 'pending' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {transaction.confidence_score && (
                <p className="text-sm text-slate-600 mt-2">
                  AI Confidence: {Math.round(transaction.confidence_score * 100)}%
                </p>
              )}
            </div>
          )}

          {transaction.approved_category && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Approved Category
              </label>
              <div className="text-lg font-medium text-slate-900">{transaction.approved_category}</div>
            </div>
          )}

          {transaction.plaid_transaction_id && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Transaction ID
              </label>
              <div className="text-sm text-slate-600 font-mono">{transaction.plaid_transaction_id}</div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
          {transaction.status === 'pending' && (
            <>
              <button
                onClick={() => {
                  onApprove(selectedCategory);
                  onClose();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => {
                  onReject();
                  onClose();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </>
          )}
          {transaction.status === 'approved' && (
            <button
              onClick={() => {
                onSync();
                onClose();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              Sync to Expenses
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
