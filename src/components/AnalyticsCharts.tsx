'use client';

import React from 'react';
import { DailySalesSummary, CategorySummary, KPIMetrics } from '@/types/order';
import { formatCurrency } from '@/lib/kpi';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AnalyticsChartsProps {
  dailySales: DailySalesSummary[];
  categorySales: CategorySummary[];
  metrics: KPIMetrics;
  selectedDays: number;
  onSelectDays: (days: number) => void;
}

const STATUS_COLORS = {
  Completed: '#10b981', // emerald-500
  Pending: '#f59e0b',   // amber-500
  Cancelled: '#f43f5e', // rose-500
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  dailySales,
  categorySales,
  metrics,
  selectedDays,
  onSelectDays,
}) => {
  const statusData = [
    { name: 'Completed', value: metrics.completedOrdersCount, color: STATUS_COLORS.Completed },
    { name: 'Pending', value: metrics.pendingOrdersCount, color: STATUS_COLORS.Pending },
    { name: 'Cancelled', value: metrics.cancelledOrdersCount, color: STATUS_COLORS.Cancelled },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sales Trend Chart */}
      <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Revenue Timeline</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Daily sales performance of completed orders</p>
          </div>

          {/* Interactive Range Switcher: 7 Days / 14 Days / 30 Days */}
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 text-xs self-start sm:self-auto">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onSelectDays(d)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedDays === d
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailySales} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
              <XAxis
                dataKey="date"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={selectedDays === 30 ? 3 : selectedDays === 14 ? 1 : 0}
                tickFormatter={(val) => {
                  try {
                    const parts = val.split('-');
                    return `${parts[1]}/${parts[2]}`;
                  } catch {
                    return val;
                  }
                }}
              />
              <YAxis
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl bg-zinc-900/95 text-white p-3 shadow-lg border border-zinc-700 text-xs">
                        <p className="font-semibold text-zinc-300">{label}</p>
                        <p className="text-emerald-400 font-bold mt-1">
                          Revenue: {formatCurrency(payload[0].value as number)}
                        </p>
                        <p className="text-zinc-400">
                          Orders: {payload[0].payload.orders}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 1, stroke: '#ffffff' }}
                activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                fillOpacity={1}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Performance & Order Status Breakdown */}
      <div className="flex flex-col gap-6">
        {/* Status Distribution */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Order Status</h3>
            <span className="text-xs text-zinc-500">Total {metrics.totalOrders}</span>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const pct = ((data.value / metrics.totalOrders) * 100).toFixed(1);
                      return (
                        <div className="rounded-lg bg-zinc-900 text-white px-2.5 py-1.5 text-xs shadow-md">
                          <span className="font-semibold">{data.name}:</span> {data.value} ({pct}%)
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed
              </div>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{metrics.completedOrdersCount}</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending
              </div>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{metrics.pendingOrdersCount}</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Cancelled
              </div>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{metrics.cancelledOrdersCount}</span>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">Top Categories</h3>
          <div className="space-y-3">
            {categorySales.slice(0, 4).map((cat) => {
              const maxRev = categorySales[0]?.revenue || 1;
              const percent = Math.min(100, Math.round((cat.revenue / maxRev) * 100));
              return (
                <div key={cat.category} className="text-xs">
                  <div className="flex justify-between items-center mb-1 font-medium">
                    <span className="text-zinc-800 dark:text-zinc-200">{cat.category}</span>
                    <span className="text-zinc-500">{formatCurrency(cat.revenue)}</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
