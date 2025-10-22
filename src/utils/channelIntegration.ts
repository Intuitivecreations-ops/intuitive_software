import { supabase } from '../lib/supabase';

export interface ChannelOrder {
  id: string;
  channel: string;
  channel_order_id: string;
  order_date: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  status: string;
  payment_status: string;
  linked_invoice_id: string | null;
}

export interface ChannelOrderItem {
  id: string;
  order_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_amount: number;
  linked_product_id: string | null;
}

export interface ChannelFee {
  id: string;
  order_id: string;
  channel: string;
  fee_type: string;
  fee_description: string;
  amount: number;
  date: string;
  linked_expense_id: string | null;
}

export interface EcwidOrder {
  orderNumber: string;
  createDate: string;
  email: string;
  customerName: string;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export async function getChannelOrders(channel?: string): Promise<ChannelOrder[]> {
  let query = supabase
    .from('channel_orders')
    .select('*')
    .order('order_date', { ascending: false });

  if (channel) {
    query = query.eq('channel', channel);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching channel orders:', error);
    return [];
  }

  return data || [];
}

export async function getChannelOrderItems(orderId: string): Promise<ChannelOrderItem[]> {
  const { data, error } = await supabase
    .from('channel_order_items')
    .select('*')
    .eq('order_id', orderId);

  if (error) {
    console.error('Error fetching order items:', error);
    return [];
  }

  return data || [];
}

export async function getChannelFees(orderId?: string): Promise<ChannelFee[]> {
  let query = supabase.from('channel_fees').select('*').order('date', { ascending: false });

  if (orderId) {
    query = query.eq('order_id', orderId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching channel fees:', error);
    return [];
  }

  return data || [];
}

export async function importEcwidOrders(orders: EcwidOrder[]): Promise<number> {
  let imported = 0;

  for (const order of orders) {
    const { data: existingOrder } = await supabase
      .from('channel_orders')
      .select('id')
      .eq('channel', 'ECWID')
      .eq('channel_order_id', order.orderNumber)
      .maybeSingle();

    if (existingOrder) {
      continue;
    }

    const { data: newOrder, error: orderError } = await supabase
      .from('channel_orders')
      .insert({
        channel: 'ECWID',
        channel_order_id: order.orderNumber,
        order_date: order.createDate,
        customer_name: order.customerName,
        customer_email: order.email,
        subtotal: order.subtotal,
        tax_amount: order.tax,
        shipping_amount: order.shipping,
        total_amount: order.total,
        status: 'processing',
        payment_status: 'paid',
      })
      .select()
      .single();

    if (orderError || !newOrder) {
      console.error('Error creating order:', orderError);
      continue;
    }

    for (const item of order.items) {
      await supabase.from('channel_order_items').insert({
        order_id: newOrder.id,
        sku: item.sku,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      });
    }

    imported++;
  }

  return imported;
}

export function parseEcwidCSV(csvContent: string): EcwidOrder[] {
  const lines = csvContent.split('\n');
  const orders: EcwidOrder[] = [];

  if (lines.length < 2) return orders;

  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));

    const order: EcwidOrder = {
      orderNumber: values[headers.indexOf('Order Number')] || values[0],
      createDate: values[headers.indexOf('Order Date')] || values[1],
      email: values[headers.indexOf('Email')] || values[2],
      customerName: values[headers.indexOf('Customer Name')] || values[3],
      total: parseFloat(values[headers.indexOf('Total')] || values[4]) || 0,
      subtotal: parseFloat(values[headers.indexOf('Subtotal')] || values[5]) || 0,
      tax: parseFloat(values[headers.indexOf('Tax')] || values[6]) || 0,
      shipping: parseFloat(values[headers.indexOf('Shipping')] || values[7]) || 0,
      items: [],
    };

    const itemSKU = values[headers.indexOf('Item SKU')] || '';
    const itemName = values[headers.indexOf('Item Name')] || '';
    const itemQty = parseInt(values[headers.indexOf('Item Quantity')] || '1');
    const itemPrice = parseFloat(values[headers.indexOf('Item Price')] || '0');

    if (itemSKU && itemName) {
      order.items.push({
        sku: itemSKU,
        name: itemName,
        quantity: itemQty,
        price: itemPrice,
      });
    }

    orders.push(order);
  }

  return orders;
}

export function parseEcwidJSON(jsonContent: string): EcwidOrder[] {
  try {
    const data = JSON.parse(jsonContent);

    if (Array.isArray(data)) {
      return data.map((order: any) => ({
        orderNumber: order.orderNumber || order.id || '',
        createDate: order.createDate || order.date || new Date().toISOString(),
        email: order.email || order.customerEmail || '',
        customerName:
          order.customerName ||
          `${order.billingPerson?.name || ''} ${order.shippingPerson?.name || ''}`.trim(),
        total: parseFloat(order.total) || 0,
        subtotal: parseFloat(order.subtotal) || 0,
        tax: parseFloat(order.tax) || 0,
        shipping: parseFloat(order.shipping) || parseFloat(order.shippingOption?.shippingRate) || 0,
        items: (order.items || []).map((item: any) => ({
          sku: item.sku || '',
          name: item.name || item.productName || '',
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
        })),
      }));
    }

    return [];
  } catch (error) {
    console.error('Error parsing Ecwid JSON:', error);
    return [];
  }
}

export async function matchOrderToInvoice(orderId: string): Promise<string | null> {
  const { data: order } = await supabase
    .from('channel_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order) return null;

  const orderDate = new Date(order.order_date);
  const startDate = new Date(orderDate);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(orderDate);
  endDate.setDate(endDate.getDate() + 7);

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, total, invoice_date')
    .gte('invoice_date', startDate.toISOString())
    .lte('invoice_date', endDate.toISOString());

  if (!invoices || invoices.length === 0) return null;

  const matchingInvoice = invoices.find(
    (inv) => Math.abs(parseFloat(inv.total) - order.total_amount) < 0.01
  );

  if (matchingInvoice) {
    await supabase
      .from('channel_orders')
      .update({
        linked_invoice_id: matchingInvoice.id,
        matched_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return matchingInvoice.id;
  }

  return null;
}

export async function syncFeesToExpenses(orderId: string): Promise<number> {
  const fees = await getChannelFees(orderId);
  let synced = 0;

  for (const fee of fees) {
    if (fee.linked_expense_id) continue;

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        description: `${fee.channel} ${fee.fee_type}: ${fee.fee_description}`,
        category: fee.channel === 'AMAZON' ? 'Amazon Fees' : 'Platform Fees',
        amount: Math.abs(fee.amount),
        date: fee.date,
        vendor: fee.channel,
      })
      .select()
      .single();

    if (!error && expense) {
      await supabase
        .from('channel_fees')
        .update({
          linked_expense_id: expense.id,
          synced_at: new Date().toISOString(),
        })
        .eq('id', fee.id);

      synced++;
    }
  }

  return synced;
}

export async function syncInventory(channel: string): Promise<number> {
  const { data: products } = await supabase.from('products').select('id, sku, stock');

  if (!products) return 0;

  let synced = 0;

  for (const product of products) {
    const { error } = await supabase
      .from('channel_inventory_sync')
      .upsert(
        {
          channel,
          product_id: product.id,
          channel_sku: product.sku,
          quantity_available: product.stock || 0,
          quantity_total: product.stock || 0,
          last_synced_at: new Date().toISOString(),
          sync_status: 'synced',
        },
        {
          onConflict: 'channel,product_id',
        }
      );

    if (!error) synced++;
  }

  return synced;
}

export async function getChannelStats(channel?: string) {
  let ordersQuery = supabase.from('channel_orders').select('total_amount, status');
  let feesQuery = supabase.from('channel_fees').select('amount');

  if (channel) {
    ordersQuery = ordersQuery.eq('channel', channel);
    feesQuery = feesQuery.eq('channel', channel);
  }

  const { data: orders } = await ordersQuery;
  const { data: fees } = await feesQuery;

  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
  const totalFees = fees?.reduce((sum, f) => sum + Math.abs(Number(f.amount)), 0) || 0;
  const orderCount = orders?.length || 0;
  const pendingOrders = orders?.filter((o) => o.status === 'pending' || o.status === 'processing')
    .length || 0;

  return {
    totalRevenue,
    totalFees,
    netRevenue: totalRevenue - totalFees,
    orderCount,
    pendingOrders,
  };
}

export function getChannelStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'processing':
      return 'bg-blue-100 text-blue-700';
    case 'shipped':
      return 'bg-purple-100 text-purple-700';
    case 'delivered':
      return 'bg-green-100 text-green-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    case 'refunded':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
