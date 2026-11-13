'use client';

import { useEffect, useState, useCallback } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

type SyncState = 'online' | 'offline' | 'syncing';

/**
 * OfflineSyncBanner: Global status indicator tracking browser connectivity (online/offline)
 * and pending offline mutation queue status. Renders sticky alerts when offline or syncing.
 */
export function OfflineSyncBanner() {
  const [syncState, setSyncState] = useState<SyncState>('online');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  // Safe native IndexedDB reader for pending mutations (zero runtime dependencies)
  const checkPendingQueue = useCallback(async () => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;
    try {
      const req = window.indexedDB.open('vision-offline-db');
      req.onsuccess = () => {
        const db = req.result;
        if (db.objectStoreNames.contains('mutation_queue')) {
          const tx = db.transaction('mutation_queue', 'readonly');
          const store = tx.objectStore('mutation_queue');
          const countReq = store.count();
          countReq.onsuccess = () => {
            setPendingCount(countReq.result || 0);
          };
        }
        db.close();
      };
      req.onerror = () => {
        // Silently handle database open errors
      };
    } catch {
      // Database not yet created or indexedDB restricted
    }
  }, []);

  useEffect(() => {
    let reconnectedTimer: NodeJS.Timeout | null = null;

    const handleOnline = () => {
      setSyncState('syncing');
      checkPendingQueue().then(() => {
        setShowReconnectedToast(true);
        if (reconnectedTimer) clearTimeout(reconnectedTimer);
        reconnectedTimer = setTimeout(() => {
          setShowReconnectedToast(false);
          setSyncState('online');
        }, 3500);
      });
    };

    const handleOffline = () => {
      setSyncState('offline');
      checkPendingQueue();
    };

    const handleQueueChange = () => {
      checkPendingQueue();
    };

    // Initial check on mount
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncState('offline');
    }
    checkPendingQueue();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('vision-sync-queue-updated', handleQueueChange);

    return () => {
      if (reconnectedTimer) clearTimeout(reconnectedTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('vision-sync-queue-updated', handleQueueChange);
    };
  }, [checkPendingQueue]);

  if (syncState === 'offline') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-30 flex items-center justify-between border-b border-amber-500/30 bg-amber-950/80 px-4 py-2 text-xs text-amber-200 backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-semibold">Offline Mode</span>
          <span className="hidden sm:inline">— Operating on locally cached database.</span>
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-300 border border-amber-500/30">
            {pendingCount} mutation{pendingCount > 1 ? 's' : ''} queued
          </span>
        )}
      </div>
    );
  }

  if (syncState === 'syncing') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-30 flex items-center justify-between border-b border-blue-500/30 bg-blue-950/80 px-4 py-2 text-xs text-blue-200 backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-400 shrink-0" />
          <span className="font-semibold">Syncing Offline Data...</span>
          <span className="hidden sm:inline">Flushing pending records to cloud database.</span>
        </div>
        {pendingCount > 0 && (
          <span className="font-mono text-xs">{pendingCount} remaining</span>
        )}
      </div>
    );
  }

  if (showReconnectedToast) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-30 flex items-center gap-2 border-b border-emerald-500/30 bg-emerald-950/80 px-4 py-2 text-xs text-emerald-200 backdrop-blur-md animate-in fade-in"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <span className="font-semibold">Back Online</span>
        <span>— All offline records synchronized successfully.</span>
      </div>
    );
  }

  return null;
}

export default OfflineSyncBanner;
