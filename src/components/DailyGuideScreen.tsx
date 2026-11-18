import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Search,
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
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import { ProgramItem } from '../types';
import { soundEffects } from '../utils/audio';
import { GuideData, fetchGuide, hasEnded, programTiming, recalculateProgramsLiveState } from '../services/epgService';
import { fetchManualPrograms } from '../services/firestoreService';
import { addDays, brazilClock, brazilDateString, formatLongDate } from '../utils/brazilTime';

interface DailyGuideScreenProps {
  onBackToFeed: () => void;
  onOpenCustomerPortal: () => void;
}

const CATEGORIES = ['Todos', 'No Ar Agora', 'Esportes', 'Filmes & Séries', 'Canais Abertos', 'Notícias', 'Documentários', 'Infantil'];
const PAGE_SIZE = 40;

const weekdayShort = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' })
    .format(new Date(`${date}T12:00:00-03:00`))
    .replace(/^./, (c) => c.toUpperCase());

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F59B]';

export const DailyGuideScreen: React.FC<DailyGuideScreenProps> = ({ onBackToFeed, onOpenCustomerPortal }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedChannel, setSelectedChannel] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showEnded, setShowEnded] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [remindedIds, setRemindedIds] = useState<Record<string, boolean>>({});
  const [dayOffset, setDayOffset] = useState<number>(0); // 0 = Hoje, -1 = Ontem, 1 = Amanhã, 2 = Depois de amanhã
  const [now, setNow] = useState<Date>(() => new Date());
  const [syncFeedback, setSyncFeedback] = useState<string>('');

  const [guide, setGuide] = useState<GuideData | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [manual, setManual] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);

  // One clock for the whole screen: drives the live state, the "ended" filter and the day change at midnight.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  // Fresh data from the server every 15 minutes while the screen is open.
  useEffect(() => {
    const timer = setInterval(() => setReloadToken((n) => n + 1), 15 * 60_000);
    return () => clearInterval(timer);
  }, []);

  const today = brazilDateString(now);
  const targetDate = addDays(today, dayOffset);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchGuide(targetDate), fetchManualPrograms(targetDate)])
      .then(([{ guide: data, fromCache: cached }, extras]) => {
        if (cancelled) return;
        setGuide(data);
        setFromCache(cached);
        setManual(extras);
      })
      .catch(() => {
        if (cancelled) return;
        setGuide(null);
        setError('Não foi possível carregar a programação agora. Verifique a sua conexão e tente de novo.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [targetDate, reloadToken]);

  // Back to the first page whenever the list changes shape.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [targetDate, selectedCategory, selectedChannel, searchQuery, showEnded]);

  const activePrograms = useMemo(() => {
    const all = [...(guide?.programs ?? []), ...manual].sort(
      (a, b) => a.time.localeCompare(b.time) || a.channelName.localeCompare(b.channelName)
    );
    return recalculateProgramsLiveState(all, now);
  }, [guide, manual, now]);

  const isDayAvailable = useCallback(
    (offset: number) => !guide || guide.dates.some((d) => d.date === addDays(today, offset)),
    [guide, today]
  );

  const upcoming = useMemo(() => activePrograms.filter((p) => !hasEnded(p, now)), [activePrograms, now]);

  const filteredPrograms = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return activePrograms.filter((p) => {
      if (dayOffset === 0 && !showEnded && !p.isLive && hasEnded(p, now)) return false;
      if (selectedCategory === 'No Ar Agora' ? !p.isLive : selectedCategory !== 'Todos' && p.category !== selectedCategory) return false;
      if (selectedChannel !== 'Todos' && p.channelName !== selectedChannel) return false;
      if (!query) return true;
      return (
        p.title.toLowerCase().includes(query) ||
        p.channelName.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    });
  }, [activePrograms, selectedCategory, selectedChannel, searchQuery, showEnded, dayOffset, now]);

  const endedHiddenCount = useMemo(
    () => (dayOffset === 0 ? activePrograms.filter((p) => !p.isLive && hasEnded(p, now)).length : 0),
    [activePrograms, dayOffset, now]
  );

  // Channels offered in the channel filter: the ones that have something in the chosen category.
  const channelOptions = useMemo(() => {
    const names = new Set<string>();
    for (const p of activePrograms) {
      if (selectedCategory === 'No Ar Agora' ? p.isLive : selectedCategory === 'Todos' || p.category === selectedCategory) names.add(p.channelName);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [activePrograms, selectedCategory]);

  useEffect(() => {
    if (selectedChannel !== 'Todos' && !channelOptions.includes(selectedChannel)) setSelectedChannel('Todos');
  }, [channelOptions, selectedChannel]);

  // Highlights come from what is on air now or still to come, never from what already ended.
  // Only broadcasts the schedule itself marks "Ao Vivo" count as live sport; replays ("VT") never do.
  const highlightSports = useMemo(
    () =>
      upcoming.find((p) => p.category === 'Esportes' && p.badge === 'AO VIVO' && p.isLive && / x /i.test(p.title)) ||
      upcoming.find((p) => p.category === 'Esportes' && p.badge === 'AO VIVO' && / x /i.test(p.title)) ||
      upcoming.find((p) => p.category === 'Esportes' && p.badge === 'AO VIVO' && p.isLive) ||
      upcoming.find((p) => p.category === 'Esportes' && p.badge === 'AO VIVO'),
    [upcoming]
  );

  const highlightMovie = useMemo(() => {
    const isFeature = (p: ProgramItem) => {
      const { startMins, endMins } = programTiming(p);
      return p.category === 'Filmes & Séries' && endMins - startMins >= 80;
    };
    return upcoming.find((p) => isFeature(p) && p.isLive) || upcoming.find((p) => isFeature(p) && p.time >= '20:00') || upcoming.find(isFeature);
  }, [upcoming]);

  const highlightPrime = useMemo(
    () => upcoming.find((p) => p.category === 'Canais Abertos' && p.time >= '19:30') || upcoming.find((p) => p.isLive),
    [upcoming]
  );

  const toggleReminder = (id: string, title: string) => {
    soundEffects.playSelect();
    const isNowReminded = !remindedIds[id];
    setRemindedIds((prev) => ({ ...prev, [id]: isNowReminded }));

    if (isNowReminded) {
      setSyncFeedback(`Lembrete ativado para "${title}". Você receberá um aviso antes de começar.`);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Lembrete Zuxo: ${title}`, {
          body: 'Notificação programada com sucesso no Zuxo Player.',
          icon: '/favicon.ico',
        });
      }
    } else {
      setSyncFeedback(`Lembrete desativado para "${title}".`);
    }
    setTimeout(() => setSyncFeedback(''), 4000);
  };

  const handleManualRefresh = () => {
    soundEffects.playClick();
    setSyncFeedback('Buscando a programação mais recente…');
    setReloadToken((n) => n + 1);
    setTimeout(() => setSyncFeedback(''), 3000);
  };

  const updatedAtLabel = guide?.updatedAt ? brazilClock(new Date(guide.updatedAt)).slice(0, 5) : '--:--';
  const dayLabels: Array<{ offset: number; label: string }> = [
    { offset: -1, label: 'Ontem' },
    { offset: 0, label: 'Hoje' },
    { offset: 1, label: 'Amanhã' },
    { offset: 2, label: weekdayShort(addDays(today, 2)) },
  ];

  const highlightCard = (
    title: string,
    icon: React.ReactNode,
    item: ProgramItem | undefined,
    liveText: string
  ) =>
    item && (
      <div className="bg-gradient-to-br from-[#0e3527] to-[#061710] border border-emerald-500/40 p-4 rounded-3xl relative overflow-hidden shadow-lg min-w-0">
        <div className="flex items-center justify-between gap-2 text-xs text-emerald-400 font-bold mb-2">
          <span className="flex items-center gap-1 min-w-0 truncate">{icon} {title}</span>
          <span className="font-mono text-white px-2 py-0.5 rounded-full bg-black/40 border border-emerald-800 text-[10px] shrink-0">{item.time}</span>
        </div>
        <h3 className="text-base font-black text-white font-display line-clamp-2">{item.title}</h3>
        <p className="text-xs text-slate-300 mt-1 line-clamp-1">{item.channelName}</p>
        {item.isLive && (
          <div className="mt-2.5 flex items-center gap-2 text-[10px] text-red-400 font-bold uppercase">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            {liveText}
          </div>
        )}
      </div>
    );

  return (
    <div className="min-h-[calc(100vh-64px)] w-full overflow-x-hidden bg-radial from-[#07241a] via-[#04110c] to-[#010604] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 min-w-0">

        {/* TOP BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-emerald-950">
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={() => {
                soundEffects.playClick();
                onBackToFeed();
              }}
              className={`flex items-center gap-1.5 px-3 min-h-11 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-900/60 rounded-xl text-xs sm:text-sm font-semibold text-emerald-300 transition-colors shrink-0 ${focusRing}`}
            >
              <ArrowLeft className="w-4 h-4 text-[#00F59B]" />
              Voltar ao Feed
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white font-display flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#00F59B] shrink-0" />
                Grade de Programação
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{formatLongDate(targetDate)}</span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Brasília: {brazilClock(now)}
                </span>
                {guide && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span>{guide.channels} canais</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className={`px-3.5 min-h-11 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-600/50 text-[#00F59B] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-60 ${focusRing}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Atualizando…' : 'Atualizar grade'}
            </button>

            <button
              onClick={() => {
                soundEffects.playSelect();
                onOpenCustomerPortal();
              }}
              className={`px-3.5 min-h-11 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 text-xs font-black uppercase rounded-xl flex items-center gap-1.5 shadow-md ${focusRing}`}
            >
              <User className="w-3.5 h-3.5" />
              Área do Cliente
            </button>
          </div>
        </div>

        {/* FEEDBACK TOAST */}
        {syncFeedback && (
          <div className="bg-[#05170f] border border-[#00F59B] text-[#00F59B] text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-[#00F59B] flex-shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* WHERE THE DATA COMES FROM */}
        <div className="bg-[#061710] border border-emerald-900/50 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
          <div className="flex items-start gap-2 text-slate-300 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00F59B] mt-1 shrink-0" />
            <span>
              <strong>Programação real dos canais</strong>, nos horários de Brasília. Os horários podem mudar de última hora, principalmente em jogos e eventos ao vivo.
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {fromCache ? (
              <span className="text-amber-300">Sem conexão: mostrando a última cópia salva neste aparelho</span>
            ) : (
              <>Atualizada às <strong className="text-white">{updatedAtLabel}</strong></>
            )}
          </div>
        </div>

        {/* DAY SELECTOR */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-1 text-xs text-slate-400 mr-1 font-semibold flex-shrink-0">
            <CalendarDays className="w-4 h-4 text-[#00F59B]" />
            Dia:
          </div>

          {dayLabels.map((tab) => {
            const isSelected = dayOffset === tab.offset;
            const available = isDayAvailable(tab.offset);
            return (
              <button
                key={tab.offset}
                disabled={!available}
                title={available ? undefined : 'A fonte ainda não publicou este dia'}
                onClick={() => {
                  soundEffects.playClick();
                  setDayOffset(tab.offset);
                }}
                aria-pressed={isSelected}
                className={`px-3.5 min-h-11 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 disabled:opacity-35 disabled:cursor-not-allowed ${focusRing} ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 shadow-md'
                    : 'bg-[#0a1e16] text-slate-300 hover:text-white border border-emerald-900/50 hover:bg-[#0f2e21]'
                }`}
              >
                {tab.offset === 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {guide && guide.available && guide.coverage === 'partial' && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            A programação deste dia está incompleta: a fonte ainda não publicou todos os horários.
          </div>
        )}

        {/* HIGHLIGHTS */}
        {!loading && !error && (highlightSports || highlightMovie || highlightPrime) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {highlightCard('ESPORTE', <Trophy className="w-3.5 h-3.5 shrink-0" />, highlightSports, 'No ar agora')}
            {highlightCard('FILME', <Film className="w-3.5 h-3.5 shrink-0" />, highlightMovie, 'No ar agora')}
            {highlightCard('HORÁRIO NOBRE', <Zap className="w-3.5 h-3.5 shrink-0" />, highlightPrime, 'No ar agora')}
          </div>
        )}

        {/* SEARCH & FILTERS */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isLiveTab = cat === 'No Ar Agora';
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    soundEffects.playClick();
                    setSelectedCategory(cat);
                  }}
                  aria-pressed={isSelected}
                  className={`px-3 min-h-11 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${focusRing} ${
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

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="relative flex-1 min-w-0">
              <span className="sr-only">Buscar jogo, filme, novela ou canal</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Buscar jogo, filme, novela ou canal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-11 bg-[#0a1e16] border border-emerald-900/60 rounded-xl pl-9 pr-3 text-base sm:text-xs text-white placeholder-slate-400 outline-none focus:border-[#00F59B]"
              />
            </label>

            <label className="sm:w-60">
              <span className="sr-only">Filtrar por canal</span>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full min-h-11 bg-[#0a1e16] border border-emerald-900/60 rounded-xl px-3 text-base sm:text-xs text-white outline-none focus:border-[#00F59B]"
              >
                <option value="Todos">Todos os canais</option>
                {channelOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* PROGRAM LIST */}
        <div className="space-y-3">
          <div className="text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 px-1">
            <span>
              <strong className="text-white">{filteredPrograms.length}</strong> programas em <strong className="text-white">{formatLongDate(targetDate)}</strong>
            </span>
            {endedHiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowEnded((v) => !v)}
                className={`px-3 min-h-11 rounded-xl border border-emerald-900/60 bg-[#0a1e16] text-emerald-300 font-semibold hover:bg-[#0f2e21] ${focusRing}`}
              >
                {showEnded ? 'Ocultar os que já terminaram' : `Mostrar os que já terminaram (${endedHiddenCount})`}
              </button>
            )}
          </div>

          {loading && !guide && (
            <div className="py-16 text-center text-slate-400 text-sm bg-[#071912] border border-emerald-950 rounded-3xl">
              <RefreshCw className="w-6 h-6 text-[#00F59B] mx-auto mb-3 animate-spin" />
              Carregando a programação…
            </div>
          )}

          {error && !loading && (
            <div className="py-12 text-center text-sm bg-[#071912] border border-red-900/50 rounded-3xl px-6">
              <AlertTriangle className="w-7 h-7 text-amber-400 mx-auto mb-2" />
              <p className="font-bold text-white mb-1">{error}</p>
              <button
                onClick={handleManualRefresh}
                className={`mt-3 px-5 min-h-11 bg-[#00F59B] text-slate-950 font-bold rounded-xl text-xs ${focusRing}`}
              >
                Tentar de novo
              </button>
            </div>
          )}

          {!error && guide && !guide.available && manual.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm bg-[#071912] border border-emerald-950 rounded-3xl px-6">
              <Tv className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-60" />
              <p className="font-bold text-white mb-1">A programação desta data ainda não foi publicada.</p>
              <p className="text-xs">A fonte divulga os próximos dias aos poucos. Volte mais tarde ou escolha outro dia.</p>
            </div>
          )}

          {filteredPrograms.slice(0, visibleCount).map((prog) => (
            <div
              key={prog.id}
              className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0 ${
                prog.isLive
                  ? 'bg-gradient-to-r from-[#0d2f23] to-[#071d15] border-[#00F59B] shadow-[0_0_20px_rgba(0,245,155,0.2)]'
                  : 'bg-[#0a1e16] border-emerald-950 hover:border-emerald-800'
              }`}
            >
              {/* Left: time, channel, title */}
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                <div className="flex flex-col items-center justify-center w-14 sm:w-16 text-center flex-shrink-0">
                  <span className="font-mono text-sm sm:text-base font-black text-white">{prog.time}</span>
                  {prog.endTime && <span className="text-[10px] text-slate-400 font-mono">até {prog.endTime}</span>}
                </div>

                <div className="hidden min-[400px]:flex w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/50 items-center justify-center text-xl flex-shrink-0">
                  {prog.channelLogo}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-emerald-400">{prog.channelName}</span>
                    {prog.isLive && (
                      <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-700/60 text-[9px] font-bold uppercase flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5" /> No ar agora
                      </span>
                    )}
                    {prog.badge && !prog.isLive && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-[#00F59B] border border-emerald-700/40">
                        {prog.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 break-words sm:truncate">{prog.title}</h3>
                  <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{prog.description}</p>

                  {prog.isLive && typeof prog.progress === 'number' && (
                    <div className="mt-2 max-w-xs space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                        <span className="text-[#00F59B] font-bold">{prog.progress}% concluído</span>
                        {prog.endTime && <span>Termina às {prog.endTime}</span>}
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-[#00F59B] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(3, prog.progress))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                <button
                  onClick={() => toggleReminder(prog.id, prog.title)}
                  aria-pressed={!!remindedIds[prog.id]}
                  className={`px-3 min-h-11 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${focusRing} ${
                    remindedIds[prog.id]
                      ? 'bg-emerald-950 border border-[#00F59B] text-[#00F59B]'
                      : 'bg-[#06150f] hover:bg-[#0c2419] border border-emerald-900/60 text-slate-300 hover:text-white'
                  }`}
                >
                  {remindedIds[prog.id] ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Lembrete ativado
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
                  className={`px-3 min-h-11 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 text-xs font-bold rounded-xl hover:brightness-110 ${focusRing}`}
                >
                  Ver no app
                </button>
              </div>
            </div>
          ))}

          {filteredPrograms.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className={`w-full min-h-12 rounded-2xl bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-900/60 text-emerald-300 text-sm font-semibold ${focusRing}`}
            >
              Mostrar mais ({filteredPrograms.length - visibleCount} restantes)
            </button>
          )}

          {!loading && !error && guide?.available && filteredPrograms.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-xs bg-[#071912] border border-emerald-950 rounded-3xl p-8">
              <Tv className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-50" />
              <p className="font-bold text-white text-sm mb-1">Nenhum programa encontrado com esses filtros.</p>
              <p>Tente a categoria "Todos", outro canal ou limpe a busca.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
