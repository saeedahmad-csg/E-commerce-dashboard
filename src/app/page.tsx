'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SAMPLE_ORDERS } from '@/data/sampleOrders';
import { Order, OrderStatus } from '@/types/order';
import {
  calculateKPIMetrics,
  aggregateDailySales,
  aggregateSalesByCategory,
  parseCSVToOrders,
} from '@/lib/kpi';
import { KPICards } from '@/components/KPICards';
import { AnalyticsCharts } from '@/components/AnalyticsCharts';
import { OrderTable } from '@/components/OrderTable';
import { GoogleSheetModal } from '@/components/GoogleSheetModal';
import {
  Store,
  RefreshCw,
  PlusCircle,
  Bell,
  Sun,
  Moon,
  CheckCircle2,
  Radio,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('Syncing live...');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Quick order addition modal / state for demonstration
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newCategory, setNewCategory] = useState('Electronics');
  const [newAmount, setNewAmount] = useState('');
  const [newStatus, setNewStatus] = useState<OrderStatus>('Pending');
  const [selectedDays, setSelectedDays] = useState<number>(30);

  // Compute calculated values
  const metrics = useMemo(() => calculateKPIMetrics(orders), [orders]);
  const dailySales = useMemo(() => aggregateDailySales(orders, selectedDays), [orders, selectedDays]);
  const categorySales = useMemo(() => aggregateSalesByCategory(orders), [orders]);

  // Sync dark mode class to document element so whole page & portal modals theme properly
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Primary Fetch function for Google Sheets
  const fetchLiveSheet = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    try {
      const res = await fetch(`/api/sheets?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.orders && data.orders.length > 0) {
        setOrders(data.orders);
        setSyncError(null);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else if (data.error) {
        console.warn('Google Sheets API note:', data.error);
        setSyncError(data.error);
      }
    } catch (err: any) {
      console.error('Error fetching live sheets:', err);
      if (!isSilent) setSyncError(err?.message || 'Network error fetching sheets');
    } finally {
      if (!isSilent) setIsSyncing(false);
      setIsLoadingInitial(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    fetchLiveSheet(false);
  }, [fetchLiveSheet]);

  // Real-time automatic synchronization: continuous fast 2.5s polling (respecting Google Sheets quotas)
  useEffect(() => {
    if (!autoSyncEnabled) return;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      await fetchLiveSheet(true);
      if (isMounted) {
        // Wait 2.5 seconds after each successful response before triggering next
        timeoutId = setTimeout(poll, 2500);
      }
    };

    timeoutId = setTimeout(poll, 2500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [autoSyncEnabled, fetchLiveSheet]);


  // Handle Google Sheet sync
  const handleSyncGoogleSheet = async (csvUrl: string) => {
    setIsSyncing(true);
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet: HTTP ${response.status}`);
      }
      const text = await response.text();
      const parsed = parseCSVToOrders(text);
      if (parsed.length === 0) {
        throw new Error('No valid orders found in the CSV. Please check columns and formatting.');
      }
      setOrders(parsed);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncServiceAccount = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sheets');
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to sync from Google Sheets API');
      }
      if (!data.orders || data.orders.length === 0) {
        throw new Error('Google Sheet returned 0 order records.');
      }
      setOrders(data.orders);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetToSample = () => {
    setOrders(SAMPLE_ORDERS);
    setLastUpdated('Sample dataset');
  };

  const handleClearSheet = async () => {
    const res = await fetch('/api/sheets', { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to clear sheet data');
    }
    setOrders([]);
    setLastUpdated('Sheet cleared (0 orders)');
  };

  const handlePopulateBatch = async (count: number = 6769) => {
    const res = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to generate orders in Google Sheet');
    }
    // Instantly trigger re-sync to load all newly written rows into dashboard
    await fetchLiveSheet(false);
  };



  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer || !newProduct || !newAmount) return;

    const newOrder: Order = {
      Order_ID: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      Customer_Name: newCustomer,
      Product_Name: newProduct,
      Category: newCategory,
      Amount_USD: parseFloat(newAmount) || 0,
      Status: newStatus,
      Order_Date: new Date().toISOString().split('T')[0],
    };

    setOrders([newOrder, ...orders]);
    setIsAddOrderOpen(false);
    setNewCustomer('');
    setNewProduct('');
    setNewAmount('');
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-zinc-50/70 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand Logo & Context */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Sales Dashboard
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Target: Store Owner &amp; Operations Manager
                </p>
              </div>
            </div>

            {/* Quick Actions & Header Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Instant Refresh Button */}
              <button
                type="button"
                onClick={() => fetchLiveSheet(false)}
                disabled={isSyncing}
                title="Sync from Google Sheet Now"
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              </button>


              {/* Add Order Button */}
              <button
                onClick={() => setIsAddOrderOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Order</span>
              </button>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
              </button>
            </div>
          </div>
        </header>

        {/* Main Dashboard Workspace */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Google Sheets Sync Error Alert */}
          {syncError && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Google Sheet Sync Error
                </h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 break-all">
                  {syncError}
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchLiveSheet(false)}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Operations Alert Banner for Pending Orders */}
          {metrics.pendingOrdersCount > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Fulfillment Attention Required
                  </h4>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    There are currently <strong>{metrics.pendingOrdersCount} pending orders</strong> awaiting packing and shipping confirmation.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Updated: {lastUpdated}
                </span>
              </div>
            </div>
          )}

          {/* KPI Metrics Cards */}
          <section aria-label="Key Performance Indicators">
            <KPICards metrics={metrics} />
          </section>

          {/* Visual Analytics & Breakdown */}
          <section aria-label="Sales Charts and Breakdowns">
            <AnalyticsCharts
              dailySales={dailySales}
              categorySales={categorySales}
              metrics={metrics}
              selectedDays={selectedDays}
              onSelectDays={setSelectedDays}
            />
          </section>

          {/* Orders Data Table */}
          <section aria-label="Orders Data Grid">
            <OrderTable orders={orders} />
          </section>
        </main>

        {/* Google Sheet Sync Modal */}
        <GoogleSheetModal
          isOpen={isSheetModalOpen}
          onClose={() => setIsSheetModalOpen(false)}
          onSync={handleSyncGoogleSheet}
          onSyncServiceAccount={handleSyncServiceAccount}
          onResetSample={handleResetToSample}
          isLoading={isSyncing}
        />

        {/* Add Order Dialog */}
        {isAddOrderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-3">
                Create New Order
              </h3>
              <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    placeholder="e.g. Jordan Miller"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newProduct}
                    onChange={(e) => setNewProduct(e.target.value)}
                    placeholder="e.g. Mechanical Studio Keyboard"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    >
                      <option value="Electronics">Electronics</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Apparel">Apparel</option>
                      <option value="Home & Kitchen">Home &amp; Kitchen</option>
                      <option value="Wearables">Wearables</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Amount ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="149.99"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddOrderOpen(false)}
                    className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    Save Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Google Sheet Integration & Management Modal */}
        <GoogleSheetModal
          isOpen={isSheetModalOpen}
          onClose={() => setIsSheetModalOpen(false)}
          onSync={handleSyncGoogleSheet}
          onSyncServiceAccount={handleSyncServiceAccount}
          onResetSample={handleResetToSample}
          onClearSheet={handleClearSheet}
          onPopulateBatch={handlePopulateBatch}
          isLoading={isSyncing}
        />
      </div>
    </div>
  );
}


