import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  X, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { PushNotification } from '../types';
import { soundEffects } from '../utils/audio';

interface PushNotificationToastProps {
  notification: PushNotification | null;
  onClose: () => void;
  onActionClick?: (notification: PushNotification) => void;
}

export const PushNotificationToast: React.FC<PushNotificationToastProps> = ({
  notification,
  onClose,
  onActionClick,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification || !isVisible) return null;

  const isInvoice = notification.type === 'new_invoice';
  const isExpiring = notification.type === 'expiration_warning' || notification.type === 'plan_expired';

  return (
    <div className="fixed top-[max(1rem,env(safe-area-inset-top))] inset-x-4 sm:left-auto sm:w-96 z-[9999] animate-in slide-in-from-top duration-300">
      <div className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all ${
        isInvoice 
          ? 'bg-[#051a11]/95 border-[#00F59B]/60 shadow-[0_0_30px_rgba(0,245,155,0.25)]' 
          : isExpiring 
          ? 'bg-[#1a0f05]/95 border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.25)]' 
          : 'bg-[#0a1622]/95 border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.25)]'
      }`}>
        <div className="flex items-start gap-3">
          {/* Glowing Icon Badge */}
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${
            isInvoice 
              ? 'bg-[#00F59B]/20 text-[#00F59B]' 
              : isExpiring 
              ? 'bg-amber-500/20 text-amber-400' 
              : 'bg-cyan-500/20 text-cyan-400'
          }`}>
            {isInvoice ? (
              <CreditCard className="w-5 h-5 animate-pulse" />
            ) : isExpiring ? (
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            ) : (
              <Bell className="w-5 h-5 animate-pulse" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isInvoice 
                  ? 'bg-emerald-950 text-[#00F59B] border border-emerald-700/60' 
                  : isExpiring 
                  ? 'bg-amber-950 text-amber-300 border border-amber-700/60' 
                  : 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
              }`}>
                FCM Push · {isInvoice ? 'Nova Fatura' : isExpiring ? 'Vencimento' : 'Alerta Zuxo'}
              </span>

              <button
                onClick={() => {
                  soundEffects.playClick();
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="text-slate-400 hover:text-white transition-colors p-1"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="text-sm font-bold text-white mt-1.5 line-clamp-1">
              {notification.title}
            </h4>

            <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
              {notification.body}
            </p>

            {/* Quick Action Button */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  soundEffects.playSelect();
                  if (onActionClick) onActionClick(notification);
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className={`w-full py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                  isInvoice
                    ? 'bg-[#00F59B] text-slate-950 hover:bg-[#10e58f]'
                    : isExpiring
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                    : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                }`}
              >
                {isInvoice ? 'Visualizar Fatura & Pagar PIX' : isExpiring ? 'Renovar Plano Agora' : 'Ver Detalhes'}
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
