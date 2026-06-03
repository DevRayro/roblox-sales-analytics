import React, { useState, useEffect } from 'react';
import { Key, AlertTriangle, Loader2, Save, Trash2, Bookmark, Check, X, Users } from 'lucide-react';
import { SaleRecord, SavedProfile } from '../types';

interface CookieConnectProps {
  onDataFetched: (data: SaleRecord[], credentials: { groupId: string, cookie: string, name?: string, iconUrl?: string }) => void;
}

export function CookieConnect({ onDataFetched }: CookieConnectProps) {
  const [groupId, setGroupId] = useState('');
  const [cookie, setCookie] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [isFetchingGroupInfo, setIsFetchingGroupInfo] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<{ name: string, iconUrl: string | null } | null>(null);

  useEffect(() => {
    const savedProfiles = localStorage.getItem('roblox_saved_profiles');
    if (savedProfiles) {
      try {
        setProfiles(JSON.parse(savedProfiles));
      } catch (e) {}
    }

    const savedGroupId = localStorage.getItem('roblox_group_id');
    const savedCookie = localStorage.getItem('roblox_cookie');
    if (savedGroupId) setGroupId(savedGroupId);
    if (savedCookie) setCookie(savedCookie);
  }, []);

  const saveProfilesToStorage = (newProfiles: SavedProfile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem('roblox_saved_profiles', JSON.stringify(newProfiles));
  };

  const initiateSaveProfile = async () => {
    if (!groupId || !cookie) return;

    setIsFetchingGroupInfo(true);
    setError(null);

    try {
      const res = await fetch(`/api/roblox/group-info/${groupId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch group info');
      }

      setPendingProfile({
        name: data.name || `Group ${groupId}`,
        iconUrl: data.iconUrl
      });
    } catch (err: any) {
      setError(`Could not fetch group info: ${err.message}`);
    } finally {
      setIsFetchingGroupInfo(false);
    }
  };

  const confirmSaveProfile = () => {
    if (!pendingProfile || !groupId || !cookie) return;

    const newProfile: SavedProfile = {
      id: Date.now().toString(),
      name: pendingProfile.name,
      groupId,
      cookie,
      iconUrl: pendingProfile.iconUrl || undefined
    };

    saveProfilesToStorage([...profiles, newProfile]);
    setPendingProfile(null);
  };

  const handleDeleteProfile = (id: string) => {
    saveProfilesToStorage(profiles.filter(p => p.id !== id));
  };

  const handleSelectProfile = (profile: SavedProfile) => {
    setGroupId(profile.groupId);
    setCookie(profile.cookie);
  };

  const parseTx = (tx: any, index: number): SaleRecord => ({
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
  });

  const getCachedData = (gId: string): { data: SaleRecord[], complete: boolean } | null => {
    try {
      const raw = localStorage.getItem(`roblox_sales_cache_${gId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Support both old format (array) and new format ({ data, complete })
      if (Array.isArray(parsed)) {
        // Old format — treat as incomplete so it re-fetches fully
        return { data: parsed.map((r: any) => ({ ...r, dateTime: new Date(r.dateTime) })), complete: false };
      }
      return {
        data: (parsed.data || []).map((r: any) => ({ ...r, dateTime: new Date(r.dateTime) })),
        complete: !!parsed.complete
      };
    } catch { return null; }
  };

  const setCachedData = (gId: string, data: SaleRecord[], complete: boolean) => {
    try {
      localStorage.setItem(`roblox_sales_cache_${gId}`, JSON.stringify({ data, complete }));
    } catch {
      // localStorage might be full — clear old caches
      const keys = Object.keys(localStorage).filter(k => k.startsWith('roblox_sales_cache_'));
      if (keys.length > 3) {
        keys.slice(0, keys.length - 3).forEach(k => localStorage.removeItem(k));
        try { localStorage.setItem(`roblox_sales_cache_${gId}`, JSON.stringify({ data, complete })); } catch {}
      }
    }
  };

  const fetchAllPages = async (gId: string, ck: string, existingIds: Set<string>, onProgress: (msg: string) => void): Promise<{ transactions: any[], reachedEnd: boolean }> => {
    let allTransactions: any[] = [];
    let cursor = "";
    let pages = 0;
    let consecutiveRetries = 0;
    let reachedExisting = false;
    let reachedEnd = false;

    while (true) {
      let res: Response;
      try {
        res = await fetch('/api/roblox/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: gId, cookie: ck, cursor: cursor || undefined })
        });
      } catch (err) {
        // Network error — retry
        consecutiveRetries++;
        if (consecutiveRetries > 15) {
          if (allTransactions.length > 0) break;
          throw new Error('Network error: too many failed requests');
        }
        const wait = Math.min(consecutiveRetries * 2, 30);
        onProgress(`Network error. Retrying in ${wait}s... (${allTransactions.length} fetched)`);
        await new Promise(r => setTimeout(r, wait * 1000));
        continue;
      }

      if (!res.ok) {
        consecutiveRetries++;
        if (res.status === 429) {
          const wait = Math.min(5 + consecutiveRetries * 5, 60);
          onProgress(`Rate limited. Waiting ${wait}s then resuming... (${allTransactions.length} fetched so far)`);
          await new Promise(r => setTimeout(r, wait * 1000));
          continue;
        }
        // Other errors (500, 403, etc.) — also retry
        if (consecutiveRetries > 10) {
          if (allTransactions.length > 0) break;
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `API error ${res.status}`);
        }
        const wait = Math.min(3 + consecutiveRetries * 3, 30);
        onProgress(`Server error (${res.status}). Retrying in ${wait}s... (${allTransactions.length} fetched so far)`);
        await new Promise(r => setTimeout(r, wait * 1000));
        continue;
      }

      const data = await res.json();
      consecutiveRetries = 0; // Reset on success

      if (!data.data || data.data.length === 0) {
        reachedEnd = true;
        break;
      }

      // If we have existing data, stop when we reach known transactions
      if (existingIds.size > 0) {
        for (const tx of data.data) {
          const txId = tx.idHash || tx.id?.toString();
          if (txId && existingIds.has(txId)) {
            reachedExisting = true;
            break;
          }
          allTransactions.push(tx);
        }
      } else {
        allTransactions = allTransactions.concat(data.data);
      }

      onProgress(`Fetched ${allTransactions.length} transactions (page ${pages + 1})...`);

      if (reachedExisting) break;
      if (!data.nextPageCursor) {
        reachedEnd = true;
        break;
      }
      cursor = data.nextPageCursor;
      pages++;

      // Delay between pages to avoid rate limits — slower = more reliable
      const delay = pages < 10 ? 200 : pages < 50 ? 500 : 1000;
      await new Promise(r => setTimeout(r, delay));
    }

    return { transactions: allTransactions, reachedEnd };
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setFetchProgress('Initializing connection...');

    try {
      // Validate the cookie up front so an invalid cookie gives a clear message
      // instead of surfacing as a generic fetch failure mid-way.
      setFetchProgress('Validating cookie...');
      try {
        const authRes = await fetch('/api/roblox/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie })
        });
        if (authRes.status === 401) {
          throw new Error('Invalid .ROBLOSECURITY cookie. Please check it and try again.');
        }
        // Other auth errors (network/server) shouldn't block — the fetch loop has its own retries.
      } catch (authErr: any) {
        if (authErr?.message?.includes('Invalid .ROBLOSECURITY')) throw authErr;
        // Ignore non-auth failures here; proceed to the resilient fetch loop.
      }

      // Check for cached data first
      const cached = getCachedData(groupId);
      const cachedData = cached?.data || null;
      const cacheIsComplete = cached?.complete || false;

      // Only use existingIds for incremental fetch if cache is complete
      // If cache is incomplete (e.g. old buggy fetch), do a full re-fetch
      const existingIds = (cacheIsComplete && cachedData && cachedData.length > 0)
        ? new Set<string>(cachedData.map(d => d.id))
        : new Set<string>();

      if (cachedData && cachedData.length > 0) {
        if (cacheIsComplete) {
          setFetchProgress(`Found ${cachedData.length} cached transactions. Fetching new ones...`);
        } else {
          setFetchProgress(`Found ${cachedData.length} cached transactions (incomplete). Re-fetching all...`);
        }
      }

      const { transactions: newTransactions, reachedEnd } = await fetchAllPages(groupId, cookie, existingIds, setFetchProgress);

      let parsedData: SaleRecord[];
      let isComplete = false;

      if (newTransactions.length > 0) {
        const newParsed = newTransactions.map(parseTx);
        if (cacheIsComplete && cachedData && cachedData.length > 0) {
          // Incremental: merge new + cached, deduplicate
          const merged = [...newParsed, ...cachedData];
          const seen = new Set<string>();
          parsedData = merged.filter(r => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });
          isComplete = true; // Cache was already complete, we just added new ones
        } else {
          // Full fetch
          parsedData = newParsed;
          isComplete = reachedEnd; // Only mark complete if we reached the very end
        }
      } else if (cacheIsComplete && cachedData && cachedData.length > 0) {
        parsedData = cachedData;
        isComplete = true;
        setFetchProgress('No new transactions. Using cached data.');
      } else if (cachedData && cachedData.length > 0) {
        // Re-fetch returned nothing (e.g. it broke early on errors).
        // Don't wipe the user's previously cached data — fall back to it.
        parsedData = cachedData;
        isComplete = false;
        setFetchProgress('Could not fetch new data. Using cached data.');
      } else {
        parsedData = [];
        isComplete = reachedEnd;
      }

      // Sort by date descending
      parsedData.sort((a, b) => {
        const dateA = a.dateTime && !isNaN(a.dateTime.getTime()) ? a.dateTime.getTime() : 0;
        const dateB = b.dateTime && !isNaN(b.dateTime.getTime()) ? b.dateTime.getTime() : 0;
        return dateB - dateA;
      });

      // Cache the data
      setCachedData(groupId, parsedData, isComplete);
      localStorage.setItem('roblox_group_id', groupId);
      localStorage.setItem('roblox_cookie', cookie);

      const matchedProfile = profiles.find(p => p.groupId === groupId);

      onDataFetched(parsedData, {
        groupId,
        cookie,
        name: matchedProfile?.name,
        iconUrl: matchedProfile?.iconUrl
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Confirmation Modal */}
      {pendingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-base)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">Save Profile</h3>

            <div className="flex flex-col items-center justify-center mb-6 p-4 bg-[var(--bg-base)] rounded-xl border border-[var(--border-subtle)]">
              {pendingProfile.iconUrl ? (
                <img src={pendingProfile.iconUrl} alt={pendingProfile.name} className="w-20 h-20 rounded-xl mb-3 shadow-sm" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-[var(--border-subtle)] mb-3 flex items-center justify-center">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <p className="text-white font-medium text-center">{pendingProfile.name}</p>
              <p className="text-slate-400 text-sm mt-1">ID: {groupId}</p>
            </div>

            <p className="text-slate-400 text-center mb-6">Are you sure you want to save this group profile?</p>

            <div className="flex space-x-3">
              <button
                onClick={() => setPendingProfile(null)}
                className="flex-1 py-2.5 bg-[var(--border-subtle)] text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={confirmSaveProfile}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center shadow-sm"
              >
                <Check className="w-4 h-4 mr-2" />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Saved Profiles Sidebar */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center mb-4">
            <Bookmark className="w-4 h-4 mr-2 text-primary-500" />
            Saved Profiles
          </h3>

          {profiles.length === 0 ? (
            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6 text-center text-slate-400 text-sm shadow-sm">
              No saved profiles yet. Connect a group and save it to quickly access it later.
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-3 flex items-center justify-between group hover:border-primary-500/50 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleSelectProfile(profile)}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    {profile.iconUrl ? (
                      <img src={profile.iconUrl} alt={profile.name} className="w-10 h-10 rounded-lg flex-shrink-0 border border-[var(--border-subtle)] object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-slate-500" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h4 className="text-slate-200 font-medium truncate text-sm">{profile.name}</h4>
                      <p className="text-xs text-slate-500 truncate font-mono">ID: {profile.groupId}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProfile(profile.id);
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Delete Profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connection Form */}
        <div className="md:col-span-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-8 shadow-sm h-fit">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 bg-primary-500/10 text-primary-400 rounded-xl border border-primary-500/20">
              <Key className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white tracking-tight">Connect via Cookie</h3>
              <p className="text-sm text-slate-400 mt-1">Automatically fetch live sales data from your group.</p>
            </div>
          </div>

          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200/80 leading-relaxed">
              <strong className="text-amber-400 font-semibold">Security Warning:</strong> Your <code className="bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">.ROBLOSECURITY</code> cookie provides full access to your account.
              Never share it with anyone. This app sends it to a server-side proxy to fetch data directly from Roblox.
              It is stored locally in your browser for auto-refreshing. Use this feature at your own risk.
            </div>
          </div>

          <form onSubmit={handleConnect} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Group ID</label>
              <input
                type="text"
                required
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all placeholder-slate-600 font-mono text-sm"
                placeholder="e.g. 1234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">.ROBLOSECURITY Cookie</label>
              <input
                type="password"
                required
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all placeholder-slate-600 font-mono text-sm"
                placeholder="_|WARNING:-DO-NOT-SHARE-THIS..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={initiateSaveProfile}
                disabled={!groupId || !cookie || isFetchingGroupInfo}
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed font-medium bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20 hover:bg-primary-500/20 transition-colors"
              >
                {isFetchingGroupInfo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isFetchingGroupInfo ? 'Fetching Info...' : 'Save as Profile'}</span>
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !groupId || !cookie}
              className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-medium hover:bg-primary-500 transition-all flex flex-col items-center justify-center disabled:opacity-70 mt-6 shadow-sm hover:shadow-md min-h-[56px]"
            >
              {isLoading ? (
                <>
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {fetchProgress || 'Connecting & Fetching...'}
                  </div>
                  <span className="text-xs text-primary-100/70 mt-1 font-normal px-4 text-center">This may take a minute for large groups to safely bypass rate limits.</span>
                </>
              ) : (
                'Connect & Fetch Data'
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
