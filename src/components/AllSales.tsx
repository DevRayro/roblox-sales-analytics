import React, { useState, useMemo } from 'react';
import { SaleRecord } from '../types';
import { format, parseISO } from 'date-fns';
import { BuyerCell } from './BuyerCell';
import { LocationCell } from './LocationCell';
import { ArrowLeft, Search, Filter, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AllSalesProps {
  data: SaleRecord[];
  onBack: () => void;
  isLive?: boolean;
}

type SortField = 'date' | 'revenue' | 'location' | 'assetName';
type SortOrder = 'asc' | 'desc';

export function AllSales({ data, onBack, isLive }: AllSalesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Extract unique values for filters
  const locations = useMemo(() => Array.from(new Set(data.map(d => d.location || 'Unknown'))).sort(), [data]);
  const types = useMemo(() => Array.from(new Set(data.map(d => d.assetType || 'Unknown'))).sort(), [data]);
  const months = useMemo(() => {
    const m = new Set<string>();
    data.forEach(d => {
      if (d.dateTime && !isNaN(d.dateTime.getTime())) {
        m.add(format(d.dateTime, 'yyyy-MM'));
      }
    });
    return Array.from(m).sort().reverse();
  }, [data]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(d => 
        (d.assetName && d.assetName.toLowerCase().includes(lowerSearch)) ||
        (d.buyerName && d.buyerName.toLowerCase().includes(lowerSearch)) ||
        (d.buyerUserId && d.buyerUserId.toString().includes(lowerSearch))
      );
    }

    // Filters
    if (locationFilter !== 'all') {
      result = result.filter(d => (d.location || 'Unknown') === locationFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter(d => (d.assetType || 'Unknown') === typeFilter);
    }
    if (monthFilter !== 'all') {
      result = result.filter(d => {
        if (!d.dateTime || isNaN(d.dateTime.getTime())) return false;
        return format(d.dateTime, 'yyyy-MM') === monthFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          const dateA = a.dateTime && !isNaN(a.dateTime.getTime()) ? a.dateTime.getTime() : 0;
          const dateB = b.dateTime && !isNaN(b.dateTime.getTime()) ? b.dateTime.getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'revenue':
          comparison = (a.revenue || 0) - (b.revenue || 0);
          break;
        case 'location':
          comparison = (a.location || '').localeCompare(b.location || '');
          break;
        case 'assetName':
          comparison = (a.assetName || '').localeCompare(b.assetName || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [data, searchTerm, locationFilter, typeFilter, monthFilter, sortField, sortOrder]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, locationFilter, typeFilter, monthFilter]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center space-x-3 md:space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[var(--border-subtle)] rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-white">All Sales</h2>
        <span className="px-3 py-1 bg-[var(--border-subtle)] text-slate-300 rounded-full text-sm font-medium">
          {filteredAndSortedData.length} records
        </span>
      </div>

      <div className="bg-[var(--bg-panel)] p-4 md:p-6 rounded-xl shadow-sm border border-[var(--border-subtle)] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search asset or buyer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all placeholder-slate-500 text-sm"
            />
          </div>

          {/* Location Filter */}
          {!isLive && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none text-sm"
            >
              <option value="all">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          )}

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none text-sm"
            >
              <option value="all">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none text-sm"
            >
              <option value="all">All Months</option>
              {months.map(month => (
                <option key={month} value={month}>{format(parseISO(`${month}-01`), 'MMMM yyyy')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-panel)] rounded-xl shadow-sm border border-[var(--border-subtle)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-base)] text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-subtle)]">
                <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('date')}>
                  <div className="flex items-center space-x-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 font-medium">Buyer</th>
                <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('assetName')}>
                  <div className="flex items-center space-x-1">
                    <span>Asset Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 font-medium">Asset Type</th>
                {!isLive && (
                <th className="p-4 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('location')}>
                  <div className="flex items-center space-x-1">
                    <span>Location</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                )}
                <th className="p-4 font-medium text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('revenue')}>
                  <div className="flex items-center justify-end space-x-1">
                    <span>Revenue</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-300">
              <AnimatePresence initial={false}>
                {paginatedData.map((record, i) => (
                  <motion.tr 
                    key={record.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--border-subtle)]/50 transition-colors group"
                  >
                    <td className="p-4 whitespace-nowrap font-mono text-xs text-slate-400">{record.dateTime && !isNaN(record.dateTime.getTime()) ? format(record.dateTime, 'MMM d, yyyy HH:mm') : 'Unknown'}</td>
                    <td className="p-4">
                      <BuyerCell record={record} />
                    </td>
                    <td className="p-4 font-medium text-slate-200">
                      {record.assetId && record.assetId !== 'Null' ? (
                        <a href={`https://www.roblox.com/catalog/${record.assetId}`} target="_blank" rel="noreferrer" className="hover:text-primary-400 hover:underline transition-colors">
                          {record.assetName}
                        </a>
                      ) : (
                        record.assetName
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-[var(--border-subtle)] text-slate-300 rounded text-xs font-medium">{record.assetType}</span>
                    </td>
                    {!isLive && (
                    <td className="p-4">
                      <LocationCell record={record} />
                    </td>
                    )}
                    <td className="p-4 text-right font-mono font-medium text-primary-400">R$ {record.revenue}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={isLive ? 5 : 6} className="p-8 text-center text-slate-500">
                    No sales found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-base)]/50">
            <div className="text-sm text-slate-400">
              Showing <span className="font-medium text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)}</span> of <span className="font-medium text-white">{filteredAndSortedData.length}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm font-medium text-slate-300 hover:bg-[var(--border-subtle)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary-500 text-white border border-primary-500'
                          : 'border border-[var(--border-subtle)] text-slate-400 hover:bg-[var(--border-subtle)] hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-sm font-medium text-slate-300 hover:bg-[var(--border-subtle)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
