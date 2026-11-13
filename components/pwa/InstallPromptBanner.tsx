'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * InstallPromptBanner: Non-intrusive install prompt capturing beforeinstallprompt
 * on Chromium/Android devices, and providing step-by-step Add-to-Home-Screen guidance
 * on iOS Safari when running in browser mode.
 */
export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<'chromium' | 'ios' | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Do not show if app is already running in standalone display mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        Boolean((window.navigator as unknown as { standalone?: boolean }).standalone));

    if (isStandalone) {
      return;
    }

    // Do not show if dismissed in this browser session/storage
    try {
      if (localStorage.getItem('vision_pwa_install_dismissed') === 'true') {
        return;
      }
    } catch {
      // Ignore localStorage access restrictions
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/.test(userAgent) && !('MSStream' in window);

    // 1. Android / Chromium handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform('chromium');
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. iOS Safari detection
    if (isIos && !isStandalone) {
      setPlatform('ios');
      setIsVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (platform === 'chromium' && deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else if (platform === 'ios') {
      setShowIosSteps((prev) => !prev);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('vision_pwa_install_dismissed', 'true');
    } catch {
      // Ignore localStorage write error
    }
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-install-title"
      className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-40 rounded-xl border border-blue-500/30 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
          {platform === 'ios' ? (
            <Smartphone className="h-5 w-5" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 id="pwa-install-title" className="text-sm font-semibold text-white">
            {platform === 'ios' ? 'Install Vision Admin on iOS' : 'Install Vision Admin'}
          </h4>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            {platform === 'ios'
              ? 'Add to your Home Screen for instant offline access to attendance, students, and fees.'
              : 'Install on your device for instant offline access, camera scanner check-ins, and push updates.'}
          </p>

          {/* iOS Safari Guided Steps Accordion */}
          {platform === 'ios' && showIosSteps && (
            <div className="mt-3 space-y-2 rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-[10px] font-bold text-blue-300">
                  1
                </span>
                <span>
                  Tap the <Share className="inline h-3.5 w-3.5 text-blue-400 mx-1 align-middle" /> <strong>Share</strong> button in Safari toolbar.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-[10px] font-bold text-blue-300">
                  2
                </span>
                <span>
                  Scroll down and tap <PlusSquare className="inline h-3.5 w-3.5 text-blue-400 mx-1 align-middle" /> <strong>Add to Home Screen</strong>.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-[10px] font-bold text-blue-300">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> in the top right corner.
                </span>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {platform === 'ios'
                ? (showIosSteps ? 'Hide Instructions' : 'View Install Steps')
                : 'Install App'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              Not Now
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          aria-label="Dismiss install banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default InstallPromptBanner;
