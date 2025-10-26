import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  UserCheck,
  UserX,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

interface AccessRequest {
  id: string;
  email: string;
  name: string;
  message: string | null;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user_id: string | null;
}

export default function AccessRequestsSettings() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching access requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(request: AccessRequest) {
    setProcessingId(request.id);

    try {
      const tempPassword = generateTempPassword();

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: request.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: request.name,
        },
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          approved: true,
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      const { error: requestError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
          user_id: authData.user.id,
        })
        .eq('id', request.id);

      if (requestError) throw requestError;

      alert(
        `Access approved! Send these credentials to ${request.email}:\n\nEmail: ${request.email}\nTemporary Password: ${tempPassword}\n\nThey should change this password after first login.`
      );

      fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(`Failed to approve request: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDeny(request: AccessRequest) {
    if (!confirm(`Are you sure you want to deny access for ${request.name}?`)) {
      return;
    }

    setProcessingId(request.id);

    try {
      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'denied',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', request.id);

      if (error) throw error;

      fetchRequests();
    } catch (error: any) {
      console.error('Error denying request:', error);
      alert(`Failed to deny request: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  }

  function generateTempPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  const filteredRequests = requests.filter(
    r => filter === 'all' || r.status === filter
  );

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Access Requests</h2>
          <p className="text-sm text-slate-600 mt-1">
            Review and approve access requests from new users
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{pendingCount} pending</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All ({requests.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'approved'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Approved ({requests.filter(r => r.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilter('denied')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'denied'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Denied ({requests.filter(r => r.status === 'denied').length})
        </button>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No {filter !== 'all' ? filter : ''} requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(request => (
            <div
              key={request.id}
              className="bg-slate-50 rounded-lg p-5 border border-slate-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {request.name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                        request.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : request.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {request.status === 'pending' && <Clock className="w-3 h-3" />}
                      {request.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                      {request.status === 'denied' && <XCircle className="w-3 h-3" />}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-slate-600 mb-3">
                    <Mail className="w-4 h-4" />
                    <span>{request.email}</span>
                  </div>

                  {request.message && (
                    <div className="flex items-start gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700">{request.message}</p>
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    Requested {new Date(request.requested_at).toLocaleString()}
                    {request.reviewed_at && (
                      <> · Reviewed {new Date(request.reviewed_at).toLocaleString()}</>
                    )}
                  </p>
                </div>

                {request.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={processingId === request.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      <UserCheck className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(request)}
                      disabled={processingId === request.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      <UserX className="w-4 h-4" />
                      Deny
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Admin Access Control</p>
            <p>
              When you approve a request, a temporary password will be generated. You'll need to
              send these credentials to the user manually. Only existing admins can promote users
              to admin role after approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
