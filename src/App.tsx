import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { CookieConnect } from './components/CookieConnect';
import { AllSales } from './components/AllSales';
import { Settings as SettingsView } from './components/Settings';
import { SaleRecord, SavedProfile } from './types';
import { RefreshCw, FileSpreadsheet, Key, LayoutDashboard, List, Settings, LogOut, Users, Github, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [data, setData] = useState<SaleRecord[] | null>(null);
  const [mode, setMode] = useState<'csv' | 'cookie'>('csv');
  const [view, setView] = useState<'dashboard' | 'all_sales' | 'settings'>('dashboard');
  const [credentials, setCredentials] = useState<{ groupId: string, cookie: string, name?: string, iconUrl?: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState<string>('emerald');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isRefreshingRef = React.useRef(false);

  // Load cached data and theme on startup
  useEffect(() => {
    const savedTheme = localStorage.getItem('roblox_theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    const loadCachedData = async () => {
      const savedGroupId = localStorage.getItem('roblox_group_id');
      const savedCookie = localStorage.getItem('roblox_cookie');
      if (savedGroupId && savedCookie) {
        setCredentials({ groupId: savedGroupId, cookie: savedCookie });
      }
    };
    loadCachedData();
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('roblox_theme', newTheme);
    if (newTheme === 'emerald') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const handleReset = async () => {
    setData(null);
    setCredentials(null);
    setView('dashboard');
    setMobileMenuOpen(false);
    localStorage.removeItem('roblox_group_id');
    localStorage.removeItem('roblox_cookie');
  };

  const handleDataFetched = async (newData: SaleRecord[], creds: { groupId: string, cookie: string, name?: string, iconUrl?: string }) => {
    setData(newData);
    setCredentials(creds);
    setView('dashboard');
  };

  const refreshData = async () => {
    if (!credentials || isRefreshingRef.current) return;
    setIsRefreshing(true);
    isRefreshingRef.current = true;
    try {
      let newTransactions: any[] = [];
      let cursor = "";
      let consecutiveRetries = 0;
      let reachedExisting = false;

      const existingIds = new Set(data?.map(d => d.id) || []);

      while (true) {
        let res: Response;
        try {
          res = await fetch('/api/roblox/sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              groupId: credentials.groupId,
              cookie: credentials.cookie,
              cursor: cursor || undefined
            })
          });
        } catch {
          consecutiveRetries++;
          if (consecutiveRetries > 10) break;
          await new Promise(r => setTimeout(r, consecutiveRetries * 2000));
          continue;
        }

        if (!res.ok) {
          consecutiveRetries++;
          if (consecutiveRetries > 10) break;
          const wait = res.status === 429
            ? Math.min(5 + consecutiveRetries * 5, 60)
            : Math.min(3 + consecutiveRetries * 3, 30);
          await new Promise(r => setTimeout(r, wait * 1000));
          continue;
        }

        const resData = await res.json();
        consecutiveRetries = 0;

        if (!resData.data || resData.data.length === 0) break;

        for (const tx of resData.data) {
          const txId = tx.idHash || tx.id?.toString();
          if (txId && existingIds.has(txId)) {
            reachedExisting = true;
            break;
          }
          newTransactions.push(tx);
        }

        if (reachedExisting || !resData.nextPageCursor) break;
        cursor = resData.nextPageCursor;
        await new Promise(r => setTimeout(r, 200));
      }

      if (newTransactions.length > 0) {
        const parsedNewData: SaleRecord[] = newTransactions
          .map((tx: any, index: number) => {
            return {
              id: tx.idHash || tx.id?.toString() || `tx-${index}-${Date.now()}`,
              buyerUserId: tx.agent?.id?.toString() || 'Unknown',
              buyerName: tx.agent?.name || 'Unknown',
              dateTime: new Date(tx.created),
              location: 'Unknown',
              locationId: 'Null',
              universeId: 'Null',
              universe: 'Unknown',
              assetId: tx.details?.id?.toString() || 'Null',
              assetName: tx.details?.name || 'Unknown',
              assetType: tx.details?.type || 'Unknown',
              holdStatus: tx.isPending ? 'Pending' : 'Released',
              revenue: tx.currency?.amount || 0,
              price: undefined
            };
          });

        setData(prev => {
          const prevData = prev || [];
          const mergedData = [...parsedNewData, ...prevData];

          // Remove duplicates based on ID
          const uniqueIds = new Set();
          const uniqueMerged = mergedData.filter(item => {
            if (uniqueIds.has(item.id)) return false;
            uniqueIds.add(item.id);
            return true;
          });

          return uniqueMerged.sort((a, b) => {
            const dateA = a.dateTime && !isNaN(a.dateTime.getTime()) ? a.dateTime.getTime() : 0;
            const dateB = b.dateTime && !isNaN(b.dateTime.getTime()) ? b.dateTime.getTime() : 0;
            return dateB - dateA;
          });
        });
      }
    } catch (err) {
      console.error('Failed to refresh data', err);
    } finally {
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  };

  // Auto-refresh every 10 seconds if connected via cookie
  useEffect(() => {
    if (data && credentials) {
      const interval = setInterval(() => {
        refreshData();
      }, 10 * 1000);
      return () => clearInterval(interval);
    }
  }, [data, credentials]);

  const handleNavClick = (newView: 'dashboard' | 'all_sales' | 'settings') => {
    setView(newView);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-base text-slate-300 font-sans selection:bg-primary-500/30 selection:text-primary-200 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-panel border-r border-subtle flex-col justify-between flex-shrink-0 z-20 shadow-xl">
        <div>
          <div className="h-20 flex items-center px-6 border-b border-subtle">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-1 rounded-xl shadow-lg shadow-primary-500/20 flex items-center justify-center relative overflow-hidden flex-shrink-0 w-10 h-10">
                <div className="absolute inset-0 bg-white/10 rotate-45 transform translate-x-2 -translate-y-2"></div>
                <img
                  src="/logo.jpeg"
                  alt="Logo"
                  className="w-full h-full object-cover rounded-lg relative z-10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://picsum.photos/seed/anime/200/200";
                  }}
                />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Roblox<span className="text-primary-400">Analytics</span>
              </h1>
            </div>
          </div>

          <nav className="p-4 space-y-2">
            <button
              onClick={() => setView('dashboard')}
              disabled={!data}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${
                view === 'dashboard' && data
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-panel border border-transparent disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setView('all_sales')}
              disabled={!data}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${
                view === 'all_sales' && data
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-panel border border-transparent disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <List className="w-5 h-5" />
              <span>All Sales</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-subtle space-y-2">
          <button
            onClick={() => setView('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${
              view === 'settings'
                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-panel border border-transparent'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <a
            href="https://github.com/DevRayro/roblox-sales-analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-slate-400 hover:text-slate-200 hover:bg-panel border border-transparent transition-all"
          >
            <Github className="w-5 h-5" />
            <span>GitHub</span>
          </a>
          {data && (
            <button
              onClick={handleReset}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-auto md:h-20 bg-base/80 backdrop-blur-md border-b border-subtle flex items-center justify-between px-4 md:px-8 z-10 flex-shrink-0 safe-area-top py-3 md:py-0">
          <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight truncate">
              {data ? (view === 'dashboard' ? 'Overview' : view === 'settings' ? 'Settings' : 'Transactions') : 'Connect Source'}
            </h2>
            {credentials && (
              <div className="hidden md:flex items-center px-3 py-1.5 bg-panel border border-subtle rounded-lg shadow-sm">
                {credentials.iconUrl ? (
                  <img src={credentials.iconUrl} alt="Group Icon" className="w-6 h-6 rounded mr-2 border border-subtle object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded bg-base border border-subtle mr-2 flex items-center justify-center">
                    <Users className="w-3 h-3 text-slate-500" />
                  </div>
                )}
                <span className="text-sm font-medium text-slate-200 mr-2">{credentials.name || 'Group'}</span>
                <span className="text-xs text-slate-500 font-mono bg-base px-1.5 py-0.5 rounded">ID: {credentials.groupId}</span>
              </div>
            )}
          </div>

          {data && credentials && (
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex items-center space-x-2 bg-[#131B2C] hover:bg-[#1E293B] text-slate-300 px-3 md:px-4 py-2 rounded-xl transition-all border border-[#1E293B] hover:border-slate-600 shadow-sm disabled:opacity-50 flex-shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary-400' : ''}`} />
              <span className="hidden md:inline">{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}
        </header>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-panel border-b border-subtle z-30 overflow-hidden"
            >
              <div className="p-3 space-y-1">
                {credentials && (
                  <div className="flex items-center px-3 py-2 mb-2 bg-base rounded-lg border border-subtle">
                    {credentials.iconUrl ? (
                      <img src={credentials.iconUrl} alt="Group Icon" className="w-6 h-6 rounded mr-2 border border-subtle object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded bg-base border border-subtle mr-2 flex items-center justify-center">
                        <Users className="w-3 h-3 text-slate-500" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-slate-200 mr-2 truncate">{credentials.name || 'Group'}</span>
                    <span className="text-xs text-slate-500 font-mono">ID: {credentials.groupId}</span>
                  </div>
                )}
                <a
                  href="https://github.com/DevRayro/roblox-sales-analytics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-base transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Github className="w-5 h-5" />
                  <span className="text-sm font-medium">GitHub</span>
                </a>
                {data && (
                  <button
                    onClick={handleReset}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Disconnect</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 relative">
          <AnimatePresence mode="wait">
            {!data ? (
              <motion.div
                key="connect"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto"
              >
                <div className="text-center mb-8 md:mb-12">
                  <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3 md:mb-4 tracking-tight">Analyze Your Group Sales</h2>
                  <p className="text-sm md:text-lg text-slate-400 max-w-2xl mx-auto">
                    Upload your Roblox group sales CSV file or connect your cookie to fetch live data and instantly generate beautiful charts.
                  </p>
                </div>

                <div className="flex justify-center mb-8 md:mb-12">
                  <div className="bg-[#131B2C] p-1.5 rounded-2xl shadow-sm border border-[#1E293B] inline-flex">
                    <button
                      onClick={() => setMode('csv')}
                      className={`flex items-center space-x-2 px-4 md:px-8 py-2.5 md:py-3 rounded-xl font-medium transition-all text-sm md:text-base ${
                        mode === 'csv' ? 'bg-primary-500/10 text-primary-400 shadow-sm border border-primary-500/20' : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-subtle'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5" />
                      <span>Upload CSV</span>
                    </button>
                    <button
                      onClick={() => setMode('cookie')}
                      className={`flex items-center space-x-2 px-4 md:px-8 py-2.5 md:py-3 rounded-xl font-medium transition-all text-sm md:text-base ${
                        mode === 'cookie' ? 'bg-primary-500/10 text-primary-400 shadow-sm border border-primary-500/20' : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-subtle'
                      }`}
                    >
                      <Key className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden md:inline">Live Connection</span><span className="md:hidden">Live</span>
                    </button>
                  </div>
                </div>

                <div className="w-full">
                  {mode === 'csv' ? (
                    <FileUpload onDataParsed={(d) => { setData(d); setView('dashboard'); }} />
                  ) : (
                    <CookieConnect onDataFetched={handleDataFetched} />
                  )}
                </div>
              </motion.div>
            ) : view === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Dashboard
                  data={data}
                  onRefresh={credentials ? refreshData : undefined}
                  isRefreshing={isRefreshing}
                  onViewAllSales={() => setView('all_sales')}
                  isLive={!!credentials}
                />
              </motion.div>
            ) : view === 'settings' ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SettingsView
                  onBack={() => setView('dashboard')}
                  currentTheme={theme}
                  onThemeChange={handleThemeChange}
                />
              </motion.div>
            ) : (
              <motion.div
                key="all_sales"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AllSales
                  data={data}
                  onBack={() => setView('dashboard')}
                  isLive={!!credentials}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation */}
        {data && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-panel/95 backdrop-blur-md border-t border-subtle z-40 safe-area-bottom">
            <div className="flex items-center justify-around px-2 py-1">
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all min-w-[64px] ${
                  view === 'dashboard' ? 'text-primary-400' : 'text-slate-500'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1">Dashboard</span>
              </button>
              <button
                onClick={() => handleNavClick('all_sales')}
                className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all min-w-[64px] ${
                  view === 'all_sales' ? 'text-primary-400' : 'text-slate-500'
                }`}
              >
                <List className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1">Sales</span>
              </button>
              <button
                onClick={() => handleNavClick('settings')}
                className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all min-w-[64px] ${
                  view === 'settings' ? 'text-primary-400' : 'text-slate-500'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1">Settings</span>
              </button>
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}
