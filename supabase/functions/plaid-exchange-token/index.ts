import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { public_token, user_id, metadata } = await req.json();

    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error('Plaid credentials not configured');
    }

    const plaidHost = PLAID_ENV === 'production' 
      ? 'https://production.plaid.com' 
      : PLAID_ENV === 'development'
      ? 'https://development.plaid.com'
      : 'https://sandbox.plaid.com';

    const exchangeResponse = await fetch(`${plaidHost}/item/public_token/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify({
        public_token,
      }),
    });

    const exchangeData = await exchangeResponse.json();

    if (exchangeData.error_code) {
      throw new Error(exchangeData.error_message || 'Failed to exchange token');
    }

    const access_token = exchangeData.access_token;
    const item_id = exchangeData.item_id;

    const accountsResponse = await fetch(`${plaidHost}/accounts/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify({
        access_token,
      }),
    });

    const accountsData = await accountsResponse.json();

    if (accountsData.error_code) {
      throw new Error(accountsData.error_message || 'Failed to get accounts');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    for (const account of accountsData.accounts) {
      const { error } = await supabase.from('bank_accounts').insert({
        user_id,
        plaid_account_id: account.account_id,
        plaid_item_id: item_id,
        plaid_access_token: access_token,
        institution_name: metadata.institution?.name || 'Unknown',
        account_name: account.name,
        account_type: account.type,
        account_subtype: account.subtype,
        mask: account.mask,
        current_balance: account.balances.current || 0,
        available_balance: account.balances.available || 0,
        currency_code: account.balances.iso_currency_code || 'USD',
        is_active: true,
      });

      if (error) {
        console.error('Error saving account:', error);
      }
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const transactionsResponse = await fetch(`${plaidHost}/transactions/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': PLAID_SECRET,
      },
      body: JSON.stringify({
        access_token,
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
      }),
    });

    const transactionsData = await transactionsResponse.json();

    if (!transactionsData.error_code && transactionsData.transactions) {
      for (const txn of transactionsData.transactions) {
        const { data: accountData } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('plaid_account_id', txn.account_id)
          .single();

        if (accountData) {
          await supabase.from('bank_transactions').insert({
            bank_account_id: accountData.id,
            plaid_transaction_id: txn.transaction_id,
            date: txn.date,
            merchant_name: txn.merchant_name,
            name: txn.name,
            amount: -txn.amount,
            category: txn.category,
            pending: txn.pending,
            status: 'pending',
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error exchanging token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});