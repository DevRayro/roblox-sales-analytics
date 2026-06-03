import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { SaleRecord } from '../types';
import { format, parseISO, startOfDay } from 'date-fns';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { X, ExternalLink, DollarSign, ShoppingCart, Users, TrendingUp, CalendarDays } from 'lucide-react';

interface ItemDetailModalProps {
  assetId: string;
  assetName: string;
  assetType?: string;
  data: SaleRecord[];
  onClose: () => void;
}

export function ItemDetailModal({ assetId, assetName, assetType, data, onClose }: ItemDetailModalProps) {
  const [metric, setMetric] = useState<'revenue' | 'sales'>('revenue');

  const hasId = !!assetId && assetId !== 'Null';
  const robloxUrl = hasId ? `https://www.roblox.com/catalog/${assetId}` : null;

  // Match all sales for this item. Prefer matching by asset id, fall back to name.
  const itemRecords = useMemo(() => {
    return data.filter(d => (hasId ? d.assetId === assetId : d.assetName === assetName));
  }, [data, assetId, assetName, hasId]);

  const daily = useMemo(() => {
    const map: Record<string, { revenue: number; sales: number }> = {};
    itemRecords.forEach(r => {
      if (!r.dateTime || isNaN(r.dateTime.getTime())) return;
      const key = format(startOfDay(r.dateTime), 'yyyy-MM-dd');
      if (!map[key]) map[key] = { revenue: 0, sales: 0 };
      map[key].revenue += r.revenue;
      map[key].sales += 1;
    });
    const arr = Object.entries(map)
      .map(([date, s]) => ({ date, revenue: s.revenue, sales: s.sales }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cumulative = 0;
    return arr.map(d => {
      cumulative += d.revenue;
      return { ...d, cumulative };
    });
  }, [itemRecords]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    const buyers = new Set<string>();
    itemRecords.forEach(r => {
      totalRevenue += r.revenue;
      if (r.buyerUserId && r.buyerUserId !== 'Unknown') buyers.add(r.buyerUserId);
    });
    const totalSales = itemRecords.length;

    let bestDay: { date: string; revenue: number; sales: number } | null = null;
    daily.forEach(d => {
      if (!bestDay || d.revenue > bestDay.revenue) bestDay = d;
    });

    const validDates = itemRecords
      .map(r => r.dateTime)
      .filter((d): d is Date => !!d && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      totalRevenue,
      totalSales,
      uniqueBuyers: buyers.size,
      avgPrice: totalSales > 0 ? totalRevenue / totalSales : 0,
      bestDay,
      firstSale: validDates[0] || null,
      lastSale: validDates[validDates.length - 1] || null
    };
  }, [itemRecords, daily]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-[var(--bg-base)]/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-[var(--border-subtle)]">
          <p className="font-semibold text-white mb-2">{format(parseISO(label), 'MMM d, yyyy')}</p>
          <div className="space-y-1 text-sm">
            <p className="text-primary-400 flex items-center justify-between gap-6">
              <span>Revenue</span>
              <span>R$ {point.revenue.toLocaleString()}</span>
            </p>
            <p className="text-slate-300 flex items-center justify-between gap-6">
              <span>Sales</span>
              <span>{point.sales.toLocaleString()}</span>
            </p>
            <p className="text-slate-400 flex items-center justify-between gap-6 pt-1 border-t border-[var(--border-subtle)] mt-1">
              <span>Cumulative</span>
              <span>R$ {point.cumulative.toLocaleString()}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
        <Icon className="w-4 h-4 text-primary-400" />
      </div>
      <div className="text-xl font-black text-white tracking-tight">{value}</div>
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--bg-base)]/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl md:rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 md:p-6 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-panel)] z-10">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest mb-1">Item Performance</p>
            <h3 className="text-lg md:text-2xl font-bold text-white tracking-tight truncate">{assetName}</h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {assetType && (
                <span className="px-2.5 py-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] text-slate-300 rounded-lg text-xs font-medium">
                  {assetType}
                </span>
              )}
              {robloxUrl && (
                <a
                  href={robloxUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500/20 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  View on Roblox <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-1 text-slate-400 hover:text-white hover:bg-[var(--border-subtle)] rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 md:p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={DollarSign} label="Total Revenue" value={`R$ ${stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            <Stat icon={ShoppingCart} label="Total Sales" value={stats.totalSales.toLocaleString()} />
            <Stat icon={Users} label="Unique Buyers" value={stats.uniqueBuyers.toLocaleString()} />
            <Stat icon={TrendingUp} label="Avg Price" value={`R$ ${stats.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          </div>

          {/* Chart */}
          <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h4 className="text-sm md:text-base font-bold text-white">Sales Evolution</h4>
                <p className="text-xs text-slate-400">Daily activity with cumulative revenue</p>
              </div>
              <div className="flex items-center p-1 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)]">
                {(['revenue', 'sales'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      metric === m ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {m === 'revenue' ? 'Revenue' : 'Sales'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[280px] md:h-[340px] w-full">
              {daily.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={daily} margin={{ top: 5, right: 8, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="itemBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary-500)" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="var(--primary-500)" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={val => format(parseISO(val), 'MMM d')}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={val => (metric === 'revenue' ? `R$${val}` : `${val}`)}
                      width={70}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#475569', fontSize: 11 }}
                      tickFormatter={val => `R$${val}`}
                      width={60}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border-subtle)', opacity: 0.3 }} />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                    <Bar
                      yAxisId="left"
                      dataKey={metric}
                      name={metric === 'revenue' ? 'Daily Revenue' : 'Daily Sales'}
                      fill="url(#itemBar)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulative"
                      name="Cumulative Revenue"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">No dated sales available for this item</div>
              )}
            </div>
          </div>

          {/* Footnotes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <span>First sale: <span className="text-slate-200 font-medium">{stats.firstSale ? format(stats.firstSale, 'MMM d, yyyy') : '—'}</span></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <span>Last sale: <span className="text-slate-200 font-medium">{stats.lastSale ? format(stats.lastSale, 'MMM d, yyyy') : '—'}</span></span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <span>Best day: <span className="text-slate-200 font-medium">{stats.bestDay ? `R$ ${stats.bestDay.revenue.toLocaleString()}` : '—'}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
