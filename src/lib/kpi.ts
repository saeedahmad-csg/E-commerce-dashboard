import { Order, KPIMetrics, CategorySummary, DailySalesSummary, OrderStatus } from '@/types/order';

/**
 * Calculates required KPIs:
 * 💵 Total Revenue: Sum of all completed order amounts.
 * 📦 Total Orders: Count of all orders placed.
 * 🎯 Average Order Value (AOV): Total Revenue ÷ Total Orders.
 * ⏳ Pending Orders Alert Count: Number of orders waiting to be fulfilled.
 */
export function calculateKPIMetrics(orders: Order[]): KPIMetrics {
  const totalOrders = orders.length;

  let totalRevenue = 0;
  let pendingOrdersCount = 0;
  let completedOrdersCount = 0;
  let cancelledOrdersCount = 0;

  for (const order of orders) {
    if (order.Status === 'Completed') {
      totalRevenue += Number(order.Amount_USD) || 0;
      completedOrdersCount++;
    } else if (order.Status === 'Pending') {
      pendingOrdersCount++;
    } else if (order.Status === 'Cancelled') {
      cancelledOrdersCount++;
    }
  }

  // AOV is Total Revenue / Total Orders
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const completionRate = totalOrders > 0 ? (completedOrdersCount / totalOrders) * 100 : 0;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    pendingOrdersCount,
    completedOrdersCount,
    cancelledOrdersCount,
    completionRate
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function aggregateSalesByCategory(orders: Order[]): CategorySummary[] {
  const map = new Map<string, { revenue: number; orderCount: number }>();

  for (const order of orders) {
    const cat = order.Category || 'Uncategorized';
    const current = map.get(cat) || { revenue: 0, orderCount: 0 };
    if (order.Status === 'Completed') {
      current.revenue += Number(order.Amount_USD) || 0;
    }
    current.orderCount += 1;
    map.set(cat, current);
  }

  return Array.from(map.entries())
    .map(([category, data]) => ({
      category,
      revenue: Math.round(data.revenue * 100) / 100,
      orderCount: data.orderCount,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function aggregateDailySales(orders: Order[], days: number = 30): DailySalesSummary[] {
  // Generate map of last N days
  const now = new Date();
  const dateMap = new Map<string, { revenue: number; orders: number }>();

  // Determine date bounds from data or relative to latest order
  let maxDate = now;
  for (const o of orders) {
    if (o.Order_Date) {
      const d = new Date(o.Order_Date);
      if (!isNaN(d.getTime()) && d > maxDate) {
        maxDate = d;
      }
    }
  }

  // Pre-populate consecutive days in the window
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(maxDate);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dateMap.set(key, { revenue: 0, orders: 0 });
  }

  // Aggregate orders into the timeline
  for (const order of orders) {
    const date = order.Order_Date;
    if (date && dateMap.has(date)) {
      const entry = dateMap.get(date)!;
      if (order.Status === 'Completed') {
        entry.revenue += Number(order.Amount_USD) || 0;
      }
      entry.orders += 1;
    }
  }

  return Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      orders: data.orders,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function parseCSVToOrders(csvText: string): Order[] {
  // Simple & resilient CSV parser supporting standard headers:
  // Order_ID, Customer_Name, Product_Name, Category, Amount_USD, Status, Order_Date
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

  const getIdx = (keys: string[]) => headers.findIndex((h) => keys.includes(h));

  const idIdx = getIdx(['order_id', 'order id', 'id']);
  const customerIdx = getIdx(['customer_name', 'customer name', 'customer']);
  const productIdx = getIdx(['product_name', 'product name', 'product']);
  const categoryIdx = getIdx(['category']);
  const amountIdx = getIdx(['amount_usd', 'amount', 'amount usd', 'total']);
  const statusIdx = getIdx(['status']);
  const dateIdx = getIdx(['order_date', 'order date', 'date']);

  const parsedOrders: Order[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle comma inside quotes with regex
    const tokens = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const clean = (val: string | undefined) => (val || '').trim().replace(/^["']|["']$/g, '');

    const rawStatus = clean(tokens[statusIdx]);
    let normalizedStatus: OrderStatus = 'Completed';
    if (/pending/i.test(rawStatus)) normalizedStatus = 'Pending';
    else if (/cancel/i.test(rawStatus)) normalizedStatus = 'Cancelled';

    const rawAmount = clean(tokens[amountIdx]).replace(/[$,]/g, '');
    const amount = parseFloat(rawAmount) || 0;

    parsedOrders.push({
      Order_ID: clean(tokens[idIdx]) || `ORD-${1000 + i}`,
      Customer_Name: clean(tokens[customerIdx]) || 'Unknown Customer',
      Product_Name: clean(tokens[productIdx]) || 'General Item',
      Category: clean(tokens[categoryIdx]) || 'General',
      Amount_USD: amount,
      Status: normalizedStatus,
      Order_Date: clean(tokens[dateIdx]) || new Date().toISOString().split('T')[0],
    });
  }

  return parsedOrders;
}
