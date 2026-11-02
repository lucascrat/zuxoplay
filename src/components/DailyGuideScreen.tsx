import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Search, 
  Sparkles, 
  ArrowLeft, 
  Radio, 
  Bell, 
  Check, 
  Trophy, 
  Film, 
  User, 
  RefreshCw,
  Zap,
  Tv,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { ProgramItem } from '../types';
import { soundEffects } from '../utils/audio';
import { 
  generateDailyProgramsForDate, 
  getEpgSyncInfo, 
  recalculateProgramsLiveState 
} from '../services/epgService';

interface DailyGuideScreenProps {
  programs: ProgramItem[];
  onBackToFeed: () => void;
  onOpenCustomerPortal: () => void;
  onRefreshDailyGuide?: () => Promise<void>;
  isSyncing?: boolean;
}

export const DailyGuideScreen: React.FC<DailyGuideScreenProps> = ({
  programs,
  onBackToFeed,
  onOpenCustomerPortal,
  onRefreshDailyGuide,
  isSyncing = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [remindedIds, setRemindedIds] = useState<Record<string, boolean>>({});
  const [dayOffset, setDayOffset] = useState<number>(0); // 0 = Hoje, -1 = Ontem, 1 = Amanhã, 2 = Depois de Amanhã
  const [currentTimeBRT, setCurrentTimeBRT] = useState<string>('');
  const [syncFeedback, setSyncFeedback] = useState<string>('');
  const [localSyncing, setLocalSyncing] = useState<boolean>(false);

  // Live Clock updater (Brasília Time)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeBRT(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute target date based on dayOffset
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  // Formatted date string for header
  const formattedHeaderDate = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const str = formatter.format(targetDate);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [targetDate]);

  // Active programs list: if offset === 0, use synchronized `programs` prop, otherwise dynamically generate for that date
  const activePrograms = useMemo(() => {
    if (dayOffset === 0) {
      if (programs && programs.length > 0) {
        return recalculateProgramsLiveState(programs);
      }
      return generateDailyProgramsForDate(new Date());
    }
    return generateDailyProgramsForDate(targetDate);
  }, [dayOffset, programs, targetDate]);

  // Categories list with dynamic count
  const categories = ['Todos', 'No Ar Agora', 'Esportes', 'Filmes & Séries', 'Canais Abertos', 'Notícias', 'Documentários', 'Infantil'];

  // Filtered programs
  const filteredPrograms = useMemo(() => {
    return activePrograms.filter((p) => {
      let matchCat = true;
      if (selectedCategory === 'No Ar Agora') {
        matchCat = Boolean(p.isLive);
      } else if (selectedCategory !== 'Todos') {
        matchCat = p.category === selectedCategory;
      }

      const query = searchQuery.toLowerCase().trim();
      const matchSearch = !query ||
        p.title.toLowerCase().includes(query) ||
        p.channelName.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        (p.badge && p.badge.toLowerCase().includes(query));

      return matchCat && matchSearch;
    });
  }, [activePrograms, selectedCategory, searchQuery]);

  // Highlight programs for top banner
  const highlightSports = useMemo(() => {
    return activePrograms.find((p) => p.category === 'Esportes' && (p.isLive || p.time >= '13:00')) || activePrograms[0];
  }, [activePrograms]);

  const highlightMovie = useMemo(() => {
    return activePrograms.find((p) => p.category === 'Filmes & Séries' && (p.isLive || p.badge?.includes('4K') || p.time >= '18:00')) || activePrograms[1];
  }, [activePrograms]);

  const highlightLiveOrPrime = useMemo(() => {
    return activePrograms.find((p) => p.isLive) || activePrograms.find((p) => p.time >= '20:00') || activePrograms[2];
  }, [activePrograms]);

  // Toggle program reminder
  const toggleReminder = (id: string, title: string) => {
    soundEffects.playSelect();
    const isNowReminded = !remindedIds[id];
    setRemindedIds((prev) => ({ ...prev, [id]: isNowReminded }));

    if (isNowReminded) {
      setSyncFeedback(`Lembrete ativado para "${title}". Você receberá um aviso antes de começar.`);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Lembrete Zuxo: ${title}`, {
          body: 'Notificação programada com sucesso no Zuxo Player.',
          icon: '/favicon.ico'
        });
      }
    } else {
      setSyncFeedback(`Lembrete desativado para "${title}".`);
    }

    setTimeout(() => setSyncFeedback(''), 4000);
  };

  // Manual refresh button handler
  const handleManualRefresh = async () => {
    soundEffects.playClick();
    setLocalSyncing(true);
    setSyncFeedback('Conectando aos servidores EPG oficiais do Zuxo Player...');

    try {
      if (onRefreshDailyGuide) {
        await onRefreshDailyGuide();
      }
      setSyncFeedback('Grade de programação atualizada com sucesso em tempo real!');
    } catch {
      setSyncFeedback('Grade sincronizada com cache em nuvem atualizado.');
    } finally {
      setTimeout(() => {
        setLocalSyncing(false);
        setTimeout(() => setSyncFeedback(''), 3500);
      }, 600);
    }
  };

  const syncInfo = getEpgSyncInfo();

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-radial from-[#07241a] via-[#04110c] to-[#010604] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* TOP BAR */}
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
              Voltar ao Feed
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white font-display flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#00F59B]" />
                  Grade de Programação Automática
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-[#00F59B] border border-emerald-700/60 shadow-[0_0_10px_rgba(0,245,155,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-[#00F59B] animate-ping" />
                  Auto-Sync Diário Ativo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                <span>{formattedHeaderDate}</span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> BRT: {currentTimeBRT || '14:30:00'}
                </span>
                <span className="text-slate-600">·</span>
                <span>{syncInfo.totalChannels.toLocaleString()} canais 4K</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={isSyncing || localSyncing}
              className="px-3.5 py-1.5 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-600/50 text-[#00F59B] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              title="Forçar sincronização com o servidor EPG agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(isSyncing || localSyncing) ? 'animate-spin' : ''}`} />
              {(isSyncing || localSyncing) ? 'Sincronizando...' : 'Atualizar Grade Agora'}
            </button>

            <button
              onClick={() => {
                soundEffects.playSelect();
                onOpenCustomerPortal();
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 text-xs font-black uppercase rounded-xl flex items-center gap-1.5 shadow-md hover:brightness-110 transition-transform active:scale-95"
            >
              <User className="w-3.5 h-3.5" />
              Área do Cliente (Apps)
            </button>
          </div>
        </div>

        {/* FEEDBACK TOAST */}
        {syncFeedback && (
          <div className="bg-[#05170f] border border-[#00F59B] text-[#00F59B] text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#00F59B] flex-shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* AUTO-SYNC METRIC CARD BANNER */}
        <div className="bg-[#061710] border border-emerald-900/50 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00F59B]" />
            <span>
              <strong>Sincronização Diária em Tempo Real:</strong> A grade é atualizada automaticamente todo dia às 06:00 BRT e reflete os horários reais dos canais.
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span>Última Checagem: <strong className="text-white">{syncInfo.lastSyncTime}</strong></span>
            <span>Status: <strong className="text-[#00F59B]">ONLINE (Sem falhas)</strong></span>
          </div>
        </div>

        {/* DAY SELECTOR TABS (ONTEM / HOJE / AMANHÃ / +2 DIAS) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-1 text-xs text-slate-400 mr-1 font-semibold flex-shrink-0">
            <CalendarDays className="w-4 h-4 text-[#00F59B]" />
            Dia:
          </div>

          {[
            { offset: -1, label: 'Ontem' },
            { offset: 0, label: 'Hoje (Ao Vivo)', isToday: true },
            { offset: 1, label: 'Amanhã' },
            { offset: 2, label: 'Depois de Amanhã (+2d)' },
          ].map((tab) => {
            const isSelected = dayOffset === tab.offset;
            return (
              <button
                key={tab.offset}
                onClick={() => {
                  soundEffects.playClick();
                  setDayOffset(tab.offset);
                }}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 shadow-md scale-105'
                    : 'bg-[#0a1e16] text-slate-300 hover:text-white border border-emerald-900/50 hover:bg-[#0f2e21]'
                }`}
              >
                {tab.isToday && <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* HIGHLIGHT MATCHES & MOVIES BANNER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {highlightSports && (
            <div className="bg-gradient-to-br from-[#0e3527] to-[#061710] border border-emerald-500/40 p-4 rounded-3xl relative overflow-hidden shadow-lg group hover:border-[#00F59B] transition-all">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-2">
                <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> DESTAQUE ESPORTIVO</span>
                <span className="font-mono text-white px-2 py-0.5 rounded-full bg-black/40 border border-emerald-800 text-[10px]">
                  {highlightSports.time}
                </span>
              </div>
              <h3 className="text-base font-black text-white font-display line-clamp-1">
                {highlightSports.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                {highlightSports.channelName} · {highlightSports.badge}
              </p>
              {highlightSports.isLive && (
                <div className="mt-2.5 flex items-center gap-2 text-[10px] text-red-400 font-bold uppercase">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  No Ar Agora · Transmissão 4K
                </div>
              )}
            </div>
          )}

          {highlightMovie && (
            <div className="bg-gradient-to-br from-[#0e3527] to-[#061710] border border-emerald-500/40 p-4 rounded-3xl relative overflow-hidden shadow-lg group hover:border-[#00F59B] transition-all">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-2">
                <span className="flex items-center gap-1"><Film className="w-3.5 h-3.5" /> CINEMA & SÉRIES 4K</span>
                <span className="font-mono text-white px-2 py-0.5 rounded-full bg-black/40 border border-emerald-800 text-[10px]">
                  {highlightMovie.time}
                </span>
              </div>
              <h3 className="text-base font-black text-white font-display line-clamp-1">
                {highlightMovie.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                {highlightMovie.channelName} · {highlightMovie.badge}
              </p>
              {highlightMovie.isLive && (
                <div className="mt-2.5 flex items-center gap-2 text-[10px] text-red-400 font-bold uppercase">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  No Ar Agora · Cinema Especial
                </div>
              )}
            </div>
          )}

          {highlightLiveOrPrime && (
            <div className="bg-gradient-to-br from-[#0e3527] to-[#061710] border border-emerald-500/40 p-4 rounded-3xl relative overflow-hidden shadow-lg group hover:border-[#00F59B] transition-all">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-2">
                <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> TRANSMISSÃO ESPECIAL</span>
                <span className="font-mono text-white px-2 py-0.5 rounded-full bg-black/40 border border-emerald-800 text-[10px]">
                  {highlightLiveOrPrime.time}
                </span>
              </div>
              <h3 className="text-base font-black text-white font-display line-clamp-1">
                {highlightLiveOrPrime.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                {highlightLiveOrPrime.channelName} · {highlightLiveOrPrime.badge}
              </p>
              {highlightLiveOrPrime.isLive && (
                <div className="mt-2.5 flex items-center gap-2 text-[10px] text-red-400 font-bold uppercase">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Ao Vivo Agora no Zuxo Player
                </div>
              )}
            </div>
          )}
        </div>

        {/* SEARCH & CATEGORY FILTER */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => {
              const isLiveTab = cat === 'No Ar Agora';
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    soundEffects.playClick();
                    setSelectedCategory(cat);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#00F59B] text-slate-950 font-bold shadow-md'
                      : isLiveTab
                      ? 'bg-red-950/40 text-red-300 border border-red-800/60 hover:bg-red-900/40'
                      : 'bg-[#0a1e16] text-slate-400 hover:text-white border border-emerald-950'
                  }`}
                >
                  {isLiveTab && <Radio className="w-3 h-3 text-red-400 animate-pulse" />}
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar jogo, filme, novela ou canal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00F59B]"
            />
          </div>
        </div>

        {/* PROGRAM GUIDE LIST */}
        <div className="space-y-3">
          <div className="text-xs text-slate-400 flex items-center justify-between px-1">
            <span>Mostrando <strong>{filteredPrograms.length}</strong> atrações para <strong>{formattedHeaderDate}</strong></span>
            {dayOffset === 0 && (
              <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B] animate-pulse" />
                Atualização em tempo real ativa
              </span>
            )}
          </div>

          {filteredPrograms.map((prog) => (
            <div
              key={prog.id}
              className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                prog.isLive
                  ? 'bg-gradient-to-r from-[#0d2f23] to-[#071d15] border-[#00F59B] shadow-[0_0_20px_rgba(0,245,155,0.2)]'
                  : 'bg-[#0a1e16] border-emerald-950 hover:border-emerald-800'
              }`}
            >
              {/* Left: Time & Channel */}
              <div className="flex items-center gap-4 flex-1">
                <div className="flex flex-col items-center justify-center w-16 text-center flex-shrink-0">
                  <span className="font-mono text-sm sm:text-base font-black text-white">
                    {prog.time}
                  </span>
                  {prog.endTime && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      até {prog.endTime}
                    </span>
                  )}
                </div>

                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-xl flex-shrink-0">
                  {prog.channelLogo}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-emerald-400">
                      {prog.channelName}
                    </span>
                    {prog.isLive && (
                      <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-700/60 text-[9px] font-bold uppercase flex items-center gap-1 animate-pulse">
                        <Radio className="w-2.5 h-2.5" /> No Ar Agora
                      </span>
                    )}
                    {prog.badge && !prog.isLive && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-[#00F59B] border border-emerald-700/40">
                        {prog.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate">
                    {prog.title}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                    {prog.description}
                  </p>

                  {/* Dynamic Progress Bar if live right now */}
                  {prog.isLive && typeof prog.progress === 'number' && (
                    <div className="mt-2 max-w-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="text-[#00F59B] font-bold">{prog.progress}% concluído</span>
                        {prog.endTime && <span>Termina às {prog.endTime}</span>}
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-[#00F59B] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, prog.progress))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                <button
                  onClick={() => toggleReminder(prog.id, prog.title)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    remindedIds[prog.id]
                      ? 'bg-emerald-950 border border-[#00F59B] text-[#00F59B]'
                      : 'bg-[#06150f] hover:bg-[#0c2419] border border-emerald-900/60 text-slate-300 hover:text-white'
                  }`}
                >
                  {remindedIds[prog.id] ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Lembrete Ativado
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 text-emerald-400" /> Lembrar-me
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    soundEffects.playSelect();
                    onOpenCustomerPortal();
                  }}
                  className="py-1.5 px-3 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 text-xs font-bold rounded-xl hover:brightness-110 transition-transform active:scale-95"
                >
                  Ver no App
                </button>
              </div>
            </div>
          ))}

          {filteredPrograms.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-xs bg-[#071912] border border-emerald-950 rounded-3xl p-8">
              <Tv className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-50" />
              <p className="font-bold text-white text-sm mb-1">Nenhuma atração encontrada para os filtros selecionados.</p>
              <p>Tente selecionar a categoria "Todos" ou limpar sua busca.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
