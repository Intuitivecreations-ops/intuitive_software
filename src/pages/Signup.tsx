import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function Signup({ onToggle }: { onToggle: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  async function checkAccessStatus() {
    if (!email) {
      setIsApproved(false);
      setError('');
      return;
    }

    try {
      // Check access request status
      const { data: existingRequest, error: fetchError } = await supabase
        .from('access_requests')
        .select('status')
        .eq('email', email)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking access status:', fetchError);
        setIsApproved(false);
        setError('');
        return;
      }

      console.log('Access check result:', existingRequest);

      if (existingRequest?.status === 'approved') {
        // Check if user already has an account
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (profile) {
          // User already has an account
          console.log('User account already exists');
          setIsApproved(false);
          setError('An account with this email already exists. Please use the Sign In page.');
        } else {
          // User is approved but hasn't created account yet
          console.log('Setting isApproved to TRUE - user can create account');
          setIsApproved(true);
          setError('');
        }
      } else if (existingRequest?.status === 'pending') {
        setError('You have a pending access request. Please wait for approval.');
        setIsApproved(false);
      } else if (existingRequest?.status === 'denied') {
        setError('Your access request was denied. Please contact support.');
        setIsApproved(false);
      } else {
        console.log('No request found, setting isApproved to FALSE');
        setIsApproved(false);
        setError('');
      }
    } catch (err) {
      console.error('Exception checking access status:', err);
      setIsApproved(false);
      setError('');
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkAccessStatus();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const { data: existingRequest } = await supabase
        .from('access_requests')
        .select('status, name')
        .eq('email', email)
        .maybeSingle();

      if (existingRequest?.status === 'approved') {
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            name: existingRequest.name,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create account');
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // Successfully created account and signed in
        setAccountCreated(true);
        setSuccess(false);
        setError('');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
        return;
      }

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          setError('You already have a pending access request. Please wait for approval.');
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
            <img src="/IC_TOP_CH_COMBINED.png" alt="Clean Head" className="h-24 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Request Access</h1>
            <p className="text-slate-600">Join Intuitive Creations</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {accountCreated && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 mb-1">
                    Account created successfully!
                  </p>
                  <p className="text-sm text-green-700">
                    Redirecting you to the dashboard...
                  </p>
                </div>
              </div>
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

          {!success && !accountCreated && (
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  {isApproved
                    ? 'Your access has been approved! Create your password to complete account setup.'
                    : 'Access to Intuitive Creations is by approval only. Submit your request below and an administrator will review it shortly.'
                  }
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isApproved && (
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
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={checkAccessStatus}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                    placeholder="you@example.com"
                  />
                </div>

                {isApproved && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                      Create Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow"
                      placeholder="At least 6 characters"
                    />
                  </div>
                )}

                {!isApproved && (
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
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {isApproved ? 'Creating Account...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      {isApproved ? 'Create Account' : 'Request Access'}
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
