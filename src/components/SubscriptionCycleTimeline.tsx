import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  CreditCard, 
  QrCode, 
  Zap, 
  ShieldCheck, 
  Tv, 
  Copy, 
  Check, 
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Bell
} from 'lucide-react';
import { UserProfile, Invoice } from '../types';
import { soundEffects } from '../utils/audio';
import { parseDateString, calculateDaysRemaining } from '../services/notificationService';
import { DEFAULT_PIX_KEYS } from '../utils/pixHelpers';

interface SubscriptionCycleTimelineProps {
  currentUser: UserProfile;
  invoices: Invoice[];
  onNavigateToPayments: () => void;
  onOpenNotifications?: () => void;
}

export const SubscriptionCycleTimeline: React.FC<SubscriptionCycleTimelineProps> = ({
  currentUser,
  invoices,
  onNavigateToPayments,
  onOpenNotifications
}) => {
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(new Date());

  // Update clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Expiration date parsing
  const expDate = useMemo(() => {
    const parsed = parseDateString(currentUser.expirationDate);
    if (!parsed) {
      // fallback to 30 days from now
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    // Set to end of day 23:59:59
    parsed.setHours(23, 59, 59, 999);
    return parsed;
  }, [currentUser.expirationDate]);

  // Billing cycle start date (assumed 30 days prior to expiration)
  const cycleStartDate = useMemo(() => {
    const start = new Date(expDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [expDate]);

  // Next projected renewal cycle date (+30 days after expiration)
  const nextCycleDate = useMemo(() => {
    return new Date(expDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  }, [expDate]);

  // Detailed countdown calculation (days, hours, minutes, seconds)
  const countdown = useMemo(() => {
    const diffMs = expDate.getTime() - now.getTime();
    if (diffMs <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds, isExpired: false };
  }, [expDate, now]);

  // Cycle progress percentage (0 to 100%)
  const cycleProgress = useMemo(() => {
    const totalCycleMs = expDate.getTime() - cycleStartDate.getTime();
    const elapsedMs = now.getTime() - cycleStartDate.getTime();
    if (elapsedMs <= 0) return 0;
    if (elapsedMs >= totalCycleMs) return 100;
    return Math.min(100, Math.max(0, Math.round((elapsedMs / totalCycleMs) * 100)));
  }, [cycleStartDate, expDate, now]);

  const daysElapsedInCycle = useMemo(() => {
    const diff = now.getTime() - cycleStartDate.getTime();
    return Math.min(30, Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))));
  }, [cycleStartDate, now]);

  const daysUntilRenewal = countdown.days;
  const isDueSoon = daysUntilRenewal <= 5 && !countdown.isExpired;
  const pendingInvoices = invoices.filter((inv) => inv.status === 'pendente');

  // Format date helper
  const formatDateStr = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  type MilestoneStatus = 'completed' | 'current' | 'upcoming' | 'due_soon' | 'expired' | 'projected';

  // Milestone points in timeline
  const milestones: Array<{
    id: string;
    title: string;
    subtitle: string;
    dateStr: string;
    description: string;
    status: MilestoneStatus;
    badge: string;
    icon: any;
    accentColor: string;
  }> = [
    {
      id: 'start',
      title: 'Início do Ciclo Atual',
      subtitle: 'Ativação & Liberação do Sinal VIP',
      dateStr: formatDateStr(cycleStartDate),
      description: 'Assinatura renovada com sucesso. Acesso total liberado para todas as telas contratadas.',
      status: 'completed',
      badge: 'Concluído ✓',
      icon: CheckCircle2,
      accentColor: '#00F59B'
    },
    {
      id: 'mid',
      title: 'Metade do Ciclo de Uso',
      subtitle: 'Plena Estabilidade & Atualizações',
      dateStr: formatDateStr(new Date(cycleStartDate.getTime() + 15 * 24 * 60 * 60 * 1000)),
      description: 'Canais, séries e catálogo sincronizados. Monitoramento de estabilidade ativo.',
      status: daysElapsedInCycle >= 15 ? 'completed' : 'current',
      badge: daysElapsedInCycle >= 15 ? 'Concluído ✓' : 'Em Andamento 📍',
      icon: daysElapsedInCycle >= 15 ? CheckCircle2 : Sparkles,
      accentColor: daysElapsedInCycle >= 15 ? '#00F59B' : '#38bdf8'
    },
    {
      id: 'pre-alert',
      title: 'Alerta Preventivo de Renovação',
      subtitle: 'Disparo de Notificação Push FCM',
      dateStr: formatDateStr(new Date(expDate.getTime() - 3 * 24 * 60 * 60 * 1000)),
      description: 'Lembrete automático para evitar interrupção de sinal. Chave PIX disponibilizada.',
      status: daysUntilRenewal <= 3 ? 'completed' : 'upcoming',
      badge: daysUntilRenewal <= 3 ? 'Alerta Ativo 🔔' : 'Agendado (3 dias antes)',
      icon: Bell,
      accentColor: daysUntilRenewal <= 3 ? '#f59e0b' : '#94a3b8'
    },
    {
      id: 'renewal',
      title: 'Data de Renovação da Assinatura',
      subtitle: 'Vencimento do Ciclo Atual',
      dateStr: currentUser.expirationDate,
      description: 'Data de fechamento da fatura mensal. Quitação via PIX instantâneo para renovação imediata.',
      status: countdown.isExpired ? 'expired' : isDueSoon ? 'due_soon' : 'upcoming',
      badge: countdown.isExpired ? 'Expirado ⚠️' : isDueSoon ? 'Renovação Iminente ⚠️' : 'Próxima Renovação ⏳',
      icon: Clock,
      accentColor: countdown.isExpired ? '#ef4444' : isDueSoon ? '#f59e0b' : '#00F59B'
    },
    {
      id: 'next-cycle',
      title: 'Próximo Ciclo Projetado',
      subtitle: 'Vigência do Mês Subsequente',
      dateStr: formatDateStr(nextCycleDate),
      description: 'Início de mais 30 dias de programação completa após a confirmação do pagamento.',
      status: 'projected',
      badge: 'Futuro Ciclo 🔮',
      icon: Calendar,
      accentColor: '#10b981'
    }
  ];

  const handleCopyPix = () => {
    soundEffects.playSuccess();
    navigator.clipboard.writeText(DEFAULT_PIX_KEYS[0].key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ====================================================================== */}
      {/* 1. COUNTDOWN HERO CARD (LIVE COUNTDOWN TIMER)                          */}
      {/* ====================================================================== */}
      <div className="bg-gradient-to-r from-[#062418] via-[#041910] to-[#020e09] border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(0,245,155,0.15)] relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-xl bg-emerald-950 border border-emerald-700/60 text-[#00F59B]">
                <Clock className="w-4 h-4 animate-spin-slow" />
              </span>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                Contador Regressivo Oficial
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                countdown.isExpired
                  ? 'bg-red-950 text-red-300 border border-red-700/60'
                  : isDueSoon
                  ? 'bg-amber-950 text-amber-300 border border-amber-700/60 animate-pulse'
                  : 'bg-emerald-950 text-[#00F59B] border border-emerald-700/60'
              }`}>
                {countdown.isExpired ? 'Vencido' : isDueSoon ? 'Renovação Próxima' : 'Sinal 100% Ativo'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white font-display">
              Tempo Restante para a Próxima Renovação
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Sua assinatura Zuxo VIP é válida até <strong className="text-[#00F59B]">{currentUser.expirationDate}</strong> às 23:59. Renove com facilidade via PIX para manter o sinal ininterrupto.
            </p>
          </div>

          {/* ACTION BUTTON */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                soundEffects.playClick();
                onNavigateToPayments();
              }}
              className="py-3 px-6 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center gap-2 transition-all"
            >
              <QrCode className="w-4 h-4" />
              {pendingInvoices.length > 0 ? 'Quitar Fatura Pendente' : 'Antecipar Renovação via PIX'}
            </button>
          </div>
        </div>

        {/* LIVE TIME BLOCKS COUNTDOWN */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-emerald-950/80">
          {/* DIAS */}
          <div className="bg-[#03130c] border border-emerald-600/40 rounded-2xl p-4 text-center shadow-lg relative group">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#00F59B] font-mono tracking-tight">
              {countdown.days.toString().padStart(2, '0')}
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
              {countdown.days === 1 ? 'Dia Restante' : 'Dias Restantes'}
            </span>
          </div>

          {/* HORAS */}
          <div className="bg-[#03130c] border border-emerald-600/40 rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-mono tracking-tight">
              {countdown.hours.toString().padStart(2, '0')}
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
              Horas
            </span>
          </div>

          {/* MINUTOS */}
          <div className="bg-[#03130c] border border-emerald-600/40 rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-mono tracking-tight">
              {countdown.minutes.toString().padStart(2, '0')}
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
              Minutos
            </span>
          </div>

          {/* SEGUNDOS */}
          <div className="bg-[#03130c] border border-emerald-600/40 rounded-2xl p-4 text-center shadow-lg">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-400 font-mono tracking-tight animate-pulse">
              {countdown.seconds.toString().padStart(2, '0')}
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
              Segundos
            </span>
          </div>
        </div>

        {/* PROGRESS BAR ACROSS THE 30-DAY BILLING CYCLE */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00F59B]" />
              Início: <strong>{formatDateStr(cycleStartDate)}</strong>
            </span>
            <span className="font-bold text-[#00F59B]">
              Dia {daysElapsedInCycle} de 30 ({cycleProgress}% do ciclo percorrido)
            </span>
            <span className="flex items-center gap-1.5">
              Renovação: <strong>{currentUser.expirationDate}</strong>
              <span className="w-2 h-2 rounded-full bg-[#00F59B]" />
            </span>
          </div>

          <div className="w-full h-3 bg-[#020d08] rounded-full overflow-hidden p-0.5 border border-emerald-900/60">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                countdown.isExpired
                  ? 'bg-red-500'
                  : isDueSoon
                  ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500'
                  : 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-[#00F59B]'
              }`}
              style={{ width: `${cycleProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 2. VISUAL TIMELINE: CICLO DE COBRANÇA COMPLETO                          */}
      {/* ====================================================================== */}
      <div className="bg-[#05170f] border border-emerald-900/60 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-950">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00F59B]" />
              <h3 className="text-lg font-black text-white font-display">
                Linha do Tempo Visual do Ciclo de Cobrança
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Etapas detalhadas desde o início do período até a próxima renovação e ciclo subsequente
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-[#081e14] border border-emerald-900 text-xs font-semibold text-emerald-300">
              Ciclo Mensal Padrão: 30 Dias
            </span>
          </div>
        </div>

        {/* TIMELINE STEPS VERTICAL / HORIZONTAL PROGRESSION */}
        <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-[#00F59B] before:via-emerald-700 before:to-emerald-950">
          {milestones.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isDueSoonStep = step.status === 'due_soon';
            const isExpiredStep = step.status === 'expired';

            return (
              <div key={step.id} className="relative group">
                {/* TIMELINE NODE PIN */}
                <div 
                  className={`absolute -left-6 sm:-left-8 top-1 w-6 sm:w-7 h-6 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110 shadow-lg ${
                    isCompleted
                      ? 'bg-[#00F59B] text-slate-950 shadow-[0_0_15px_rgba(0,245,155,0.6)]'
                      : isCurrent
                      ? 'bg-sky-400 text-slate-950 ring-4 ring-sky-950 animate-pulse'
                      : isDueSoonStep
                      ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-950 animate-pulse'
                      : isExpiredStep
                      ? 'bg-red-500 text-white ring-4 ring-red-950'
                      : 'bg-[#081f14] text-slate-400 border border-emerald-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* STEP CARD */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-[#081a13] border-emerald-900/70 hover:border-emerald-600/70'
                    : isCurrent
                    ? 'bg-gradient-to-r from-[#072418] to-[#04160e] border-sky-500/50 shadow-[0_0_25px_rgba(56,189,248,0.15)]'
                    : isDueSoonStep
                    ? 'bg-gradient-to-r from-[#211906] to-[#120e03] border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                    : 'bg-[#04140d] border-emerald-950 text-slate-400'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {step.dateStr}
                      </span>
                      <span className="text-slate-600">·</span>
                      <h4 className="text-sm font-bold text-white font-display">
                        {step.title}
                      </h4>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider self-start sm:self-auto ${
                      isCompleted
                        ? 'bg-emerald-950 text-[#00F59B] border border-emerald-700/60'
                        : isCurrent
                        ? 'bg-sky-950 text-sky-300 border border-sky-700/60'
                        : isDueSoonStep
                        ? 'bg-amber-950 text-amber-300 border border-amber-700/60 animate-pulse'
                        : isExpiredStep
                        ? 'bg-red-950 text-red-300 border border-red-700/60'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {step.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 3. QUICK CONTRACT DETAILS & INSTANT PIX RENEWAL CARD                   */}
      {/* ====================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CONTRACT SUMMARY */}
        <div className="bg-[#05170f] border border-emerald-900/60 rounded-3xl p-5 space-y-3">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Detalhes do Plano Zuxo
          </span>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between pb-2 border-b border-emerald-950">
              <span className="text-slate-400">Plano Ativo:</span>
              <strong className="text-white">{currentUser.plan}</strong>
            </div>
            <div className="flex justify-between pb-2 border-b border-emerald-950">
              <span className="text-slate-400">Telas Liberadas:</span>
              <strong className="text-[#00F59B]">{currentUser.screens} {currentUser.screens === 1 ? 'tela' : 'telas simultâneas'}</strong>
            </div>
            <div className="flex justify-between pb-2 border-b border-emerald-950">
              <span className="text-slate-400">Valor da Mensalidade:</span>
              <strong className="text-white font-mono text-sm">
                R$ {(currentUser.customPrice || 35.00).toFixed(2).replace('.', ',')}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Forma de Pagamento:</span>
              <span className="text-[#00F59B] font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3" /> PIX Instantâneo
              </span>
            </div>
          </div>
        </div>

        {/* QUICK PIX KEY WITH ONE-CLICK COPY */}
        <div className="bg-[#05170f] border border-emerald-900/60 rounded-3xl p-5 space-y-3">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5" /> Chave PIX para Renovação
          </span>
          <p className="text-[11px] text-slate-400">
            Copie a chave oficial para pagar direto no app do seu banco a qualquer momento:
          </p>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={DEFAULT_PIX_KEYS[0].key}
              className="w-full bg-[#020b07] border border-emerald-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none truncate pr-10"
            />
            <button
              onClick={handleCopyPix}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-emerald-400 hover:text-white transition-colors"
              title="Copiar Chave PIX"
            >
              {copiedKey ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          {copiedKey && (
            <span className="text-[10px] text-[#00F59B] font-bold block animate-fadeIn">
              Chave PIX copiada para a área de transferência! ✓
            </span>
          )}
        </div>

        {/* IMMEDIATE ACTION CARD */}
        <div className="bg-gradient-to-br from-[#072418] to-[#04140d] border border-emerald-500/40 rounded-3xl p-5 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00F59B]" /> Quitação Imediata
            </span>
            <h4 className="text-sm font-bold text-white mt-1">
              Deseja renovar ou quitar agora?
            </h4>
            <p className="text-[11px] text-slate-300 mt-1">
              Ao confirmar o pagamento via PIX, sua data de vencimento é renovada imediatamente por mais 30 dias.
            </p>
          </div>

          <button
            onClick={() => {
              soundEffects.playSelect();
              onNavigateToPayments();
            }}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wide rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            <span>Ir para Pagamentos & QR Code</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
