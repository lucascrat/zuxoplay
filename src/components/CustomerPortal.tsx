import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Smartphone, 
  Tv, 
  Monitor, 
  Box, 
  CreditCard, 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  Sparkles, 
  ArrowLeft, 
  ExternalLink,
  RefreshCw,
  Barcode,
  Layers,
  Camera,
  LogOut,
  Edit2,
  Bell,
  Radio,
  AlertTriangle,
  AlertCircle,
  Zap,
  Key,
  Mail,
  Building,
  Phone,
  FileText,
  Eye,
  EyeOff,
  X,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ClientApp, PaymentPlan, Invoice, ProgramItem, UserProfile, PushNotification } from '../types';
import { soundEffects } from '../utils/audio';
import { NotificationCenterModal } from './NotificationCenterModal';
import { SubscriptionCycleTimeline } from './SubscriptionCycleTimeline';
import { requestPushPermissionAndGetToken, getNotificationPermissionStatus, displaySystemPushNotification } from '../services/fcmService';
import { calculateDaysRemaining } from '../services/notificationService';
import { DEFAULT_PIX_KEYS, generatePixPayload, generateDynamicQrCodeDataUrl, PixKeyOption } from '../utils/pixHelpers';
import { 
  createEfiPixCharge, 
  checkEfiPixStatus, 
  simulateEfiPayment, 
  EFIBANK_OFFICIAL_PIX_KEY 
} from '../services/efiBankService';

interface CustomerPortalProps {
  currentUser: UserProfile;
  apps: ClientApp[];
  paymentPlans: PaymentPlan[];
  invoices: Invoice[];
  programs: ProgramItem[];
  notifications?: PushNotification[];
  onUpdateUser: (updatedUser: UserProfile) => void;
  onUpdateInvoices?: (updatedInvoices: Invoice[]) => void;
  onLogout: () => void;
  onBackToFeed: () => void;
  onOpenDailyGuide: () => void;
  onOpenAdminPanel: () => void;
  onMarkNotificationAsRead?: (id: string) => void;
  onDeleteNotification?: (id: string) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  currentUser,
  apps,
  paymentPlans,
  invoices: initialInvoices,
  programs,
  notifications = [],
  onUpdateUser,
  onUpdateInvoices,
  onLogout,
  onBackToFeed,
  onOpenDailyGuide,
  onOpenAdminPanel,
  onMarkNotificationAsRead = () => {},
  onDeleteNotification = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<'apps' | 'payments' | 'cycle' | 'schedule' | 'credentials' | 'notifications'>('apps');
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<string>(() => getNotificationPermissionStatus());
  const [isRequestingPush, setIsRequestingPush] = useState<boolean>(false);
  
  // INVOICES & PAYMENTS STATE
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const pendingInvoices = invoices.filter((inv) => inv.status === 'pendente');
  const [selectedInvoiceToPay, setSelectedInvoiceToPay] = useState<Invoice | null>(() => pendingInvoices[0] || null);
  const clientDaysLeft = calculateDaysRemaining(currentUser.expirationDate);

  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>(paymentPlans[1] || paymentPlans[0]);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'boleto'>('pix');
  const [selectedPixKey, setSelectedPixKey] = useState<PixKeyOption>(DEFAULT_PIX_KEYS[0]);
  
  // PIX DYNAMIC GENERATION STATE
  const [dynamicQrCodeUrl, setDynamicQrCodeUrl] = useState<string>('');
  const [pixCopyPaste, setPixCopyPaste] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [efiTxid, setEfiTxid] = useState<string>('');
  const [isCheckingEfiStatus, setIsCheckingEfiStatus] = useState<boolean>(false);
  const [efiFeedback, setEfiFeedback] = useState<string>('');

  // FEEDBACK & MODAL STATES
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [lastPaidInvoice, setLastPaidInvoice] = useState<Invoice | null>(null);
  const [receiptModalInvoice, setReceiptModalInvoice] = useState<Invoice | null>(null);
  const [downloadingAppId, setDownloadingAppId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external invoices if prop changes
  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  // Use individual customized apps if configured by admin, otherwise general apps
  const clientApps = (currentUser.customApps && currentUser.customApps.length > 0) ? currentUser.customApps : apps;
  
  // Determine current payment amount:
  // 1. If paying a specific pending invoice -> that invoice's amount
  // 2. If client has an individual custom price set by admin -> customPrice
  // 3. Otherwise -> selected plan price
  const activePaymentAmount = selectedInvoiceToPay 
    ? selectedInvoiceToPay.amount 
    : (currentUser.customPrice && currentUser.customPrice > 0) 
      ? currentUser.customPrice 
      : selectedPlan.price;

  // Generate dynamic PIX BR Code payload and Dynamic QR Code via Efí Bank whenever amount, key, or invoice changes
  useEffect(() => {
    let isMounted = true;
    const generateQr = async () => {
      setIsGeneratingQr(true);
      try {
        const res = await createEfiPixCharge({
          amount: activePaymentAmount,
          invoiceId: selectedInvoiceToPay?.id,
          clientId: currentUser.id,
          clientName: currentUser.name,
          description: `Zuxo Player VIP - ${currentUser.name}`
        });

        if (!isMounted) return;
        setEfiTxid(res.txid);
        setPixCopyPaste(res.pixCopiaECola);
        setDynamicQrCodeUrl(res.qrCodeDataUrl);
      } catch (err) {
        console.error('Erro ao gerar cobrança Efí Bank:', err);
      } finally {
        if (isMounted) setIsGeneratingQr(false);
      }
    };

    generateQr();

    return () => {
      isMounted = false;
    };
  }, [activePaymentAmount, selectedPixKey, selectedInvoiceToPay, currentUser.id, currentUser.name]);

  // AUTO-POLL EFI BANK STATUS WHILE ON PAYMENTS TAB
  useEffect(() => {
    if (activeTab !== 'payments' || !efiTxid || paymentSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await checkEfiPixStatus(efiTxid);
        if (res.paid) {
          completePaymentSuccess('PIX Efí Bank (Confirmação Automática)');
        }
      } catch {
        // silent retry
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab, efiTxid, paymentSuccess]);

  // NOTIFICATIONS FOR CURRENT USER
  const userNotifications = notifications.filter(
    (n) => n.clientId === 'all' || n.clientId === currentUser.id
  );
  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const handleEnablePushNotifications = async () => {
    soundEffects.playSelect();
    setIsRequestingPush(true);
    const res = await requestPushPermissionAndGetToken(currentUser.id);
    setIsRequestingPush(false);
    if (res.granted && res.token) {
      setPushPermissionStatus('granted');
      displaySystemPushNotification(
        '🔔 Notificações Ativadas com Sucesso!',
        'Você agora receberá alertas instantâneos de novas faturas e vencimentos do Zuxo Player.'
      );
    } else {
      setPushPermissionStatus(getNotificationPermissionStatus());
    }
  };

  const handleCopy = (text: string, label: string) => {
    soundEffects.playClick();
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Change avatar from device file upload
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        soundEffects.playSelect();
        onUpdateUser({
          ...currentUser,
          avatar: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadApp = (app: ClientApp) => {
    soundEffects.playSelect();
    if (app.downloadUrl) {
      window.open(app.downloadUrl, '_blank', 'noopener,noreferrer');
    } else if (app.pairingCode) {
      handleCopy(app.pairingCode, app.id);
    }
  };

  const completePaymentSuccess = (providerLabel = 'PIX Efí Bank') => {
    setPaymentSuccess(true);
    
    // Calculate new expiration date (+30 days or next month)
    const now = new Date();
    now.setDate(now.getDate() + 30);
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const newExpDate = `${day}/${month}/${year}`;

    // Update User profile
    onUpdateUser({
      ...currentUser,
      expirationDate: newExpDate,
      status: 'ativo',
    });

    let updatedList: Invoice[] = [];

    if (selectedInvoiceToPay) {
      // Quitar fatura pendente existente
      const paidInv: Invoice = {
        ...selectedInvoiceToPay,
        status: 'pago',
        paymentMethod: providerLabel,
        date: new Date().toLocaleDateString('pt-BR'),
        pixKey: selectedPixKey.key,
      };
      updatedList = invoices.map((inv) => (inv.id === selectedInvoiceToPay.id ? paidInv : inv));
      setLastPaidInvoice(paidInv);
      setSelectedInvoiceToPay(null);
    } else {
      // Nova fatura gerada e paga
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        description: `Renovação de Assinatura (${currentUser.screens} ${currentUser.screens === 1 ? 'Tela' : 'Telas'})`,
        date: new Date().toLocaleDateString('pt-BR'),
        dueDate: newExpDate,
        amount: activePaymentAmount,
        status: 'pago',
        paymentMethod: providerLabel,
        pixKey: selectedPixKey.key,
        clientId: currentUser.id,
      };
      updatedList = [newInvoice, ...invoices];
      setLastPaidInvoice(newInvoice);
    }

    setInvoices(updatedList);
    if (onUpdateInvoices) {
      onUpdateInvoices(updatedList);
    }

    confetti({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#00F59B', '#10E58F', '#047857', '#FBBF24', '#FFFFFF']
    });
  };

  // Confirm PIX payment (quitting pending invoice or renewing)
  const handleConfirmPixPayment = () => {
    soundEffects.playSelect();
    setIsProcessingPayment(true);

    setTimeout(() => {
      setIsProcessingPayment(false);
      completePaymentSuccess('PIX Efí Bank');
    }, 1200);
  };

  const handleCheckEfiStatus = async () => {
    if (!efiTxid) return;
    soundEffects.playClick();
    setIsCheckingEfiStatus(true);
    setEfiFeedback('Consultando API do Efí Bank em tempo real...');

    try {
      const res = await checkEfiPixStatus(efiTxid);
      if (res.paid) {
        completePaymentSuccess('PIX Efí Bank (API)');
        setEfiFeedback('Pagamento confirmado com sucesso pelo Efí Bank!');
      } else {
        setEfiFeedback(res.message || 'Aguardando compensação do PIX no Efí Bank...');
      }
    } catch {
      setEfiFeedback('Não foi possível verificar no momento. Tente novamente em alguns segundos.');
    } finally {
      setIsCheckingEfiStatus(false);
      setTimeout(() => setEfiFeedback(''), 4500);
    }
  };

  const handleSimulateSandboxPayment = async () => {
    soundEffects.playSelect();
    setIsProcessingPayment(true);
    setEfiFeedback('Simulando confirmação de pagamento no Sandbox Efí Bank...');

    try {
      if (efiTxid) {
        await simulateEfiPayment(efiTxid);
      }
      completePaymentSuccess('PIX Efí Bank (Sandbox Test)');
      setEfiFeedback('Pagamento aprovado e sinal liberado no Sandbox Efí Bank!');
    } finally {
      setIsProcessingPayment(false);
      setTimeout(() => setEfiFeedback(''), 4500);
    }
  };

  const handleDownloadQrImage = () => {
    if (!dynamicQrCodeUrl) return;
    soundEffects.playClick();
    const link = document.createElement('a');
    link.href = dynamicQrCodeUrl;
    link.download = `pix-qrcode-zuxo-r$${activePaymentAmount.toFixed(2)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-radial from-[#07241a] via-[#04110c] to-[#010604] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* TOP BAR / BREADCRUMB */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-emerald-950">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundEffects.playClick();
                onBackToFeed();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-900/60 rounded-xl text-xs sm:text-sm font-semibold text-emerald-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#00F59B]" />
              Voltar ao Feed de Trailers
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white font-display">
                Área do Cliente Zuxo
              </h1>
              <p className="text-xs text-slate-400">
                Aplicativos disponíveis, faturas, quitação via PIX e grade do dia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundEffects.playClick();
                setIsNotificationModalOpen(true);
              }}
              className="relative px-3.5 py-1.5 bg-[#0a2016] hover:bg-[#0e2d20] border border-emerald-600/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              title="Central de Notificações Push FCM"
            >
              <Bell className="w-4 h-4 text-[#00F59B]" />
              <span className="hidden sm:inline">Alertas FCM</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#00F59B] text-slate-950 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                onOpenDailyGuide();
              }}
              className="px-3.5 py-1.5 bg-[#0a2016] hover:bg-[#0e2d20] border border-emerald-600/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Calendar className="w-4 h-4 text-[#00F59B]" />
              Grade de Hoje
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                onOpenAdminPanel();
              }}
              className="px-3.5 py-1.5 bg-[#0a2016] hover:bg-[#0e2d20] border border-emerald-900 text-slate-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              Painel Admin
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                onLogout();
              }}
              title="Sair da conta"
              className="p-1.5 bg-[#140b0b] hover:bg-red-950/80 border border-red-900/40 text-red-400 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ACCOUNT STATUS HERO BANNER */}
        <div className="bg-gradient-to-r from-[#0d2e23] via-[#092219] to-[#05140e] border border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_30px_rgba(0,245,155,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            
            {/* PROFILE AVATAR WITH DIRECT UPLOAD TRIGGER */}
            <div className="relative group">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-16 sm:w-20 h-16 sm:h-20 rounded-full overflow-hidden border-2 border-[#00F59B] shadow-[0_0_20px_rgba(0,245,155,0.4)] cursor-pointer bg-slate-900 relative"
                title="Clique para trocar sua imagem de perfil"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold">
                  <Camera className="w-4 h-4 text-[#00F59B] mb-0.5" />
                  Trocar
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00F59B] text-slate-950 flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                title="Trocar Foto"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white font-display">
                  {currentUser.name}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  currentUser.status === 'ativo'
                    ? 'bg-emerald-950 text-[#00F59B] border border-emerald-600/60'
                    : currentUser.status === 'pendente'
                    ? 'bg-amber-950 text-amber-300 border border-amber-600/60 animate-pulse'
                    : 'bg-red-950 text-red-300 border border-red-600/60'
                }`}>
                  {currentUser.status === 'ativo' ? 'Sinal Ativo ✓' : currentUser.status === 'pendente' ? 'Fatura Pendente' : 'Expirado'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {currentUser.email} {currentUser.whatsapp ? `· ${currentUser.whatsapp}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-400 mt-2 font-medium">
                <span>{currentUser.screens} {currentUser.screens === 1 ? 'Tela Liberada' : 'Telas Liberadas'}</span>
                <span>·</span>
                <span className="text-white">Mensalidade: <strong className="text-[#00F59B]">R$ {activePaymentAmount.toFixed(2).replace('.', ',')}</strong></span>
                <span>·</span>
                <span className="text-white">Vencimento: <strong className="text-[#00F59B]">{currentUser.expirationDate}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                soundEffects.playSelect();
                if (pendingInvoices.length > 0) {
                  setSelectedInvoiceToPay(pendingInvoices[0]);
                }
                setActiveTab('payments');
              }}
              className="flex-1 md:flex-initial py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wide rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              {pendingInvoices.length > 0 
                ? `Quitar Fatura Pendente (R$ ${pendingInvoices[0].amount.toFixed(2).replace('.', ',')})` 
                : `Pagar R$ ${activePaymentAmount.toFixed(2).replace('.', ',')} via PIX`}
            </button>
          </div>
        </div>

        {/* PROMINENT PENDING INVOICE ALERT BANNER (QUICK COPY PIX KEY & DIRECT PAY) */}
        {pendingInvoices.length > 0 && (
          <div className="bg-gradient-to-r from-amber-950/90 via-[#231b0a] to-[#0c1810] border-2 border-amber-500/70 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.25)] animate-fadeIn">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                    Aviso de Fatura Pendente
                  </span>
                  <span className="text-xs text-amber-300 font-semibold">
                    Vencimento: {pendingInvoices[0].dueDate || currentUser.expirationDate}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {pendingInvoices[0].description} - <span className="font-mono text-amber-300 font-black">R$ {pendingInvoices[0].amount.toFixed(2).replace('.', ',')}</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Chave PIX rápida: <strong className="font-mono text-emerald-400">{DEFAULT_PIX_KEYS[0].key}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={() => handleCopy(DEFAULT_PIX_KEYS[0].key, 'banner-key')}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-[#12261b] hover:bg-[#1a3828] border border-emerald-500/50 rounded-xl text-xs font-bold text-[#00F59B] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                title="Copiar Chave PIX"
              >
                {copiedText === 'banner-key' ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4" />}
                {copiedText === 'banner-key' ? 'Chave Copiada! ✓' : 'Copiar Chave PIX'}
              </button>
              <button
                onClick={() => {
                  soundEffects.playSelect();
                  setSelectedInvoiceToPay(pendingInvoices[0]);
                  setActiveTab('payments');
                }}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-amber-400 to-[#00F59B] hover:brightness-110 text-slate-950 text-xs font-black rounded-xl uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                Ver QR Code e Quitar
              </button>
            </div>
          </div>
        )}

        {/* PUSH NOTIFICATIONS & EXPIRATION INTERACTIVE ALERT BANNER */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#062116] via-[#04160e] to-[#030d08] border border-emerald-600/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#00F59B]/15 text-[#00F59B] border border-[#00F59B]/30 flex-shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <span>Alertas Push Firebase (FCM):</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  pushPermissionStatus === 'granted'
                    ? 'bg-emerald-950 text-[#00F59B] border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {pushPermissionStatus === 'granted' ? 'Ativo no Navegador' : 'Não Habilitado'}
                </span>
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {pendingInvoices.length > 0
                  ? `Você possui fatura pendente de R$ ${pendingInvoices[0].amount.toFixed(2).replace('.', ',')}. Pague via PIX para manter o sinal ativo.`
                  : `Receba avisos automáticos de vencimento (${currentUser.expirationDate}) e novas faturas diretamente na tela do seu aparelho.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {pushPermissionStatus !== 'granted' && (
              <button
                onClick={handleEnablePushNotifications}
                disabled={isRequestingPush}
                className="w-full sm:w-auto px-3.5 py-1.5 bg-[#00F59B] hover:bg-[#10e58f] text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isRequestingPush ? 'Ativando...' : 'Ativar Push FCM'}
              </button>
            )}

            <button
              onClick={() => {
                soundEffects.playClick();
                setIsNotificationModalOpen(true);
              }}
              className="w-full sm:w-auto px-3 py-1.5 bg-[#0a2016] hover:bg-[#0e2d20] border border-emerald-700/60 text-[#00F59B] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
            >
              <Bell className="w-3.5 h-3.5" />
              Ver Notificações ({userNotifications.length})
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex gap-2 border-b border-emerald-950 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('apps');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'apps'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Meus Apps Disponíveis ({clientApps.length})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('payments');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap relative ${
              activeTab === 'payments'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Pagamentos & PIX
            {pendingInvoices.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                activeTab === 'payments' ? 'bg-slate-950 text-amber-300' : 'bg-amber-400 text-slate-950 animate-pulse'
              }`}>
                {pendingInvoices.length} pendente
              </span>
            )}
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('cycle');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap relative ${
              activeTab === 'cycle'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <Clock className="w-4 h-4" />
            Ciclo & Renovação
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
              activeTab === 'cycle'
                ? 'bg-slate-950 text-[#00F59B]'
                : clientDaysLeft <= 5
                ? 'bg-amber-400 text-slate-950 animate-pulse'
                : 'bg-emerald-950 text-[#00F59B] border border-emerald-800'
            }`}>
              {clientDaysLeft > 0 ? `${clientDaysLeft}d p/ renovar` : 'Vencido'}
            </span>
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setIsNotificationModalOpen(true);
            }}
            className="py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap text-slate-400 hover:text-white bg-[#0a1e16]"
          >
            <Bell className="w-4 h-4 text-[#00F59B]" />
            Notificações FCM ({userNotifications.length})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('schedule');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Grade de Hoje
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('credentials');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'credentials'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <Layers className="w-4 h-4" />
            Minhas Credenciais
          </button>
        </div>

        {/* TAB 1: MEUS APLICATIVOS DISPONÍVEIS */}
        {activeTab === 'apps' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Aplicativos Oficiais do Zuxo Player ({clientApps.length})
                </h3>
                <p className="text-xs text-slate-400">
                  {currentUser.customApps && currentUser.customApps.length > 0
                    ? 'Lista personalizada de aplicativos configurada especialmente para sua conta.'
                    : 'Faça o download do aplicativo ideal para cada dispositivo que você possui.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientApps.map((app) => {
                const storeLabel =
                  app.platform === 'android' ? 'Instalar na Google Play' :
                  app.platform === 'ios' ? 'Instalar na App Store' :
                  app.platform === 'windows' ? 'Instalar na Microsoft Store' :
                  app.platform === 'web' ? 'Instalar na Mac App Store' :
                  app.platform === 'smart-tv' ? 'Acessar na Smart TV' :
                  'Baixar Aplicativo';

                const storeBadgeColor =
                  app.platform === 'android' ? 'from-green-500 to-emerald-500' :
                  app.platform === 'ios' ? 'from-blue-500 to-sky-400' :
                  app.platform === 'windows' ? 'from-sky-500 to-blue-400' :
                  app.platform === 'smart-tv' ? 'from-cyan-500 to-teal-400' :
                  app.platform === 'tv-box' ? 'from-orange-500 to-amber-400' :
                  'from-emerald-500 to-[#00F59B]';

                return (
                  <div
                    key={app.id}
                    className="bg-[#0a1e16] border border-emerald-950 hover:border-emerald-700/60 rounded-3xl p-5 flex flex-col justify-between transition-all group"
                  >
                    <div>
                      {/* Header: logo + version */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-[#06140e] border border-emerald-800/40 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform flex-shrink-0">
                          {app.iconUrl ? (
                            <img
                              src={app.iconUrl}
                              alt={app.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl">${app.platform === 'android' ? '🤖' : app.platform === 'ios' ? '🍎' : app.platform === 'smart-tv' ? '📺' : app.platform === 'tv-box' ? '📦' : app.platform === 'windows' ? '🖥️' : '🌐'}</span>`;
                              }}
                            />
                          ) : (
                            <span className="text-2xl">
                              {app.platform === 'android' ? '🤖' :
                               app.platform === 'ios' ? '🍎' :
                               app.platform === 'smart-tv' ? '📺' :
                               app.platform === 'tv-box' ? '📦' :
                               app.platform === 'windows' ? '🖥️' : '🌐'}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            app.platform === 'android' ? 'bg-green-950 text-green-300 border border-green-800' :
                            app.platform === 'ios' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                            app.platform === 'smart-tv' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                            app.platform === 'tv-box' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                            app.platform === 'windows' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                            'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {app.platform === 'android' ? 'Android' :
                             app.platform === 'ios' ? 'iOS / iPadOS' :
                             app.platform === 'smart-tv' ? 'Smart TV' :
                             app.platform === 'tv-box' ? 'TV Box / Fire' :
                             app.platform === 'windows' ? 'Windows' : 'macOS / Web'}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-full text-[10px] font-mono">
                            {app.version}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-white font-display mb-0.5">
                        {app.name}
                      </h4>
                      <p className="text-xs text-slate-400 mb-4">
                        {app.subtitle}
                      </p>

                      <div className="bg-[#06140e] border border-emerald-950 p-3 rounded-2xl mb-4 text-[11px] text-slate-300 space-y-1.5">
                        <span className="font-bold text-emerald-400 block text-[10px] uppercase">Como Instalar:</span>
                        {app.instructions.map((inst, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold flex-shrink-0">{idx + 1}.</span>
                            <span>{inst}</span>
                          </div>
                        ))}
                      </div>

                      {app.pairingCode && (
                        <div className="flex items-center justify-between bg-[#081a13] border border-emerald-900/60 p-2.5 rounded-xl mb-4">
                          <span className="text-xs font-mono font-bold text-[#00F59B]">{app.pairingCode}</span>
                          <button
                            onClick={() => handleCopy(app.pairingCode!, app.id)}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Copiar Código"
                          >
                            {copiedText === app.id ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {app.downloadUrl ? (
                        <button
                          onClick={() => handleDownloadApp(app)}
                          className={`w-full py-3 bg-gradient-to-r ${storeBadgeColor} hover:brightness-110 text-white font-bold text-xs uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer`}
                        >
                          <ExternalLink className="w-4 h-4" />
                          {storeLabel}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCopy(app.pairingCode || 'ZX-84920', app.id)}
                          className="w-full py-2.5 bg-[#0f2e21] hover:bg-[#153f2e] border border-emerald-600/50 text-[#00F59B] font-bold text-xs uppercase tracking-wide rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Copy className="w-4 h-4" /> Copiar Código de Pareamento
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: PAGAMENTOS, CHAVE PIX & QR CODE DINÂMICO */}
        {activeTab === 'payments' && (
          <div className="space-y-8">
            
            {/* SUCCESS BANNER */}
            {paymentSuccess && (
              <div className="bg-emerald-950/90 border-2 border-[#00F59B] p-5 rounded-3xl flex items-center justify-between shadow-[0_0_30px_rgba(0,245,155,0.3)] animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00F59B] text-slate-950 flex items-center justify-center font-bold">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Pagamento Confirmado com Sucesso!</h4>
                    <p className="text-xs text-emerald-300">
                      Sua fatura foi quitada e a assinatura renovada até <strong>{currentUser.expirationDate}</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lastPaidInvoice && (
                    <button
                      onClick={() => setReceiptModalInvoice(lastPaidInvoice)}
                      className="px-3 py-1.5 bg-[#0a2016] border border-emerald-500/50 text-[#00F59B] text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Ver Comprovante
                    </button>
                  )}
                  <button
                    onClick={() => setPaymentSuccess(false)}
                    className="text-xs text-slate-400 hover:text-white p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* SEÇÃO 1: FATURAS PENDENTES (SE EXISTIR) */}
            {pendingInvoices.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      Faturas Pendentes para Quitação
                    </h3>
                    <p className="text-xs text-slate-400">
                      Selecione a fatura que deseja quitar imediatamente via Chave PIX ou QR Code dinâmico
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded-full text-xs font-bold font-mono">
                    {pendingInvoices.length} {pendingInvoices.length === 1 ? 'fatura pendente' : 'faturas pendentes'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => {
                        soundEffects.playClick();
                        setSelectedInvoiceToPay(inv);
                      }}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all flex items-center justify-between ${
                        selectedInvoiceToPay?.id === inv.id
                          ? 'bg-gradient-to-r from-[#1c1808] to-[#0d2218] border-2 border-[#00F59B] shadow-[0_0_20px_rgba(0,245,155,0.25)]'
                          : 'bg-[#0a1e16] border-amber-900/40 hover:border-amber-600/60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                            Pendente
                          </span>
                          <span className="text-xs text-slate-300">
                            Vencimento: <strong className="text-amber-300 font-mono">{inv.dueDate || '15/05/2026'}</strong>
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">
                          {inv.description}
                        </h4>
                        <p className="text-xs text-slate-400">
                          Data de Emissão: {inv.date}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-mono font-black text-[#00F59B]">
                          R$ {inv.amount.toFixed(2).replace('.', ',')}
                        </div>
                        <div className={`mt-1.5 px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                          selectedInvoiceToPay?.id === inv.id
                            ? 'bg-[#00F59B] text-slate-950'
                            : 'bg-[#0f2e21] text-emerald-300 border border-emerald-700/50'
                        }`}>
                          {selectedInvoiceToPay?.id === inv.id ? 'Selecionada para Pagar ✓' : 'Pagar Esta'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEÇÃO 2: CHECKOUT PIX COM CAMPO DE CHAVE PIX E QR CODE DINÂMICO */}
            <div className="bg-[#091d15] border border-emerald-500/50 rounded-3xl p-5 sm:p-8 shadow-[0_0_35px_rgba(0,245,155,0.12)]">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-emerald-950">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-[#00F59B] text-slate-950 flex items-center justify-center font-black text-sm">
                      PIX
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white font-display">
                      Quitação Instantânea via PIX
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {selectedInvoiceToPay 
                      ? `Quitando: ${selectedInvoiceToPay.description}` 
                      : `Plano Selecionado: ${selectedPlan.name} (${currentUser.screens} Telas)`}
                  </p>
                </div>

                <div className="bg-[#05130d] border border-emerald-900/80 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                  <span className="text-xs text-slate-400">Valor Exato:</span>
                  <span className="text-xl sm:text-2xl font-black text-[#00F59B] font-mono">
                    R$ {activePaymentAmount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* PAYMENT METHOD TOGGLE (PIX DEFAULT) */}
              <div className="flex flex-wrap gap-2 my-6">
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setPaymentMethod('pix');
                  }}
                  className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    paymentMethod === 'pix'
                      ? 'bg-[#00F59B] text-slate-950 shadow-md'
                      : 'bg-[#06140e] text-slate-300 hover:text-white border border-emerald-950'
                  }`}
                >
                  <QrCode className="w-4 h-4" /> PIX Dinâmico (Liberação Imediata)
                </button>

                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setPaymentMethod('credit_card');
                  }}
                  className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    paymentMethod === 'credit_card'
                      ? 'bg-[#00F59B] text-slate-950 shadow-md'
                      : 'bg-[#06140e] text-slate-300 hover:text-white border border-emerald-950'
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> Cartão de Crédito
                </button>

                <button
                  onClick={() => {
                    soundEffects.playClick();
                    setPaymentMethod('boleto');
                  }}
                  className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    paymentMethod === 'boleto'
                      ? 'bg-[#00F59B] text-slate-950 shadow-md'
                      : 'bg-[#06140e] text-slate-300 hover:text-white border border-emerald-950'
                  }`}
                >
                  <Barcode className="w-4 h-4" /> Boleto Bancário
                </button>
              </div>

              {/* PIX CONTENT (QR CODE DINÂMICO & CAMPO CHAVE PIX) */}
              {paymentMethod === 'pix' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* QR CODE DINÂMICO REAL (GERADO EM TEMPO REAL) */}
                  <div className="lg:col-span-5 flex flex-col items-center">
                    <div className="bg-white p-5 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border-4 border-emerald-500/40 relative flex flex-col items-center">
                      
                      {/* Top QR badge */}
                      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-slate-800 text-[11px] font-bold">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          PIX Dinâmico
                        </span>
                        <span className="font-mono text-xs font-black text-slate-950">
                          R$ {activePaymentAmount.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      {/* Real Dynamic QR Image */}
                      <div className="w-56 h-56 relative flex items-center justify-center bg-white rounded-xl overflow-hidden">
                        {isGeneratingQr ? (
                          <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
                            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                            <span className="text-[11px] font-bold">Gerando QR Code...</span>
                          </div>
                        ) : dynamicQrCodeUrl ? (
                          <div className="relative group">
                            <img
                              src={dynamicQrCodeUrl}
                              alt="QR Code Dinâmico Pix Zuxo"
                              className="w-56 h-56 object-contain"
                            />
                            {/* Center brand badge overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-10 h-10 rounded-full bg-slate-950 text-[#00F59B] border-2 border-white flex items-center justify-center text-[10px] font-black shadow-lg">
                                ZUX
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-red-500 text-xs">Erro ao gerar QR Code</div>
                        )}
                      </div>

                      <div className="text-center mt-3 pt-2 border-t border-slate-200 w-full">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          Aponte a câmera do aplicativo do seu banco
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Tempo limite de validade: 14:59 min
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={handleDownloadQrImage}
                        disabled={!dynamicQrCodeUrl}
                        className="px-3 py-1.5 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Baixar Imagem do QR Code
                      </button>
                    </div>
                  </div>

                  {/* CAMPO DE CHAVE PIX & COPIA E COLA */}
                  <div className="lg:col-span-7 space-y-5">

                    {/* 1. CAMPO DE CHAVE PIX (SOLICITADO ESPECIFICAMENTE) */}
                    <div className="bg-[#05130d] border border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Key className="w-4 h-4 text-[#00F59B]" />
                          Campo de Chave PIX Oficial:
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Escolha o formato que preferir no seu banco
                        </span>
                      </div>

                      {/* PIX KEY SELECTOR CHIPS */}
                      <div className="flex flex-wrap gap-1.5">
                        {DEFAULT_PIX_KEYS.map((k) => (
                          <button
                            key={k.type}
                            onClick={() => {
                              soundEffects.playClick();
                              setSelectedPixKey(k);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                              selectedPixKey.type === k.type
                                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                : 'bg-[#081a13] text-slate-300 hover:text-white border border-emerald-950'
                            }`}
                          >
                            {k.type === 'email' && <Mail className="w-3 h-3" />}
                            {k.type === 'cnpj' && <Building className="w-3 h-3" />}
                            {k.type === 'phone' && <Phone className="w-3 h-3" />}
                            {k.type === 'random' && <Key className="w-3 h-3" />}
                            <span>{k.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* INPUT COM A CHAVE PIX E BOTÃO DE COPIAR */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            readOnly
                            value={selectedPixKey.key}
                            className="w-full bg-[#020b07] border-2 border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-white outline-none focus:border-[#00F59B] truncate"
                          />
                        </div>

                        <button
                          onClick={() => handleCopy(selectedPixKey.key, 'chave-pix')}
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm rounded-xl whitespace-nowrap flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                          title="Copiar Chave PIX"
                        >
                          {copiedText === 'chave-pix' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedText === 'chave-pix' ? 'Chave Copiada! ✓' : 'Copiar Chave PIX'}
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B]" />
                        <span>Tipo: <strong className="text-white capitalize">{selectedPixKey.type}</strong> · Beneficiário: <strong className="text-white">Zuxo Streaming Tecnologia LTDA</strong></span>
                      </div>
                    </div>

                    {/* 2. CÓDIGO PIX COPIA E COLA (PADRÃO BR CODE EMV) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-[#00F59B]" />
                          Código PIX Copia e Cola (EMV):
                        </label>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Valor codificado: R$ {activePaymentAmount.toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={pixCopyPaste}
                          className="w-full bg-[#05130d] border border-emerald-900/70 rounded-xl px-3 py-2 text-xs font-mono text-slate-400 outline-none truncate"
                        />
                        <button
                          onClick={() => handleCopy(pixCopyPaste, 'pix-emv')}
                          className="px-3.5 py-2 bg-[#0c2f21] hover:bg-[#124230] border border-emerald-500/50 rounded-xl text-xs font-bold text-[#00F59B] whitespace-nowrap flex items-center gap-1.5 transition-colors"
                        >
                          {copiedText === 'pix-emv' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedText === 'pix-emv' ? 'Copiado! ✓' : 'Copiar Código'}
                        </button>
                      </div>
                    </div>

                    {/* DADOS BANCÁRIOS & GATEWAY EFÍ BANK */}
                    <div className="p-4 bg-[#06140e] rounded-2xl border border-emerald-900/60 text-xs text-slate-300 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#00F59B] animate-pulse" />
                          <span className="text-white font-bold flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-[#00F59B]" />
                            Gateway Oficial Efí Bank (Operacional)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-[#00F59B] border border-emerald-800">
                          {efiTxid ? `TXID: ${efiTxid.slice(0, 16)}...` : 'Transação Protegida'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Beneficiário:</span>
                        <span className="font-semibold text-white">Lucas Sousa / Zuxo Streaming</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Chave Efí Bank:</span>
                        <span className="font-mono text-emerald-300">fab4cde3-4367-4d0b-aa9b-4528dc04d371</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Instituição:</span>
                        <span className="text-white">Efí Bank S.A. (ISPB 09088301 - Gerencianet)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Ambiente de Transação:</span>
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Sandbox Homologado & Ativo (Secrets Carregadas)
                        </span>
                      </div>
                    </div>

                    {/* LIVE STATUS FEEDBACK */}
                    {efiFeedback && (
                      <div className="p-3 bg-emerald-950/80 border border-[#00F59B]/50 rounded-xl text-xs text-[#00F59B] flex items-center gap-2 animate-fadeIn">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#00F59B]" />
                        <span>{efiFeedback}</span>
                      </div>
                    )}

                    {/* BOTÕES DE AÇÃO: EFÍ BANK STATUS & CONFIRMAÇÃO */}
                    <div className="space-y-2">
                      <button
                        onClick={handleConfirmPixPayment}
                        disabled={isProcessingPayment}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_25px_rgba(0,245,155,0.3)] transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isProcessingPayment ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" /> Verificando Quitação no Efí Bank...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" /> Já Efetuei o PIX (Confirmar e Liberar Acesso)
                          </>
                        )}
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleCheckEfiStatus}
                          disabled={isCheckingEfiStatus}
                          className="py-2.5 px-3 bg-[#0a1f16] hover:bg-[#0e2e21] border border-emerald-800 text-emerald-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingEfiStatus ? 'animate-spin text-[#00F59B]' : ''}`} />
                          {isCheckingEfiStatus ? 'Consultando API...' : 'Checar Status no Efí Bank'}
                        </button>

                        <button
                          type="button"
                          onClick={handleSimulateSandboxPayment}
                          className="py-2.5 px-3 bg-[#1c1808] hover:bg-[#28220c] border border-amber-600/50 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                          title="Simula o recebimento do PIX no ambiente Sandbox Efí Bank"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Simular PIX Sandbox (Teste)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CARTÃO DE CRÉDITO */}
              {paymentMethod === 'credit_card' && (
                <div className="max-w-md space-y-3 text-xs pt-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Número do Cartão:</label>
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#00F59B]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Validade:</label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">CVV:</label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="123"
                        className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Nome no Cartão:</label>
                    <input
                      type="text"
                      placeholder="LUCAS SOUSA"
                      className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                    />
                  </div>
                  <button
                    onClick={handleConfirmPixPayment}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all mt-4"
                  >
                    Pagar R$ {activePaymentAmount.toFixed(2).replace('.', ',')} no Cartão
                  </button>
                </div>
              )}

              {/* BOLETO BANCÁRIO */}
              {paymentMethod === 'boleto' && (
                <div className="space-y-4 text-xs pt-2">
                  <p className="text-slate-300">
                    O boleto bancário é compensado em até 1 dia útil. Para liberação imediata, utilize a opção <strong>PIX</strong> com QR Code dinâmico.
                  </p>
                  <div className="p-4 bg-[#05130d] border border-emerald-900/60 rounded-2xl flex items-center justify-between">
                    <span className="font-mono text-white text-xs truncate mr-2">34191.79001 01043.510047 91020.150008 9 94820000003500</span>
                    <button
                      onClick={() => handleCopy('34191.79001 01043.510047 91020.150008 9 94820000003500', 'boleto')}
                      className="p-1.5 text-emerald-400 hover:text-white shrink-0"
                    >
                      {copiedText === 'boleto' ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 3: PLANOS DE RENOVAÇÃO & UPGRADES DISPONÍVEIS */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white font-display">
                    Planos de Assinatura & Upgrades Zuxo
                  </h3>
                  <p className="text-xs text-slate-400">
                    Deseja antecipar períodos mais longos ou liberar mais telas simultâneas?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentPlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => {
                      soundEffects.playClick();
                      setSelectedPlan(plan);
                      setSelectedInvoiceToPay(null);
                    }}
                    className={`cursor-pointer rounded-3xl p-5 border transition-all relative flex flex-col justify-between ${
                      (!selectedInvoiceToPay && selectedPlan.id === plan.id)
                        ? 'bg-gradient-to-b from-[#0c2f22] to-[#071c14] border-2 border-[#00F59B] shadow-[0_0_25px_rgba(0,245,155,0.3)] scale-[1.02]'
                        : 'bg-[#0a1e16] border-emerald-950 hover:border-emerald-700/60'
                    }`}
                  >
                    {plan.recommended && (
                      <span className="absolute -top-3 right-4 px-3 py-0.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-full shadow-md">
                        Mais Escolhido
                      </span>
                    )}

                    <div>
                      <h4 className="text-base font-bold text-white font-display mb-1">
                        {plan.name}
                      </h4>
                      <div className="flex items-baseline gap-1 my-3">
                        <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                          R$ {plan.price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-xs text-slate-400">/{plan.period}</span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-300 border-t border-emerald-950 pt-3 mb-4">
                        {plan.features.map((feat, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#00F59B] flex-shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className={`w-full py-2 rounded-xl text-xs font-bold text-center transition-all ${
                        (!selectedInvoiceToPay && selectedPlan.id === plan.id)
                          ? 'bg-[#00F59B] text-slate-950'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                      }`}>
                        {(!selectedInvoiceToPay && selectedPlan.id === plan.id) ? 'Plano Selecionado ✓' : 'Selecionar Plano'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 4: HISTÓRICO DE FATURAS & RECIBOS */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white font-display">
                  Histórico de Faturas & Quitações
                </h3>
                <span className="text-xs text-slate-400">
                  Total de {invoices.length} faturas registradas
                </span>
              </div>

              <div className="bg-[#0a1e16] border border-emerald-950 rounded-2xl overflow-hidden shadow-md">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#06140e] text-slate-400 border-b border-emerald-950">
                    <tr>
                      <th className="p-3">Descrição da Fatura</th>
                      <th className="p-3">Emissão / Vencimento</th>
                      <th className="p-3">Método</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/60 text-slate-200">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-emerald-950/30">
                        <td className="p-3 font-semibold text-white">
                          {inv.description}
                        </td>
                        <td className="p-3 text-slate-400">
                          <div>{inv.date}</div>
                          {inv.dueDate && (
                            <div className="text-[10px] text-amber-400">Vence: {inv.dueDate}</div>
                          )}
                        </td>
                        <td className="p-3">{inv.paymentMethod}</td>
                        <td className="p-3 font-mono font-bold text-white">
                          R$ {inv.amount.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-3">
                          {inv.status === 'pago' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-[#00F59B] border border-emerald-600/40 text-[10px] font-bold uppercase">
                              Pago ✓
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/60 text-[10px] font-bold uppercase animate-pulse">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {inv.status === 'pendente' ? (
                            <button
                              onClick={() => {
                                soundEffects.playSelect();
                                setSelectedInvoiceToPay(inv);
                                window.scrollTo({ top: 380, behavior: 'smooth' });
                              }}
                              className="px-3 py-1 bg-gradient-to-r from-amber-400 to-[#00F59B] text-slate-950 text-[11px] font-black rounded-lg uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1 ml-auto"
                            >
                              <Zap className="w-3 h-3" />
                              Quitar PIX
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                soundEffects.playClick();
                                setReceiptModalInvoice(inv);
                              }}
                              className="px-2.5 py-1 bg-[#06140e] hover:bg-[#0c2f21] border border-emerald-800/40 text-emerald-400 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1 ml-auto"
                            >
                              <FileText className="w-3 h-3" />
                              Recibo
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CICLO DE COBRANÇA & LINHA DO TEMPO (NOVA ABA) */}
        {activeTab === 'cycle' && (
          <SubscriptionCycleTimeline
            currentUser={currentUser}
            invoices={invoices}
            onNavigateToPayments={() => {
              soundEffects.playClick();
              setActiveTab('payments');
            }}
            onOpenNotifications={() => setIsNotificationModalOpen(true)}
          />
        )}

        {/* TAB 3: GRADE DE PROGRAMAÇÃO DO DIA */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Destaques da Programação de Hoje
                </h3>
                <p className="text-xs text-slate-400">
                  Veja o que está passando agora e as principais transmissões do dia
                </p>
              </div>
              <button
                onClick={onOpenDailyGuide}
                className="text-xs text-emerald-400 hover:text-[#00F59B] font-bold"
              >
                Abrir Grade Completa →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {programs.slice(0, 6).map((prog) => (
                <div
                  key={prog.id}
                  className="bg-[#0a1e16] border border-emerald-950 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{prog.channelLogo}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#00F59B]">{prog.time}</span>
                        <span className="text-xs text-slate-400">{prog.channelName}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">{prog.title}</h4>
                    </div>
                  </div>
                  {prog.isLive && (
                    <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-700/60 rounded text-[9px] font-bold uppercase animate-pulse">
                      No Ar
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: MINHAS CREDENCIAIS */}
        {activeTab === 'credentials' && (
          <div className="bg-[#0a1e16] border border-emerald-900/60 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white font-display">
              Credenciais de Conexão IPTV (Xtream Codes & M3U)
            </h3>
            <p className="text-xs text-slate-400">
              Utilize esses dados caso queira configurar seu acesso em outros reprodutores como Smarters Pro, Tivimate ou IBO Player.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#05130d] p-3.5 rounded-2xl border border-emerald-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">DNS / SERVIDOR:</span>
                  <span className="font-mono text-xs font-semibold text-white">http://dns.zuxoplayer.live:8080</span>
                </div>
                <button
                  onClick={() => handleCopy('http://dns.zuxoplayer.live:8080', 'c-dns')}
                  className="p-1.5 text-emerald-400 hover:text-white"
                >
                  {copiedText === 'c-dns' ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-[#05130d] p-3.5 rounded-2xl border border-emerald-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">USUÁRIO XTREAM:</span>
                  <span className="font-mono text-xs font-bold text-[#00F59B]">
                    {currentUser.email.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(currentUser.email.split('@')[0], 'c-user')}
                  className="p-1.5 text-emerald-400 hover:text-white"
                >
                  {copiedText === 'c-user' ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-[#05130d] p-3.5 rounded-2xl border border-emerald-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">SENHA:</span>
                  <span className="font-mono text-xs font-semibold text-white">zuxo8849pass</span>
                </div>
                <button
                  onClick={() => handleCopy('zuxo8849pass', 'c-pass')}
                  className="p-1.5 text-emerald-400 hover:text-white"
                >
                  {copiedText === 'c-pass' ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-[#05130d] p-3.5 rounded-2xl border border-emerald-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">LINK M3U COMPLETO:</span>
                  <span className="font-mono text-xs text-slate-300 truncate max-w-[200px] block">
                    http://dns.zuxoplayer.live:8080/get.php?username={currentUser.email.split('@')[0]}...
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(`http://dns.zuxoplayer.live:8080/get.php?username=${currentUser.email.split('@')[0]}&password=zuxo8849pass&type=m3u_plus&output=ts`, 'c-m3u')}
                  className="p-1.5 text-emerald-400 hover:text-white"
                >
                  {copiedText === 'c-m3u' ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMPROVANTE / RECIBO MODAL */}
        {receiptModalInvoice && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#081a13] border-2 border-emerald-500/60 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative animate-fadeIn">
              <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                    <Check className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Comprovante de Quitação PIX</h3>
                    <p className="text-[11px] text-emerald-400">Autenticação Bancária Válida</p>
                  </div>
                </div>
                <button
                  onClick={() => setReceiptModalInvoice(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-[#05130d] border border-emerald-950 p-4 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">ID da Transação:</span>
                  <span className="font-mono text-emerald-400 font-bold">{receiptModalInvoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Descrição:</span>
                  <span className="font-semibold text-white">{receiptModalInvoice.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Valor Quitado:</span>
                  <span className="font-mono text-base font-black text-[#00F59B]">
                    R$ {receiptModalInvoice.amount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Data de Pagamento:</span>
                  <span className="text-white">{receiptModalInvoice.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Forma de Pagamento:</span>
                  <span className="text-white">{receiptModalInvoice.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Beneficiário:</span>
                  <span className="text-white font-medium">ZUXO STREAMING TECNOLOGIA LTDA</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    handleCopy(`Comprovante Zuxo Player - ${receiptModalInvoice.description} - R$ ${receiptModalInvoice.amount.toFixed(2)} - Quitado em ${receiptModalInvoice.date}`, 'recibo-copy');
                  }}
                  className="flex-1 py-2.5 bg-[#0e2c20] hover:bg-[#143e2d] border border-emerald-600/50 rounded-xl text-xs font-bold text-[#00F59B] flex items-center justify-center gap-1.5"
                >
                  {copiedText === 'recibo-copy' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedText === 'recibo-copy' ? 'Dados Copiados!' : 'Copiar Comprovante'}
                </button>
                <button
                  onClick={() => setReceiptModalInvoice(null)}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 font-bold text-xs rounded-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATION CENTER MODAL */}
        <NotificationCenterModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          currentUser={currentUser}
          notifications={notifications}
          onMarkAsRead={onMarkNotificationAsRead}
          onDeleteNotification={onDeleteNotification}
          onGoToPayments={() => setActiveTab('payments')}
        />

      </div>
    </div>
  );
};
