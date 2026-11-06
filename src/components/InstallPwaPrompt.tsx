import React, { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'zuxo_pwa_prompt_dismissed_at';
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed() {
  const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const InstallPwaPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari never fires beforeinstallprompt; offer manual instructions instead.
    const iosTimer = isIos ? window.setTimeout(() => setVisible(true), 3000) : undefined;

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === 'accepted') setVisible(false);
    else dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:right-6 md:max-w-sm z-50">
      <div className="flex items-start gap-3 p-3.5 bg-[#071a12]/95 backdrop-blur-md border border-emerald-600/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6),0_0_25px_rgba(0,245,155,0.15)]">
        <img src="/icons/icon-192.png" alt="" className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white font-display leading-tight">Instale o app Zuxo Player</p>
          {deferred ? (
            <p className="text-[11px] text-slate-400 mt-0.5">Acesso rápido na tela inicial, em tela cheia e funcionando offline.</p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Toque em <Share className="inline w-3.5 h-3.5 text-sky-400 -mt-0.5" /> <b className="text-slate-200">Compartilhar</b> e depois em{' '}
              <SquarePlus className="inline w-3.5 h-3.5 text-slate-200 -mt-0.5" /> <b className="text-slate-200">Adicionar à Tela de Início</b>.
            </p>
          )}
          {deferred && (
            <button
              onClick={install}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-500 to-[#00F59B] rounded-xl hover:brightness-110 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar agora
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
