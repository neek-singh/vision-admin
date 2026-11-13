'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * UpdateNotificationToast: Floating in-app toast notification displayed when a new
 * Service Worker version has activated in the background. Provides one-tap Reload
 * and Dismiss actions.
 */
export function UpdateNotificationToast() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('vision-pwa-update-available', handleUpdate);
    return () => {
      window.removeEventListener('vision-pwa-update-available', handleUpdate);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <aside
      aria-label="App update available"
      role="alert"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-blue-500/30 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
        <RefreshCw className="h-5 w-5 animate-spin" />
      </div>
      <div>
        <p className="text-sm font-semibold">Update Ready</p>
        <p className="text-xs text-slate-400">A new version of Vision Admin is available.</p>
      </div>
      <div className="ml-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setUpdateAvailable(false)}
          className="rounded-lg p-1.5 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
          aria-label="Dismiss update notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

export default UpdateNotificationToast;
