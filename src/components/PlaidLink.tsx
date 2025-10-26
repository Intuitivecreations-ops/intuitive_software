import { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { supabase } from '../lib/supabase';
import { Plus, Loader2 } from 'lucide-react';

interface PlaidLinkProps {
  onSuccess: () => void;
}

export default function PlaidLink({ onSuccess }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createLinkToken();
  }, []);

  async function createLinkToken() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plaid-create-link-token`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userData.user.id,
        }),
      });

      const data = await response.json();

      if (data.link_token) {
        setLinkToken(data.link_token);
      } else {
        throw new Error(data.error || 'Failed to create link token');
      }
    } catch (error: any) {
      console.error('Error creating link token:', error);
      alert('Failed to initialize Plaid. Please check your Plaid API keys.');
    } finally {
      setLoading(false);
    }
  }

  async function onPlaidSuccess(public_token: string, metadata: any) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plaid-exchange-token`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token,
          user_id: userData.user.id,
          metadata,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Bank account connected successfully!');
        onSuccess();
      } else {
        throw new Error(data.error || 'Failed to exchange token');
      }
    } catch (error: any) {
      console.error('Error exchanging token:', error);
      alert('Failed to connect bank account. Please try again.');
    }
  }

  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => {
      console.log('Plaid Link exited');
    },
  };

  const { open, ready } = usePlaidLink(config);

  if (loading) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Initializing...
      </button>
    );
  }

  return (
    <button
      onClick={() => open()}
      disabled={!ready || !linkToken}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Plus className="w-4 h-4" />
      Connect Bank Account
    </button>
  );
}
