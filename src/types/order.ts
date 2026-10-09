export type OrderStatus = 'Completed' | 'Pending' | 'Cancelled';

export interface Order {
  Order_ID: string;
  Customer_Name: string;
  Product_Name: string;
  Category: string;
  Amount_USD: number;
  Status: OrderStatus;
  Order_Date: string; // YYYY-MM-DD or ISO string
}

export interface KPIMetrics {
  totalRevenue: number;          // Sum of all completed order amounts
  totalOrders: number;           // Count of all orders placed
  averageOrderValue: number;     // Total Revenue / Total Orders
  pendingOrdersCount: number;    // Count of pending orders
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  completionRate: number;        // (Completed / Total Orders) * 100
}

export interface CategorySummary {
  category: string;
  revenue: number;
  orderCount: number;
}

export interface DailySalesSummary {
  date: string;
  revenue: number;
  orders: number;
}
