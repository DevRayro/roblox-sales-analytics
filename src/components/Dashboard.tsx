import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, parseISO, startOfDay, differenceInDays, subDays } from 'date-fns';
import { DollarSign, ShoppingCart, Users, TrendingUp, RefreshCw, CalendarDays, ArrowRight, MapPin, Clock, LayoutDashboard } from 'lucide-react';
import { BuyerCell } from './BuyerCell';
import { LocationCell } from './LocationCell';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';

interface DashboardProps {
  data: SaleRecord[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onViewAllSales?: () => void;
  isLive?: boolean;
}

const COLORS = ['var(--primary-500)', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#06b6d4'];

export function Dashboard({ data, onRefresh, isRefreshing, onViewAllSales, isLive }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '6m' | '1y' | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'location' | 'time'>('overview');

  const filteredData = useMemo(() => {
    if (timeRange === 'all') return data;
    const now = new Date();
    let days = 30;
    if (timeRange === '7d') days = 7;
    if (timeRange === '6m') days = 180;
    if (timeRange === '1y') days = 365;
    const cutoff = subDays(now, days);
    return data.filter(d => d.dateTime && d.dateTime >= cutoff);
  }, [data, timeRange]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalSales = filteredData.length;
    const uniqueBuyers = new Set<string>();
    let minDate = new Date();
    let maxDate = new Date(0);

    filteredData.forEach(record => {
      totalRevenue += record.revenue;
      uniqueBuyers.add(record.buyerUserId);
      if (record.dateTime && !isNaN(record.dateTime.getTime())) {
        if (record.dateTime < minDate) minDate = record.dateTime;
        if (record.dateTime > maxDate) maxDate = record.dateTime;
      }
    });

    const days = Math.max(1, differenceInDays(maxDate, minDate));

    return {
      totalRevenue,
      totalSales,
      uniqueBuyers: uniqueBuyers.size,
      avgRevenue: totalSales > 0 ? totalRevenue / totalSales : 0,
      salesPerDay: totalSales / days
    };
  }, [filteredData]);

  const revenueOverTime = useMemo(() => {
    const dailyData: Record<string, { revenue: number, sales: number }> = {};
    filteredData.forEach(record => {
      if (!record.dateTime || isNaN(record.dateTime.getTime())) return;
      const dateStr = format(startOfDay(record.dateTime), 'yyyy-MM-dd');
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { revenue: 0, sales: 0 };
      }
      dailyData[dateStr].revenue += record.revenue;
      dailyData[dateStr].sales += 1;
    });

    return Object.entries(dailyData)
      .map(([date, stats]) => ({ date, revenue: stats.revenue, sales: stats.sales }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredData]);

  const topItems = useMemo(() => {
    const itemData: Record<string, { name: string; assetId: string; revenue: number; sales: number }> = {};
    filteredData.forEach(record => {
      if (!record.assetName) return;
      if (!itemData[record.assetName]) {
        itemData[record.assetName] = { name: record.assetName, assetId: record.assetId, revenue: 0, sales: 0 };
      }
      itemData[record.assetName].revenue += record.revenue;
      itemData[record.assetName].sales += 1;
    });

    return Object.values(itemData)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredData]);

  const salesByLocation = useMemo(() => {
    const locationData: Record<string, number> = {};
    filteredData.forEach(record => {
      let loc = record.location || 'Unknown';
      if (loc === 'Game' && record.universe && record.universe !== 'Null' && record.universe !== 'Unknown') {
        loc = record.universe;
      }
      locationData[loc] = (locationData[loc] || 0) + record.revenue;
    });

    return Object.entries(locationData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const recentSales = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const dateA = a.dateTime && !isNaN(a.dateTime.getTime()) ? a.dateTime.getTime() : 0;
      const dateB = b.dateTime && !isNaN(b.dateTime.getTime()) ? b.dateTime.getTime() : 0;
      return dateB - dateA;
    }).slice(0, 10);
  }, [filteredData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[var(--bg-base)]/90 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-[var(--border-subtle)]">
          <p className="font-semibold text-white mb-2">{format(parseISO(label), 'MMM d, yyyy')}</p>
          <div className="space-y-1">
            <p className="text-primary-400 font-medium flex items-center justify-between gap-4">
              <span>Revenue</span>
              <span>R$ {data.revenue.toLocaleString()}</span>
            </p>
            <p className="text-slate-400 flex items-center justify-between gap-4">
              <span>Sales</span>
              <span>{data.sales.toLocaleString()}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ title, value, icon: Icon, prefix = '', delay = 0 }: { title: string, value: string | number, icon: any, prefix?: string, delay?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-gradient-to-br from-[var(--bg-panel)] to-[var(--bg-base)] p-3 md:p-6 rounded-2xl md:rounded-3xl shadow-xl border border-[var(--border-subtle)] relative overflow-hidden group hover:border-primary-500/30 transition-colors"
    >
      <div className="absolute -top-6 -right-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
        <Icon className="w-24 md:w-32 h-24 md:h-32 text-primary-500 transform rotate-12" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <p className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</p>
          <div className="p-1.5 md:p-2.5 bg-primary-500/10 text-primary-400 rounded-xl md:rounded-2xl border border-primary-500/20 shadow-inner">
            <Icon className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </div>
        </div>
        <div>
          <h4 className="text-xl md:text-4xl font-black text-white tracking-tight">{prefix}{value}</h4>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="flex flex-col gap-3 md:gap-4 bg-[var(--bg-panel)]/50 p-2 rounded-2xl md:rounded-3xl border border-[var(--border-subtle)] backdrop-blur-sm">
        <div className="flex items-center p-1 bg-base rounded-xl md:rounded-2xl w-full overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            ...(!isLive ? [{ id: 'location', label: 'By Location', icon: MapPin }] : []),
            { id: 'time', label: 'By Time', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center space-x-1.5 md:space-x-2 px-3 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap flex-1 md:flex-none justify-center md:justify-start",
                  activeTab === tab.id
                    ? "bg-primary-500 text-white shadow-lg shadow-primary-500/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-subtle"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center p-1 bg-base rounded-xl md:rounded-2xl w-full">
          {(['7d', '30d', '6m', '1y', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "flex-1 px-2 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all",
                timeRange === range
                  ? "bg-subtle text-primary-400 shadow-inner"
                  : "text-slate-500 hover:text-slate-300 hover:bg-panel"
              )}
            >
              {range === '7d' ? '7D' : range === '30d' ? '30D' : range === '6m' ? '6M' : range === '1y' ? '1Y' : 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard title="Total Revenue" value={stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} icon={DollarSign} prefix="R$ " delay={0.1} />
        <StatCard title="Total Sales" value={stats.totalSales.toLocaleString()} icon={ShoppingCart} delay={0.2} />
        <StatCard title="Unique Buyers" value={stats.uniqueBuyers.toLocaleString()} icon={Users} delay={0.3} />
        <StatCard title="Sales/Day" value={stats.salesPerDay.toLocaleString(undefined, { maximumFractionDigits: 1 })} icon={TrendingUp} delay={0.4} />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Chart - Revenue Over Time */}
              <div className={`bg-[var(--bg-panel)] p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg border border-[var(--border-subtle)] ${isLive ? 'lg:col-span-3' : 'lg:col-span-2'} flex flex-col relative overflow-hidden`}>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary-500/5 to-transparent pointer-events-none" />
                <div className="flex items-center justify-between mb-4 md:mb-8 relative z-10">
                  <div>
                    <h3 className="text-base md:text-xl font-bold text-white tracking-tight">Revenue Trend</h3>
                    <p className="text-xs md:text-sm text-slate-400">Daily revenue breakdown</p>
                  </div>
                </div>
                <div className="h-[220px] md:h-[320px] w-full relative z-10">
                  {revenueOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueOverTime} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(val) => `R$${val}`}
                          width={80}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="var(--primary-500)" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorRevenue)" 
                          dot={{ r: 4, fill: 'var(--primary-500)', strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: 'var(--primary-500)', strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">No data available for this period</div>
                  )}
                </div>
              </div>

              {/* Revenue by Location - only for CSV data */}
              {!isLive && (
              <div className="bg-[var(--bg-panel)] p-6 rounded-3xl shadow-lg border border-[var(--border-subtle)] flex flex-col">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Top Locations</h3>
                  <p className="text-sm text-slate-400">Where your sales happen</p>
                </div>
                <div className="h-[320px] w-full mt-4">
                  {salesByLocation.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salesByLocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={8}
                        >
                          {salesByLocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`R$ ${value}`, 'Revenue']}
                          contentStyle={{ backgroundColor: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-subtle)', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: 'var(--primary-400)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">No data available</div>
                  )}
                </div>
              </div>
              )}

              {/* Top Selling Assets */}
              <div className="bg-[var(--bg-panel)] p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg border border-[var(--border-subtle)] lg:col-span-3">
                <div className="flex items-center justify-between mb-4 md:mb-8">
                  <div>
                    <h3 className="text-base md:text-xl font-bold text-white tracking-tight">Top Selling Assets</h3>
                    <p className="text-xs md:text-sm text-slate-400">Your best performing items</p>
                  </div>
                </div>
                <div className="h-[240px] md:h-[280px] w-full">
                  {topItems.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topItems} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border-subtle)" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `R$${val}`} />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          width={130}
                          tick={(props: any) => {
                            const { x, y, payload } = props;
                            const item = topItems.find(i => i.name === payload.value);
                            const isLink = item?.assetId && item.assetId !== 'Null';
                            return (
                              <g transform={`translate(${x},${y})`}>
                                {isLink ? (
                                  <a href={`https://www.roblox.com/catalog/${item.assetId}`} target="_blank" rel="noreferrer" className="hover:underline cursor-pointer">
                                    <text x={0} y={0} dy={4} textAnchor="end" fill="#cbd5e1" fontSize={13} fontWeight={500} className="hover:fill-primary-400 transition-colors">
                                      {payload.value.length > 15 ? payload.value.substring(0, 15) + '...' : payload.value}
                                    </text>
                                  </a>
                                ) : (
                                  <text x={0} y={0} dy={4} textAnchor="end" fill="#cbd5e1" fontSize={13} fontWeight={500}>
                                    {payload.value.length > 15 ? payload.value.substring(0, 15) + '...' : payload.value}
                                  </text>
                                )}
                              </g>
                            );
                          }}
                        />
                        <Tooltip 
                          cursor={{ fill: 'var(--border-subtle)', opacity: 0.4 }}
                          contentStyle={{ backgroundColor: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-subtle)', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: 'var(--primary-400)' }}
                          formatter={(value: number, name: string, props: any) => {
                            if (name === 'revenue') return [`R$ ${value}`, 'Revenue'];
                            return [value, name];
                          }}
                          labelFormatter={(label) => {
                            const item = topItems.find(i => i.name === label);
                            return item ? `${label} (${item.sales} sales)` : label;
                          }}
                        />
                        <Bar dataKey="revenue" fill="var(--primary-500)" radius={[0, 8, 8, 0]} barSize={24}>
                          {topItems.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">No data available</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Recent Sales Table */}
            <div className="bg-[var(--bg-panel)] rounded-2xl md:rounded-3xl shadow-lg border border-[var(--border-subtle)] overflow-hidden">
              <div className="p-4 md:p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-gradient-to-r from-[var(--bg-base)]/50 to-transparent">
                <div>
                  <h3 className="text-base md:text-xl font-bold text-white tracking-tight flex items-center">
                    <span className="relative flex h-2.5 w-2.5 md:h-3 md:w-3 mr-2 md:mr-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-primary-500"></span>
                    </span>
                    Live Sales
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400">Real-time sales activity</p>
                </div>
                <button onClick={onViewAllSales} className="flex items-center space-x-1.5 md:space-x-2 text-xs md:text-sm text-primary-400 hover:text-primary-300 font-medium bg-primary-500/10 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl transition-colors">
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-base)]/30 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                      <th className="p-5 font-medium">Date</th>
                      <th className="p-5 font-medium">Buyer</th>
                      <th className="p-5 font-medium">Asset Name</th>
                      <th className="p-5 font-medium">Asset Type</th>
                      {!isLive && <th className="p-5 font-medium">Location</th>}
                      <th className="p-5 font-medium text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-slate-300">
                    <AnimatePresence initial={false}>
                      {recentSales.map((record, i) => (
                        <motion.tr 
                          key={record.id}
                          layout
                          initial={{ opacity: 0, y: -20, backgroundColor: 'var(--primary-500)' }}
                          animate={{ opacity: 1, y: 0, backgroundColor: 'transparent' }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.5 }}
                          className="border-b border-[var(--border-subtle)] hover:bg-[var(--border-subtle)]/50 transition-colors group"
                        >
                          <td className="p-5 whitespace-nowrap font-mono text-xs text-slate-400">{record.dateTime && !isNaN(record.dateTime.getTime()) ? format(record.dateTime, 'MMM d, yyyy HH:mm') : 'Unknown'}</td>
                          <td className="p-5">
                            <BuyerCell record={record} />
                          </td>
                          <td className="p-5 font-medium text-slate-200">
                            {record.assetId && record.assetId !== 'Null' ? (
                              <a href={`https://www.roblox.com/catalog/${record.assetId}`} target="_blank" rel="noreferrer" className="hover:text-primary-400 hover:underline transition-colors">
                                {record.assetName}
                              </a>
                            ) : (
                              record.assetName
                            )}
                          </td>
                          <td className="p-5">
                            <span className="px-3 py-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] text-slate-300 rounded-lg text-xs font-medium">{record.assetType}</span>
                          </td>
                          {!isLive && (
                          <td className="p-5">
                            <LocationCell record={record} />
                          </td>
                          )}
                          <td className="p-5 text-right font-mono font-medium text-primary-400 text-base">R$ {record.revenue}</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={isLive ? 5 : 6} className="p-12 text-center text-slate-500">
                          No recent transactions found for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'location' && (
          <motion.div
            key="location"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-[var(--bg-panel)] p-8 rounded-3xl shadow-lg border border-[var(--border-subtle)]">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white tracking-tight">Revenue by Location</h3>
                <p className="text-slate-400 mt-1">Detailed breakdown of where your sales are originating.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="h-[400px]">
                  {salesByLocation.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salesByLocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={90}
                          outerRadius={140}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={8}
                        >
                          {salesByLocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`R$ ${value}`, 'Revenue']}
                          contentStyle={{ backgroundColor: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-subtle)', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: 'var(--primary-400)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: '#94a3b8', fontSize: '14px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">No data available</div>
                  )}
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Location Breakdown</h4>
                  <div className="space-y-3">
                    {salesByLocation.map((loc, idx) => (
                      <div key={loc.name} className="flex items-center justify-between p-4 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-subtle)]">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-slate-200 font-medium">{loc.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-primary-400 font-bold font-mono">R$ {loc.value.toLocaleString()}</div>
                          <div className="text-xs text-slate-500">{((loc.value / stats.totalRevenue) * 100).toFixed(1)}% of total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'time' && (
          <motion.div
            key="time"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-[var(--bg-panel)] p-8 rounded-3xl shadow-lg border border-[var(--border-subtle)]">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white tracking-tight">Revenue Over Time</h3>
                <p className="text-slate-400 mt-1">Detailed view of your daily revenue and sales volume.</p>
              </div>
              
              <div className="h-[500px] w-full">
                {revenueOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueOverTime} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenueTime" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 13 }}
                        dy={15}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 13 }}
                        tickFormatter={(val) => `R$${val}`}
                        width={80}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="var(--primary-500)" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorRevenueTime)" 
                        dot={{ r: 5, fill: 'var(--primary-500)', strokeWidth: 0 }}
                        activeDot={{ r: 8, fill: 'var(--primary-500)', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">No data available for this period</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

