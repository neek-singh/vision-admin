'use client';

import { useEffect } from 'react';

/**
 * PwaBootstrap: Client component handling parse-time Service Worker registration,
 * visibility change polling, hourly background update checks, controllerchange
 * update notifications, and background message forwarding.
 */
export function PwaBootstrap() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // In development mode (localhost / Turbopack), unregister any active Service Workers
    // and purge cache storage to prevent Fast Refresh / RSC stream chunk desynchronization.
    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    // Determine if this is the initial installation or a subsequent update
    const isFirstInstall = !navigator.serviceWorker.controller;

    let visibilityHandler: (() => void) | null = null;
    let hourlyIntervalId: NodeJS.Timeout | null = null;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Poll for Service Worker updates whenever the tab or window becomes visible
        visibilityHandler = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch((err) => {
              console.warn('[PWA] Visibility update check failed:', err);
            });
          }
        };
        document.addEventListener('visibilitychange', visibilityHandler);

        // Hourly background update poll for long-running kiosk displays and persistent tabs
        hourlyIntervalId = setInterval(() => {
          registration.update().catch((err) => {
            console.warn('[PWA] Hourly update check failed:', err);
          });
        }, 60 * 60 * 1000);
      })
      .catch((err) => {
        console.error('[PWA] Service Worker registration failed:', err);
      });

    // Update detection: Ignore first install, dispatch custom event only on active controller upgrade
    const handleControllerChange = () => {
      if (!isFirstInstall) {
        window.dispatchEvent(new CustomEvent('vision-pwa-update-available'));
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Forward background freshness messages dispatched by Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CONTENT_UPDATED') {
        window.dispatchEvent(
          new CustomEvent('vision-pwa-content-updated', { detail: event.data })
        );
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
      if (hourlyIntervalId) {
        clearInterval(hourlyIntervalId);
      }
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
}

export default PwaBootstrap;
