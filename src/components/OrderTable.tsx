'use client';

import React, { useState, useMemo } from 'react';
import { Order, OrderStatus } from '@/types/order';
import { formatCurrency } from '@/lib/kpi';
import {
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';

interface OrderTableProps {
  orders: Order[];
}

export const OrderTable: React.FC<OrderTableProps> = ({ orders }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'Order_Date' | 'Amount_USD' | 'Order_ID'>('Order_Date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.Category) set.add(o.Category);
    });
    return Array.from(set).sort();
  }, [orders]);

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        // Status filter
        if (statusFilter !== 'All' && o.Status !== statusFilter) return false;
        // Category filter
        if (categoryFilter !== 'All' && o.Category !== categoryFilter) return false;
        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            o.Order_ID.toLowerCase().includes(q) ||
            o.Customer_Name.toLowerCase().includes(q) ||
            o.Product_Name.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'Amount_USD') {
          return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        }
        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
  }, [orders, search, statusFilter, categoryFilter, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const toggleSort = (field: 'Order_Date' | 'Amount_USD' | 'Order_ID') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = 'Order_ID,Customer_Name,Product_Name,Category,Amount_USD,Status,Order_Date\n';
    const rows = filteredOrders
      .map(
        (o) =>
          `"${o.Order_ID}","${o.Customer_Name}","${o.Product_Name}","${o.Category}",${o.Amount_USD},"${o.Status}","${o.Order_Date}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Orders & Fulfillment</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Showing {filteredOrders.length} of {orders.length} total orders
          </p>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search ID, customer, item..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Tab Pills */}
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 text-xs">
            {(['All', 'Completed', 'Pending', 'Cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Export button */}
          <button
            onClick={handleExportCSV}
            title="Export filtered orders to CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-50/75 dark:bg-zinc-800/50 border-b border-zinc-200/80 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase font-semibold tracking-wider">
              <th
                onClick={() => toggleSort('Order_ID')}
                className="py-3 px-4 cursor-pointer hover:text-zinc-800 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  Order ID
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Product & Category</th>
              <th
                onClick={() => toggleSort('Amount_USD')}
                className="py-3 px-4 text-right cursor-pointer hover:text-zinc-800 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Amount (USD)
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Status</th>
              <th
                onClick={() => toggleSort('Order_Date')}
                className="py-3 px-4 text-right cursor-pointer hover:text-zinc-800 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Date
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-zinc-700 dark:text-zinc-300">
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order) => (
                <tr
                  key={order.Order_ID}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {order.Order_ID}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-200">
                    {order.Customer_Name}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1">
                      {order.Product_Name}
                    </div>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {order.Category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(order.Amount_USD)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {getStatusBadge(order.Status)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {order.Order_Date}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                  No orders match your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <div>
          Page <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentPage}</span> of{' '}
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{totalPages}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
