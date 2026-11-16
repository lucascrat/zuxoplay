import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize,
  Search,
  X,
  Check,
  Calendar,
  Smartphone,
  Clapperboard,
  Tv,
  Film,
  Compass,
  Ticket,
  Sparkles,
  Mic,
  AlertTriangle,
} from 'lucide-react';
import { TrailerItem } from '../types';
import { soundEffects } from '../utils/audio';
import { parseVideoSource, getTrailerThumbnail } from '../utils/videoHelpers';

interface TrailerFeedScreenProps {
  trailers: TrailerItem[];
  onOpenCustomerPortal: () => void;
  onOpenDailyGuide: () => void;
  onLikeTrailer: (id: string) => void;
}

type FeedFilter = 'todos' | 'cinema' | 'em-breve' | 'filmes' | 'series';

// A cinema release stops being listed as "em cartaz" after this many days.
const CINEMA_WINDOW_DAYS = 90;

const AUDIO_LABEL: Record<NonNullable<TrailerItem['audio']>, string> = {
  dublado: 'Dublado',
  nacional: 'Nacional',
  legendado: 'Legendado',
};

function todayIso(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

function isSeries(t: TrailerItem): boolean {
  return t.type === 'serie' || /s[ée]rie/i.test(t.category);
}

function isUpcoming(t: TrailerItem, today: string): boolean {
  if (t.releaseDate) return t.releaseDate > today;
  return t.type === 'aguardado';
}

function isInCinema(t: TrailerItem, today: string): boolean {
  if (isSeries(t) || isUpcoming(t, today)) return false;
  if (t.releaseDate) {
    return t.streamingPlatform === 'Cinema 4K' && daysBetween(t.releaseDate, today) <= CINEMA_WINDOW_DAYS;
  }
  return t.type === 'lancamento';
}

function formatPremiere(releaseDate: string, today: string): string {
  const [year, month, day] = releaseDate.split('-');
  const sameYear = year === today.slice(0, 4);
  return sameYear ? `Estreia ${day}/${month}` : `Estreia ${day}/${month}/${year}`;
}

/** Short status shown on cards and in the player header. */
function getStatusLabel(t: TrailerItem, today: string): string {
  if (isUpcoming(t, today)) return t.releaseDate ? formatPremiere(t.releaseDate, today) : 'Em breve';
  if (isInCinema(t, today)) return 'Em cartaz';
  if (t.streamingPlatform && t.streamingPlatform !== 'Cinema 4K') return t.streamingPlatform;
  return isSeries(t) ? 'Série' : 'Filme';
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function sortFeed(list: TrailerItem[]): TrailerItem[] {
  // Trailers added by the admin (no fixed position) come first, newest on top.
  return [...list].sort((a, b) => {
    const aPos = a.sortOrder ?? -1;
    const bPos = b.sortOrder ?? -1;
    if (aPos !== bPos) return aPos - bPos;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const FILTERS: { id: FeedFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'todos', label: 'Tudo', icon: Compass },
  { id: 'cinema', label: 'Nos cinemas', icon: Ticket },
  { id: 'em-breve', label: 'Em breve', icon: Sparkles },
  { id: 'filmes', label: 'Filmes', icon: Film },
  { id: 'series', label: 'Séries', icon: Tv },
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F59B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#04100b]';

export const TrailerFeedScreen: React.FC<TrailerFeedScreenProps> = ({
  trailers,
  onOpenCustomerPortal,
  onOpenDailyGuide,
  onLikeTrailer,
}) => {
  const today = useMemo(todayIso, []);
  const feed = useMemo(() => sortFeed(trailers), [trailers]);

  const [filter, setFilter] = useState<FeedFilter>('todos');
  const [query, setQuery] = useState('');
  const [currentId, setCurrentId] = useState<string | null>(() => {
    const requested = new URLSearchParams(window.location.search).get('trailer');
    return requested && trailers.some((t) => t.id === requested) ? requested : null;
  });
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const [synopsisOpen, setSynopsisOpen] = useState(false);

  const playerShellRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeCardRef = useRef<HTMLButtonElement>(null);
  const mutedRef = useRef(isMuted);
  mutedRef.current = isMuted;
  // Consecutive trailers that failed to play; stops the auto-skip from looping forever.
  const failuresRef = useRef(0);

  const counts = useMemo(
    () => ({
      todos: feed.length,
      cinema: feed.filter((t) => isInCinema(t, today)).length,
      'em-breve': feed.filter((t) => isUpcoming(t, today)).length,
      filmes: feed.filter((t) => !isSeries(t)).length,
      series: feed.filter(isSeries).length,
    }),
    [feed, today]
  );

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return feed.filter((t) => {
      if (filter === 'cinema' && !isInCinema(t, today)) return false;
      if (filter === 'em-breve' && !isUpcoming(t, today)) return false;
      if (filter === 'filmes' && isSeries(t)) return false;
      if (filter === 'series' && !isSeries(t)) return false;
      if (!q) return true;
      return normalize(`${t.title} ${t.category} ${t.streamingPlatform || ''}`).includes(q);
    });
  }, [feed, filter, query, today]);

  const current = feed.find((t) => t.id === currentId) || visible[0] || feed[0];
  const source = useMemo(() => parseVideoSource(current?.videoUrl || ''), [current?.videoUrl]);

  // The embed URL is built once per trailer. Mute changes afterwards go through the
  // player API, so toggling the sound never restarts the video.
  const embedUrl = useMemo(
    () => parseVideoSource(current?.videoUrl || '', mutedRef.current).embedUrl,
    [current?.id, current?.videoUrl]
  );

  const goTo = useCallback(
    (direction: 1 | -1) => {
      if (!current) return;
      const queue = visible.length > 0 ? visible : feed;
      if (queue.length === 0) return;
      const index = queue.findIndex((t) => t.id === current.id);
      const nextIndex = index === -1 ? 0 : (index + direction + queue.length) % queue.length;
      setCurrentId(queue[nextIndex].id);
    },
    [current, visible, feed]
  );
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  const sendToYouTube = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      'https://www.youtube.com'
    );
  }, []);

  // Reset the player state whenever another trailer is selected.
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);
    setHasStarted(false);
    setPlayerError(false);
    setSynopsisOpen(false);
  }, [current?.id]);

  // YouTube player bridge: subscribe to the iframe events to get the real progress,
  // the play state and the end of the trailer.
  useEffect(() => {
    if (!source.isYouTube) return;
    let gotMessage = false;

    const subscribe = () => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 'zuxo-trailer', channel: 'widget' }),
        'https://www.youtube.com'
      );
    };
    const handshake = window.setInterval(() => {
      if (gotMessage) window.clearInterval(handshake);
      else subscribe();
    }, 600);

    const applyState = (state: number) => {
      if (state === 0) goToRef.current(1);
      else if (state === 1) {
        failuresRef.current = 0;
        setIsPlaying(true);
        setHasStarted(true);
      } else if (state === 2) setIsPlaying(false);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (typeof event.data !== 'string') return;
      let data: { event?: string; info?: unknown };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      gotMessage = true;
      if (data.event === 'onStateChange' && typeof data.info === 'number') {
        applyState(data.info);
      } else if (data.event === 'onError') {
        setPlayerError(true);
      } else if ((data.event === 'infoDelivery' || data.event === 'initialDelivery') && data.info) {
        const info = data.info as { currentTime?: number; duration?: number; playerState?: number };
        if (typeof info.currentTime === 'number') setCurrentTime(info.currentTime);
        if (typeof info.duration === 'number' && info.duration > 0) setDuration(info.duration);
        if (typeof info.playerState === 'number') applyState(info.playerState);
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.clearInterval(handshake);
      window.removeEventListener('message', onMessage);
    };
  }, [current?.id, source.isYouTube]);

  // A trailer that cannot be played is skipped automatically.
  useEffect(() => {
    if (!playerError) return;
    failuresRef.current += 1;
    if (failuresRef.current >= 3) return;
    const timer = window.setTimeout(() => goToRef.current(1), 2500);
    return () => window.clearTimeout(timer);
  }, [playerError]);

  // Native <video> trailers (MP4 links registered by the admin).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || source.isYouTube) return;
    video.muted = mutedRef.current;
    video.play().catch(() => setIsPlaying(false));
  }, [current?.id, source.isYouTube]);

  const togglePlay = useCallback(() => {
    if (source.isYouTube) {
      sendToYouTube(isPlaying ? 'pauseVideo' : 'playVideo');
      setIsPlaying(!isPlaying);
    } else if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  }, [isPlaying, sendToYouTube, source.isYouTube]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    setIsMuted(next);
    if (source.isYouTube) {
      sendToYouTube(next ? 'mute' : 'unMute');
      if (!next) sendToYouTube('setVolume', [100]);
    } else if (videoRef.current) {
      videoRef.current.muted = next;
    }
  }, [sendToYouTube, source.isYouTube]);

  const seekTo = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const target = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1) * duration;
    setCurrentTime(target);
    if (source.isYouTube) sendToYouTube('seekTo', [target, true]);
    else if (videoRef.current) videoRef.current.currentTime = target;
  };

  const toggleFullscreen = () => {
    const shell = playerShellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else shell.requestFullscreen?.().catch(() => {});
  };

  const handleShare = async () => {
    if (!current) return;
    soundEffects.playClick();
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('trailer', current.id);
    const shareData = { title: current.title, text: `Assista ao trailer de ${current.title}`, url: url.toString() };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 2000);
    } catch {
      // The person closed the share sheet or the clipboard is unavailable.
    }
  };

  const selectTrailer = (id: string) => {
    soundEffects.playClick();
    setCurrentId(id);
  };

  // Keyboard shortcuts (ignored while typing in the search field).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(-1);
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo, togglePlay, toggleMute]);

  // On desktop the catalog is its own scroll area: keep the playing card in view.
  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    activeCardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current?.id]);

  if (!current) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center text-white">
        <Clapperboard className="w-10 h-10 text-[#00F59B]" />
        <h2 className="text-xl font-bold">Nenhum trailer cadastrado</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Os trailers aparecem aqui assim que forem cadastrados no painel administrativo.
        </p>
        <button
          onClick={onOpenCustomerPortal}
          className={`mt-2 px-5 py-3 bg-[#00F59B] text-slate-950 font-bold rounded-xl text-sm ${focusRing}`}
        >
          Acessar Área do Cliente
        </button>
      </div>
    );
  }

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const statusLabel = getStatusLabel(current, today);
  const heroImage = getTrailerThumbnail(current.videoUrl, current.poster, 'hq');
  const queue = visible.length > 0 ? visible : feed;
  const queueIndex = queue.findIndex((t) => t.id === current.id);
  // Until YouTube confirms playback the iframe stays tappable, so the person can
  // start the video by hand on devices that block autoplay.
  const overlayActive = !source.isYouTube || hasStarted;

  const iconButton = `w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors ${focusRing}`;

  return (
    <div className="relative flex-1 w-full bg-[#04100b] text-white">
      {/* Ambient backdrop taken from the current trailer */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] overflow-hidden">
        {heroImage && (
          <img src={heroImage} alt="" className="w-full h-full object-cover scale-125 blur-3xl opacity-25" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#04100b]/40 via-[#04100b]/80 to-[#04100b]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1680px] lg:grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_440px] lg:gap-6 lg:p-6">
        {/* ============================ PLAYER + DETAILS ============================ */}
        <section className="min-w-0 max-lg:contents">
          <div
            ref={playerShellRef}
            className="group/player z-30 w-full bg-black lg:rounded-2xl lg:overflow-hidden lg:shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] lg:ring-1 lg:ring-white/10 max-lg:[@media(min-height:560px)]:sticky max-lg:top-[calc(4rem+env(safe-area-inset-top))]"
          >
            <div className="relative w-full aspect-video max-h-[calc(100dvh-4rem)] mx-auto">
              {heroImage && (
                <img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
              )}

              {source.isYouTube ? (
                <iframe
                  ref={iframeRef}
                  key={current.id}
                  src={embedUrl}
                  title={`Trailer de ${current.title}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 w-full h-full border-0"
                />
              ) : (
                <video
                  ref={videoRef}
                  key={current.id}
                  src={current.videoUrl}
                  poster={current.poster}
                  playsInline
                  autoPlay
                  muted={isMuted}
                  onPlay={() => {
                    failuresRef.current = 0;
                    setIsPlaying(true);
                    setHasStarted(true);
                  }}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onEnded={() => goTo(1)}
                  onError={() => setPlayerError(true)}
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                />
              )}

              {/* Tap layer: play / pause */}
              {overlayActive && !playerError && (
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pausar trailer' : 'Reproduzir trailer'}
                  className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center focus:outline-none"
                >
                  {!isPlaying && (
                    <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center">
                      <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-current ml-1" />
                    </span>
                  )}
                </button>
              )}

              {playerError && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 text-center p-6">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                  <p className="text-sm font-semibold">Este trailer não está disponível agora.</p>
                  <p className="text-xs text-slate-400">
                    {failuresRef.current >= 3 ? 'Verifique sua conexão ou escolha outro no catálogo.' : 'Indo para o próximo…'}
                  </p>
                </div>
              )}

              {/* Sound prompt */}
              {isMuted && !playerError && (
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    toggleMute();
                  }}
                  className={`absolute top-3 left-3 flex items-center gap-2 pl-3 pr-4 h-11 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-sm font-semibold hover:bg-black/90 transition-colors ${focusRing}`}
                >
                  <VolumeX className="w-4 h-4" />
                  Ativar som
                </button>
              )}

              {/* Player controls */}
              <div className="absolute inset-x-0 bottom-0 pt-10 bg-gradient-to-t from-black/85 to-transparent pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 px-2 sm:px-3 pb-1">
                  <button type="button" onClick={() => { soundEffects.playClick(); goTo(-1); }} aria-label="Trailer anterior" className={`${iconButton} bg-transparent`}>
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button type="button" onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Reproduzir'} className={`${iconButton} bg-transparent`}>
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>
                  <button type="button" onClick={() => { soundEffects.playClick(); goTo(1); }} aria-label="Próximo trailer" className={`${iconButton} bg-transparent`}>
                    <SkipForward className="w-5 h-5" />
                  </button>
                  <span className="ml-1 text-xs tabular-nums text-slate-200 whitespace-nowrap">
                    {formatTime(currentTime)}
                    {duration > 0 && <span className="text-slate-400"> / {formatTime(duration)}</span>}
                  </span>
                  <span className="flex-1" />
                  <button type="button" onClick={toggleMute} aria-label={isMuted ? 'Ativar som' : 'Silenciar'} className={`${iconButton} bg-transparent`}>
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-[#00F59B]" />}
                  </button>
                  <button type="button" onClick={toggleFullscreen} aria-label="Tela cheia" className={`${iconButton} bg-transparent`}>
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
                <div
                  onClick={seekTo}
                  role="progressbar"
                  aria-label="Progresso do trailer"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  className="pointer-events-auto h-4 flex items-end cursor-pointer"
                >
                  <div className="w-full h-1 bg-white/25">
                    <div className="h-full bg-[#00F59B] transition-[width] duration-300 ease-linear" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="px-4 sm:px-6 lg:px-1 pt-4 lg:pt-5 pb-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-md bg-[#00F59B] text-slate-950 font-bold uppercase tracking-wide">
                {statusLabel}
              </span>
              {current.audio && (
                <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#00F59B]" />
                  {AUDIO_LABEL[current.audio]}
                </span>
              )}
              {current.featuredTag && (
                <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/15">{current.featuredTag}</span>
              )}
              <span className="text-slate-400 font-medium">
                {current.year} · {current.category}
              </span>
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl xl:text-4xl font-black leading-tight text-balance">{current.title}</h1>

            <p className={`mt-2 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl ${synopsisOpen ? '' : 'line-clamp-3 sm:line-clamp-none'}`}>
              {current.synopsis}
            </p>
            {current.synopsis.length > 140 && (
              <button
                type="button"
                onClick={() => setSynopsisOpen((open) => !open)}
                className={`sm:hidden mt-1 text-sm font-semibold text-[#00F59B] rounded ${focusRing}`}
              >
                {synopsisOpen ? 'Ver menos' : 'Ver mais'}
              </button>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  onLikeTrailer(current.id);
                }}
                aria-pressed={!!current.isLiked}
                className={`h-11 px-4 rounded-full flex items-center gap-2 text-sm font-semibold border transition-colors ${focusRing} ${
                  current.isLiked
                    ? 'bg-rose-500/15 border-rose-400/60 text-rose-300'
                    : 'bg-white/5 border-white/15 text-white hover:bg-white/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${current.isLiked ? 'fill-current' : ''}`} />
                {current.isLiked ? 'Curtido' : 'Curtir'}
                {current.likes > 0 && <span className="text-slate-400 tabular-nums">{current.likes.toLocaleString('pt-BR')}</span>}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className={`h-11 px-4 rounded-full flex items-center gap-2 text-sm font-semibold bg-white/5 border border-white/15 hover:bg-white/10 transition-colors ${focusRing}`}
              >
                {shareState === 'copied' ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Share2 className="w-4 h-4" />}
                {shareState === 'copied' ? 'Link copiado' : 'Compartilhar'}
              </button>

              <span className="hidden sm:block flex-1" />

              <button
                type="button"
                onClick={() => {
                  soundEffects.playSelect();
                  onOpenDailyGuide();
                }}
                className={`h-11 px-4 rounded-full flex items-center gap-2 text-sm font-semibold bg-white/5 border border-white/15 hover:bg-white/10 transition-colors ${focusRing}`}
              >
                <Calendar className="w-4 h-4" />
                Grade de hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playSelect();
                  onOpenCustomerPortal();
                }}
                className={`h-11 px-5 rounded-full flex items-center gap-2 text-sm font-bold bg-[#00F59B] text-slate-950 hover:brightness-110 transition ${focusRing}`}
              >
                <Smartphone className="w-4 h-4" />
                Baixar apps
              </button>
            </div>

            <p className="hidden lg:block mt-5 text-xs text-slate-500">
              Atalhos: <kbd className="font-mono text-slate-300">←</kbd> <kbd className="font-mono text-slate-300">→</kbd> trocar trailer ·{' '}
              <kbd className="font-mono text-slate-300">Espaço</kbd> pausar · <kbd className="font-mono text-slate-300">M</kbd> som
            </p>
          </div>
        </section>

        {/* ================================ CATALOG ================================ */}
        <aside
          aria-label="Catálogo de trailers"
          className="min-w-0 mt-4 lg:mt-0 lg:sticky lg:top-[calc(5.5rem+env(safe-area-inset-top))] lg:h-[calc(100dvh-7rem-env(safe-area-inset-top))] lg:flex lg:flex-col lg:rounded-2xl lg:bg-white/[0.04] lg:border lg:border-white/10 lg:overflow-hidden"
        >
          <div className="px-4 sm:px-6 lg:px-4 lg:pt-4 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clapperboard className="w-5 h-5 text-[#00F59B]" />
                Catálogo
              </h2>
              <span className="text-xs text-slate-400 tabular-nums">
                {queueIndex >= 0 ? `${queueIndex + 1} de ${queue.length}` : `${visible.length} trailers`}
              </span>
            </div>

            <label className="relative block">
              <span className="sr-only">Buscar filme ou série</span>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar filme ou série"
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/5 border border-white/10 text-base sm:text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#00F59B] [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Limpar busca"
                  className={`absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white ${focusRing}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>

            <div className="-mx-4 sm:-mx-6 lg:-mx-4 px-4 sm:px-6 lg:px-4 flex gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTERS.map(({ id, label, icon: Icon }) => {
                const active = filter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setFilter(id);
                    }}
                    aria-pressed={active}
                    className={`shrink-0 h-10 px-3.5 rounded-full flex items-center gap-1.5 text-sm font-semibold border transition-colors ${focusRing} ${
                      active
                        ? 'bg-[#00F59B] border-[#00F59B] text-slate-950'
                        : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    <span className={`text-xs tabular-nums ${active ? 'text-slate-800' : 'text-slate-400'}`}>{counts[id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:border-t lg:border-white/10 px-4 sm:px-6 lg:px-2 pb-6 lg:py-2">
            {visible.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold">Nenhum trailer encontrado</p>
                <p className="mt-1 text-xs text-slate-400">Tente outro nome ou veja o catálogo completo.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setFilter('todos');
                  }}
                  className={`mt-4 h-11 px-5 rounded-full bg-white/10 hover:bg-white/15 text-sm font-semibold ${focusRing}`}
                >
                  Ver todos os trailers
                </button>
              </div>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-1 gap-x-3 gap-y-5 lg:gap-1">
                {visible.map((t) => {
                  const active = t.id === current.id;
                  return (
                    <li key={t.id} className="min-w-0">
                      <button
                        ref={active ? activeCardRef : undefined}
                        type="button"
                        onClick={() => selectTrailer(t.id)}
                        aria-current={active ? 'true' : undefined}
                        className={`group w-full text-left rounded-xl lg:flex lg:items-center lg:gap-3 lg:p-2 transition-colors ${focusRing} ${
                          active ? 'lg:bg-[#00F59B]/10' : 'lg:hover:bg-white/5'
                        }`}
                      >
                        <span
                          className={`relative block aspect-video w-full lg:w-40 xl:w-44 shrink-0 rounded-lg overflow-hidden bg-white/5 ring-2 transition-shadow ${
                            active ? 'ring-[#00F59B]' : 'ring-transparent'
                          }`}
                        >
                          <img
                            src={getTrailerThumbnail(t.videoUrl, t.poster)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <span className="absolute left-1.5 top-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[11px] font-bold leading-none">
                            {getStatusLabel(t, today)}
                          </span>
                          {active && (
                            <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-xs font-bold text-[#00F59B] uppercase tracking-wider">
                              Tocando agora
                            </span>
                          )}
                        </span>
                        <span className="block min-w-0 mt-2 lg:mt-0">
                          <span className={`block text-sm font-semibold leading-snug line-clamp-2 ${active ? 'text-[#00F59B]' : 'text-white'}`}>
                            {t.title}
                          </span>
                          <span className="block mt-1 text-xs text-slate-400 truncate">
                            {t.audio ? `${AUDIO_LABEL[t.audio]} · ` : ''}
                            {t.category}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
