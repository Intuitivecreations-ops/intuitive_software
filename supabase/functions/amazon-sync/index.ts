import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AmazonCredentials {
  refresh_token: string;
  client_id: string;
  client_secret: string;
  marketplace_id: string;
  selling_partner_id: string;
}

interface AmazonOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  OrderTotal: {
    Amount: string;
    CurrencyCode: string;
  };
  OrderStatus: string;
  BuyerEmail?: string;
  BuyerName?: string;
  ShipmentServiceLevelCategory?: string;
  OrderItems?: any[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'sync-orders';

    switch (action) {
      case 'sync-orders':
        return await syncOrders(supabase);
      case 'sync-fees':
        return await syncFees(supabase);
      case 'get-order-items':
        const orderId = url.searchParams.get('orderId');
        if (!orderId) {
          return jsonResponse({ error: 'Order ID required' }, 400);
        }
        return await getOrderItems(supabase, orderId);
      default:
        return jsonResponse({ error: 'Invalid action' }, 400);
    }
  } catch (error) {
    console.error('Amazon sync error:', error);
    return jsonResponse(
      { error: 'Internal server error', message: error.message },
      500
    );
  }
});

async function syncOrders(supabase: any) {
  const credentials = await getAmazonCredentials(supabase);
  if (!credentials) {
    return jsonResponse({ error: 'Amazon credentials not configured' }, 400);
  }

  const accessToken = await getAccessToken(credentials);
  if (!accessToken) {
    return jsonResponse({ error: 'Failed to get Amazon access token' }, 401);
  }

  const orders = await fetchAmazonOrders(credentials, accessToken);
  
  let imported = 0;
  let updated = 0;

  for (const order of orders) {
    const { data: existing } = await supabase
      .from('channel_orders')
      .select('id')
      .eq('channel', 'AMAZON')
      .eq('channel_order_id', order.AmazonOrderId)
      .maybeSingle();

    const orderData = {
      channel: 'AMAZON',
      channel_order_id: order.AmazonOrderId,
      order_date: order.PurchaseDate,
      customer_email: order.BuyerEmail || null,
      customer_name: order.BuyerName || 'Amazon Customer',
      total_amount: parseFloat(order.OrderTotal?.Amount || '0'),
      status: mapAmazonStatus(order.OrderStatus),
      payment_status: 'paid',
      raw_data: order,
    };

    if (existing) {
      await supabase
        .from('channel_orders')
        .update(orderData)
        .eq('id', existing.id);
      updated++;
    } else {
      const { data: newOrder } = await supabase
        .from('channel_orders')
        .insert(orderData)
        .select()
        .single();

      if (newOrder && order.OrderItems) {
        await saveOrderItems(supabase, newOrder.id, order.OrderItems);
      }
      imported++;
    }
  }

  return jsonResponse({
    success: true,
    imported,
    updated,
    total: orders.length,
  });
}

async function syncFees(supabase: any) {
  const credentials = await getAmazonCredentials(supabase);
  if (!credentials) {
    return jsonResponse({ error: 'Amazon credentials not configured' }, 400);
  }

  const accessToken = await getAccessToken(credentials);
  if (!accessToken) {
    return jsonResponse({ error: 'Failed to get Amazon access token' }, 401);
  }

  return jsonResponse({
    success: true,
    message: 'Fee sync ready - implement Amazon Finance API',
  });
}

async function getOrderItems(supabase: any, orderId: string) {
  const credentials = await getAmazonCredentials(supabase);
  if (!credentials) {
    return jsonResponse({ error: 'Amazon credentials not configured' }, 400);
  }

  const accessToken = await getAccessToken(credentials);
  if (!accessToken) {
    return jsonResponse({ error: 'Failed to get Amazon access token' }, 401);
  }

  return jsonResponse({
    success: true,
    message: 'Order items fetch ready',
  });
}

async function getAmazonCredentials(supabase: any): Promise<AmazonCredentials | null> {
  const { data } = await supabase
    .from('channel_settings')
    .select('api_credentials')
    .eq('channel', 'AMAZON')
    .eq('is_active', true)
    .maybeSingle();

  if (!data || !data.api_credentials) {
    return null;
  }

  return data.api_credentials as AmazonCredentials;
}

async function getAccessToken(credentials: AmazonCredentials): Promise<string | null> {
  try {
    const tokenEndpoint = 'https://api.amazon.com/auth/o2/token';
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error('Token error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Get access token error:', error);
    return null;
  }
}

async function fetchAmazonOrders(
  credentials: AmazonCredentials,
  accessToken: string
): Promise<AmazonOrder[]> {
  try {
    const marketplaceId = credentials.marketplace_id || 'ATVPDKIKX0DER';
    const endpoint = `https://sellingpartnerapi-na.amazon.com/orders/v0/orders`;
    
    const createdAfter = new Date();
    createdAfter.setDate(createdAfter.getDate() - 30);

    const params = new URLSearchParams({
      MarketplaceIds: marketplaceId,
      CreatedAfter: createdAfter.toISOString(),
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: {
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Orders API error:', await response.text());
      return [];
    }

    const data = await response.json();
    return data.payload?.Orders || [];
  } catch (error) {
    console.error('Fetch orders error:', error);
    return [];
  }
}

async function saveOrderItems(supabase: any, orderId: string, items: any[]) {
  for (const item of items) {
    await supabase.from('channel_order_items').insert({
      order_id: orderId,
      channel_product_id: item.ASIN,
      sku: item.SellerSKU,
      product_name: item.Title,
      quantity: parseInt(item.QuantityOrdered || '1'),
      unit_price: parseFloat(item.ItemPrice?.Amount || '0'),
      total_price: parseFloat(item.ItemPrice?.Amount || '0') * parseInt(item.QuantityOrdered || '1'),
      raw_data: item,
    });
  }
}

function mapAmazonStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Pending': 'pending',
    'Unshipped': 'processing',
    'PartiallyShipped': 'processing',
    'Shipped': 'shipped',
    'Canceled': 'cancelled',
    'Unfulfillable': 'cancelled',
  };
  return statusMap[status] || 'pending';
}

function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
