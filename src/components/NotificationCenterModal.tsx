import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  CreditCard, 
  AlertTriangle, 
  Check, 
  Trash2, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink,
  Smartphone,
  Copy,
  Radio,
  Clock
} from 'lucide-react';
import { PushNotification, UserProfile } from '../types';
import { soundEffects } from '../utils/audio';
import { requestPushPermissionAndGetToken, getNotificationPermissionStatus, displaySystemPushNotification } from '../services/fcmService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  notifications: PushNotification[];
  onMarkAsRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onGoToPayments: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  notifications,
  onMarkAsRead,
  onDeleteNotification,
  onGoToPayments,
}) => {
  const [filter, setFilter] = useState<'all' | 'invoices' | 'expirations'>('all');
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<string>(() => getNotificationPermissionStatus());
  const [fcmToken, setFcmToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('zuxo_fcm_token');
    } catch {
      return null;
    }
  });
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter notifications relevant to this user or sent to 'all'
  const userNotifications = notifications.filter(
    (n) => n.clientId === 'all' || (currentUser && n.clientId === currentUser.id)
  );

  const filteredNotifications = userNotifications.filter((n) => {
    if (filter === 'invoices') return n.type === 'new_invoice';
    if (filter === 'expirations') return n.type === 'expiration_warning' || n.type === 'plan_expired';
    return true;
  });

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const handleEnablePush = async () => {
    soundEffects.playSelect();
    setIsRequestingPermission(true);
    const res = await requestPushPermissionAndGetToken(currentUser?.id);
    setIsRequestingPermission(false);

    if (res.granted && res.token) {
      setFcmToken(res.token);
      setPushStatus('granted');
      displaySystemPushNotification(
        '🔔 Notificações Ativadas com Sucesso!',
        'Você agora receberá alertas push automáticos sobre novas faturas e vencimentos do Zuxo Player.'
      );
    } else {
      setPushStatus(getNotificationPermissionStatus());
    }
  };

  const handleTestNotification = () => {
    soundEffects.playSelect();
    displaySystemPushNotification(
      '✨ Teste de Push FCM Zuxo Player',
      'Sistema de Notificações Firebase Cloud Messaging funcionando com sucesso em seu dispositivo!',
      {
        tag: 'test-push',
        onClick: () => onGoToPayments(),
      }
    );
  };

  const handleCopyToken = () => {
    if (fcmToken) {
      soundEffects.playClick();
      navigator.clipboard.writeText(fcmToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#071912] border border-emerald-950 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#00F59B] to-cyan-400" />

        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#00F59B]/10 border border-[#00F59B]/30 text-[#00F59B]">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white font-display">
                  Central de Notificações Push
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#00F59B] text-slate-950 shadow-sm">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Alertas automáticos de faturas e vencimentos via Firebase Cloud Messaging (FCM)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEffects.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-emerald-950/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FCM STATUS BANNER */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#04110c] border border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full animate-ping ${
              pushStatus === 'granted' ? 'bg-[#00F59B]' : 'bg-amber-400'
            }`} />
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#00F59B]" />
                FCM Push: {pushStatus === 'granted' ? 'Ativado neste Navegador' : 'Aguardando Permissão'}
              </p>
              <p className="text-[11px] text-slate-400">
                {pushStatus === 'granted' 
                  ? 'Você recebe alertas mesmo com o app minimizado.'
                  : 'Autorize para receber lembretes de fatura e renovação.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {pushStatus !== 'granted' ? (
              <button
                onClick={handleEnablePush}
                disabled={isRequestingPermission}
                className="w-full sm:w-auto px-3.5 py-1.5 bg-[#00F59B] hover:bg-[#10e58f] text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isRequestingPermission ? 'Ativando...' : 'Ativar Push FCM'}
              </button>
            ) : (
              <button
                onClick={handleTestNotification}
                className="w-full sm:w-auto px-3 py-1.5 bg-[#0a2217] hover:bg-[#0f2e20] border border-emerald-600/50 text-[#00F59B] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Testar Alerta
              </button>
            )}
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex items-center gap-2 mt-4 pb-2 border-b border-emerald-950/60 overflow-x-auto">
          <button
            onClick={() => {
              soundEffects.playClick();
              setFilter('all');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-[#00F59B] text-slate-950'
                : 'bg-[#0a1e16] text-slate-400 hover:text-white'
            }`}
          >
            Todas ({userNotifications.length})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setFilter('invoices');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filter === 'invoices'
                ? 'bg-[#00F59B] text-slate-950'
                : 'bg-[#0a1e16] text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3 h-3" />
            Faturas
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setFilter('expirations');
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filter === 'expirations'
                ? 'bg-[#00F59B] text-slate-950'
                : 'bg-[#0a1e16] text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Vencimentos
          </button>
        </div>

        {/* NOTIFICATIONS LIST */}
        <div className="flex-1 overflow-y-auto space-y-3 mt-3 pr-1">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell className="w-8 h-8 text-emerald-700/60 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold text-white mb-1">Nenhuma notificação no momento</p>
              <p className="text-xs">Quando uma nova fatura for gerada ou seu plano estiver próximo do vencimento, você será alertado aqui.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isInvoice = notif.type === 'new_invoice';
              const isExpiring = notif.type === 'expiration_warning' || notif.type === 'plan_expired';

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    !notif.read
                      ? isInvoice
                        ? 'bg-[#062217] border-[#00F59B]/50 shadow-md'
                        : isExpiring
                        ? 'bg-[#221607] border-amber-500/50 shadow-md'
                        : 'bg-[#0b1d2a] border-cyan-500/50 shadow-md'
                      : 'bg-[#081b13]/60 border-emerald-950 hover:border-emerald-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                        isInvoice 
                          ? 'bg-[#00F59B]/20 text-[#00F59B]' 
                          : isExpiring 
                          ? 'bg-amber-400/20 text-amber-400' 
                          : 'bg-cyan-400/20 text-cyan-400'
                      }`}>
                        {isInvoice ? <CreditCard className="w-4 h-4" /> : isExpiring ? <AlertTriangle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">
                            {notif.title}
                          </h4>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-[#00F59B]" />
                          )}
                          {notif.isAutomated && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-emerald-950/80 text-[#00F59B] border border-emerald-700/60 rounded">
                              Automático
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {notif.body}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            {new Date(notif.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>

                          {notif.invoiceAmount && (
                            <span className="font-bold text-[#00F59B] font-mono">
                              R$ {notif.invoiceAmount.toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        soundEffects.playClick();
                        onDeleteNotification(notif.id);
                      }}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      title="Excluir notificação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* ACTION BAR */}
                  <div className="mt-3 pt-2.5 border-t border-emerald-950 flex items-center justify-between gap-2">
                    {!notif.read && (
                      <button
                        onClick={() => {
                          soundEffects.playClick();
                          onMarkAsRead(notif.id);
                        }}
                        className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Marcar como lida
                      </button>
                    )}

                    <button
                      onClick={() => {
                        soundEffects.playSelect();
                        onClose();
                        onGoToPayments();
                      }}
                      className={`ml-auto px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                        isInvoice
                          ? 'bg-[#00F59B] text-slate-950 hover:bg-[#10e58f]'
                          : isExpiring
                          ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                          : 'bg-emerald-900 text-white hover:bg-emerald-800'
                      }`}
                    >
                      {isInvoice ? 'Pagar com PIX' : isExpiring ? 'Renovar Plano' : 'Acessar Assinatura'}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER INFO */}
        {fcmToken && (
          <div className="mt-3 pt-3 border-t border-emerald-950/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono truncate max-w-[280px]">
              FCM Token: {fcmToken.slice(0, 24)}...
            </span>
            <button
              onClick={handleCopyToken}
              className="text-emerald-400 hover:text-white flex items-center gap-1 font-semibold"
            >
              <Copy className="w-3 h-3" />
              {copiedToken ? 'Copiado!' : 'Copiar Token'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
