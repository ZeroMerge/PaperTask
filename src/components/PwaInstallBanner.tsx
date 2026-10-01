import React, { useEffect, useState, useRef } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY_PWA_INSTALLED = 'papertask_pwa_installed';
const STORAGE_KEY_PWA_DISMISSED = 'papertask_pwa_prompt_dismissed';

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Check if already running as installed standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      localStorage.setItem(STORAGE_KEY_PWA_INSTALLED, 'true');
      return;
    }

    // 2. Check if user already installed or previously dismissed the prompt
    const hasInstalled = localStorage.getItem(STORAGE_KEY_PWA_INSTALLED) === 'true';
    const hasDismissed = localStorage.getItem(STORAGE_KEY_PWA_DISMISSED) === 'true';

    if (hasInstalled || hasDismissed) {
      return;
    }

    // 3. Listen for browser beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsVisible(true);

      // Auto-dismiss after 10 seconds if user takes no action
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        localStorage.setItem(STORAGE_KEY_PWA_DISMISSED, 'true');
      }, 10000);
    };

    // 4. Listen for appinstalled event to permanently silence prompt
    const handleAppInstalled = () => {
      setIsVisible(false);
      localStorage.setItem(STORAGE_KEY_PWA_INSTALLED, 'true');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        localStorage.setItem(STORAGE_KEY_PWA_INSTALLED, 'true');
      } else {
        localStorage.setItem(STORAGE_KEY_PWA_DISMISSED, 'true');
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    } finally {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleCancelClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY_PWA_DISMISSED, 'true');
  };

  if (!isVisible || !deferredPrompt) return null;

  return (
    <aside
      aria-label="Install PaperTask Application"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#00213f] text-white p-3.5 sm:p-4 rounded-md shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 border-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded bg-[#6314ff] flex items-center justify-center shrink-0">
          <img src="/papertask_favicon.svg" alt="PaperTask Icon" className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-black tracking-tight text-white uppercase">Install PaperTask</h4>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <p className="text-[11px] text-zinc-300 truncate">
            Add to your home screen for quick offline printing
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#6314ff] hover:bg-[#7835ff] text-white text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>

        <button
          type="button"
          onClick={handleCancelClick}
          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Cancel"
          aria-label="Dismiss install banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
