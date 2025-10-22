import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function Signup({ onToggle }: { onToggle: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const { data: existingRequest } = await supabase
        .from('access_requests')
        .select('status')
        .eq('email', email)
        .maybeSingle();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          setError('You already have a pending access request. Please wait for approval.');
        } else if (existingRequest.status === 'approved') {
          setError('Your access has been approved! Please check your email for login instructions.');
        } else if (existingRequest.status === 'denied') {
          setError('Your previous access request was denied. Please contact support for assistance.');
        }
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('access_requests')
        .insert({
          email,
          name,
          message: message || null,
          status: 'pending',
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      console.error('Error submitting access request:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <img src="/Intuitive_creations_logo5.png" alt="Intuitive Creations" className="h-24 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Request Access</h1>
            <p className="text-slate-600">Join Intuitive Creations</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 mb-1">
                    Access request submitted successfully!
                  </p>
                  <p className="text-sm text-green-700">
                    An administrator will review your request and send you login credentials via email once approved.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-green-200">
                <Clock className="w-4 h-4 text-green-600" />
                <p className="text-xs text-green-700">
                  Typical approval time: 24-48 hours
                </p>
              </div>
            </div>
          )}

          {!success && (
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Access to Intuitive Creations is by approval only. Submit your request below and an administrator will review it shortly.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">
                    Why do you want to join? (optional)
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow resize-none"
                    placeholder="I'm interested in collaborating on innovative products..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Request Access
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <button
                onClick={onToggle}
                className="text-slate-900 font-medium hover:underline focus:outline-none"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
