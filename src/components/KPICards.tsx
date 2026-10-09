'use client';

import React from 'react';
import { KPIMetrics } from '@/types/order';
import { formatCurrency, formatNumber } from '@/lib/kpi';
import { DollarSign, ShoppingBag, Target, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';

interface KPICardsProps {
  metrics: KPIMetrics;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 💵 Total Revenue */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            Total Revenue
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <p className="mt-1 flex items-center text-xs text-zinc-500 dark:text-zinc-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center mr-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              {metrics.completedOrdersCount} completed
            </span>
            out of {metrics.totalOrders} orders
          </p>
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* 📦 Total Orders */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            Total Orders
          </span>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {formatNumber(metrics.totalOrders)}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {metrics.completionRate.toFixed(1)}% fulfillment rate
            </span>
          </p>
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* 🎯 Average Order Value (AOV) */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            Avg. Order Value (AOV)
          </span>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {formatCurrency(metrics.averageOrderValue)}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Revenue ÷ Total Orders
          </p>
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* ⏳ Pending Orders Alert Count */}
      <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${
        metrics.pendingOrdersCount > 0
          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-800/80'
          : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-400">
            Pending Orders Alert
          </span>
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              metrics.pendingOrdersCount > 0
                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
            }`}>
              {metrics.pendingOrdersCount > 0 ? (
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            {metrics.pendingOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className={`text-2xl lg:text-3xl font-bold tracking-tight ${
            metrics.pendingOrdersCount > 0 ? 'text-amber-900 dark:text-amber-300' : 'text-zinc-900 dark:text-white'
          }`}>
            {formatNumber(metrics.pendingOrdersCount)}
          </div>
          <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-400/90 font-medium">
            {metrics.pendingOrdersCount > 0 ? 'Awaiting operations fulfillment' : 'All orders processed'}
          </p>
        </div>
      </div>
    </div>
  );
};
