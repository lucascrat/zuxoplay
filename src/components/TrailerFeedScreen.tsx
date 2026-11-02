import React, { useState, useRef, useEffect } from 'react';
import { 
  Heart, 
  Share2, 
  Volume2, 
  VolumeX, 
  Play, 
  ChevronUp, 
  ChevronDown, 
  User, 
  Calendar, 
  Layers, 
  Flame, 
  Check, 
  Smartphone,
  Sparkles,
  Clapperboard,
  Tv,
  Film,
  Compass,
  Tv2,
  RotateCcw
} from 'lucide-react';
import { TrailerItem } from '../types';
import { ZuxoLogo } from './ZuxoLogo';
import { soundEffects } from '../utils/audio';
import { parseVideoSource } from '../utils/videoHelpers';

interface TrailerFeedScreenProps {
  trailers: TrailerItem[];
  onOpenCustomerPortal: () => void;
  onOpenDailyGuide: () => void;
  onOpenAdminPanel: () => void;
  onLikeTrailer: (id: string) => void;
}

type FeedFilter = 'todos' | 'lancamentos' | 'series' | 'aguardados';

export const TrailerFeedScreen: React.FC<TrailerFeedScreenProps> = ({
  trailers,
  onOpenCustomerPortal,
  onOpenDailyGuide,
  onOpenAdminPanel,
  onLikeTrailer,
}) => {
  const [currentFilter, setCurrentFilter] = useState<FeedFilter>('todos');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Filter trailers according to tab selection
  const filteredTrailers = trailers.filter((t) => {
    if (currentFilter === 'todos') return true;
    if (currentFilter === 'lancamentos') return t.type === 'lancamento' || t.year >= 2025;
    if (currentFilter === 'series') return t.type === 'serie' || t.category.toLowerCase().includes('série') || t.category.toLowerCase().includes('serie');
    if (currentFilter === 'aguardados') return t.type === 'aguardado' || (t.featuredTag && t.featuredTag.toLowerCase().includes('aguardado'));
    return true;
  });

  const activeTrailers = filteredTrailers.length > 0 ? filteredTrailers : trailers;
  const currentTrailer = activeTrailers[currentIndex] || activeTrailers[0];

  useEffect(() => {
    // Reset index safely when changing filter
    setCurrentIndex(0);
  }, [currentFilter]);

  useEffect(() => {
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [currentIndex, isMuted, currentTrailer?.id]);

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  const handleNext = () => {
    if (activeTrailers.length === 0) return;
    soundEffects.playClick();
    setCurrentIndex((prev) => (prev < activeTrailers.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    if (activeTrailers.length === 0) return;
    soundEffects.playClick();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : activeTrailers.length - 1));
  };

  // AUTOMATIC TRANSITION TO NEXT TRAILER WHEN FINISHED
  const handleVideoEnded = () => {
    if (activeTrailers.length === 0) return;
    soundEffects.playSelect();
    setCurrentIndex((prev) => (prev < activeTrailers.length - 1 ? prev + 1 : 0));
  };

  // Listen to YouTube postMessage events (State 0 = YT.PlayerState.ENDED)
  useEffect(() => {
    const handleYouTubeMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string') {
          const parsed = JSON.parse(event.data);
          // YouTube postMessage emits event: "onStateChange", info: 0 when video ends
          if (
            (parsed.event === 'onStateChange' && parsed.info === 0) ||
            (parsed.event === 'infoDelivery' && parsed.info && parsed.info.playerState === 0)
          ) {
            handleVideoEnded();
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleYouTubeMessage);
    return () => window.removeEventListener('message', handleYouTubeMessage);
  }, [activeTrailers.length]);

  // Fallback timer for YouTube Shorts duration (Shorts are up to 60s max; fallback after 55s if no message received)
  useEffect(() => {
    const source = parseVideoSource(currentTrailer?.videoUrl);
    if (!source.isYouTube) return;

    // Simulate progress bar smoothly for YouTube embeds
    const startTime = Date.now();
    const assumedDuration = 45000; // 45 seconds average for trailer short
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / assumedDuration) * 100, 100);
      setProgress(pct);
      if (elapsed >= assumedDuration) {
        clearInterval(interval);
        handleVideoEnded();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [currentIndex, currentTrailer?.id]);

  const togglePlay = () => {
    soundEffects.playClick();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEffects.playClick();
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (videoRef.current) {
      videoRef.current.muted = nextMute;
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEffects.playClick();
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleSelectFilter = (filter: FeedFilter) => {
    soundEffects.playClick();
    setCurrentFilter(filter);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isMuted, isPlaying, activeTrailers.length]);

  if (!currentTrailer) {
    return (
      <div className="min-h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center p-8 bg-[#030907] text-white text-center">
        <ZuxoLogo size="lg" subtitle="PORTAL DO CLIENTE" />
        <h2 className="text-xl font-bold mt-4 mb-2">Nenhum trailer encontrado nesta categoria</h2>
        <p className="text-sm text-slate-400 mb-6">Explore as outras categorias ou configure no painel administrativo.</p>
        <div className="flex gap-4">
          <button
            onClick={() => setCurrentFilter('todos')}
            className="px-5 py-2.5 bg-[#00F59B] text-slate-950 font-bold rounded-xl text-xs uppercase"
          >
            Ver Todos os Trailers
          </button>
          <button
            onClick={onOpenCustomerPortal}
            className="px-5 py-2.5 bg-[#0a1e16] border border-emerald-600/40 text-emerald-300 font-bold rounded-xl text-xs"
          >
            Acessar Área do Cliente
          </button>
        </div>
      </div>
    );
  }

  // Count by category for badge counters
  const countAll = trailers.length;
  const countLancamentos = trailers.filter((t) => t.type === 'lancamento' || t.year >= 2025).length;
  const countSeries = trailers.filter((t) => t.type === 'serie' || t.category.toLowerCase().includes('série') || t.category.toLowerCase().includes('serie')).length;
  const countAguardados = trailers.filter((t) => t.type === 'aguardado' || (t.featuredTag && t.featuredTag.toLowerCase().includes('aguardado'))).length;

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full bg-radial from-[#071f16] via-[#030d09] to-[#010503] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#00F59B]/10 rounded-full blur-[160px] pointer-events-none" />

      {/* 9:16 MOBILE CONTAINER */}
      <div className="relative z-10 w-full max-w-[390px] sm:max-w-[420px] aspect-[9/16] max-h-[92vh] rounded-[36px] overflow-hidden bg-black border-2 border-emerald-900/60 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.9),0_0_35px_rgba(0,245,155,0.2)] flex flex-col justify-between">
        
        {/* VIDEO DISPLAY (9:16 FULL COVER - SUPPORTS MP4 & YOUTUBE SHORTS) */}
        <div 
          onClick={togglePlay}
          className="absolute inset-0 cursor-pointer overflow-hidden bg-slate-950"
        >
          {parseVideoSource(currentTrailer.videoUrl, isMuted).isYouTube ? (
            <div className="w-full h-full relative overflow-hidden pointer-events-none">
              <iframe
                key={`${currentTrailer.id}-${isMuted}`}
                src={parseVideoSource(currentTrailer.videoUrl, isMuted).embedUrl}
                title={currentTrailer.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                className="w-full h-[120%] -mt-[10%] object-cover pointer-events-auto border-0"
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              src={currentTrailer.videoUrl}
              poster={currentTrailer.poster}
              playsInline
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              className="w-full h-full object-cover"
            />
          )}

          {/* Pause Indicator overlay on tap */}
          {!isPlaying && !parseVideoSource(currentTrailer.videoUrl).isYouTube && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-md border border-emerald-500/50 flex items-center justify-center text-[#00F59B] shadow-2xl scale-110 transition-transform">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>
            </div>
          )}

          {/* Gradient Scrims */}
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/95 via-black/75 to-transparent pointer-events-none" />
        </div>

        {/* TOP OVERLAY HEADER & CATEGORY PILLS */}
        <div className="relative z-20 p-3 sm:p-4 pt-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ZuxoLogo size="sm" showSubtitle={false} />
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-950/80 text-[#00F59B] border border-emerald-500/40 rounded-full flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#00F59B]" /> Feed Viral
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* PROMINENT BUTTON: Acessar Área do Cliente */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  soundEffects.playSelect();
                  onOpenCustomerPortal();
                }}
                className="px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-[11px] uppercase tracking-wide rounded-xl shadow-[0_0_15px_rgba(0,245,155,0.4)] flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <User className="w-3 h-3" />
                <span>Área do Cliente</span>
              </button>

              {/* Painel Admin */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  soundEffects.playClick();
                  onOpenAdminPanel();
                }}
                title="Painel Administrativo"
                className="p-1.5 rounded-xl bg-black/60 hover:bg-black/90 border border-emerald-900/60 text-slate-300 hover:text-white transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          </div>

          {/* CATEGORY FILTER CHIPS (Tudo / Lançamentos / Séries / Aguardados) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => handleSelectFilter('todos')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 backdrop-blur-md ${
                currentFilter === 'todos'
                  ? 'bg-[#00F59B] text-slate-950 shadow-[0_0_12px_rgba(0,245,155,0.5)] font-black'
                  : 'bg-black/50 text-slate-300 border border-white/10 hover:border-emerald-500/50'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>Tudo ({countAll})</span>
            </button>

            <button
              onClick={() => handleSelectFilter('lancamentos')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 backdrop-blur-md ${
                currentFilter === 'lancamentos'
                  ? 'bg-[#00F59B] text-slate-950 shadow-[0_0_12px_rgba(0,245,155,0.5)] font-black'
                  : 'bg-black/50 text-slate-300 border border-white/10 hover:border-emerald-500/50'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>Lançamentos ({countLancamentos})</span>
            </button>

            <button
              onClick={() => handleSelectFilter('series')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 backdrop-blur-md ${
                currentFilter === 'series'
                  ? 'bg-[#00F59B] text-slate-950 shadow-[0_0_12px_rgba(0,245,155,0.5)] font-black'
                  : 'bg-black/50 text-slate-300 border border-white/10 hover:border-emerald-500/50'
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>Séries ({countSeries})</span>
            </button>

            <button
              onClick={() => handleSelectFilter('aguardados')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 backdrop-blur-md ${
                currentFilter === 'aguardados'
                  ? 'bg-[#00F59B] text-slate-950 shadow-[0_0_12px_rgba(0,245,155,0.5)] font-black'
                  : 'bg-black/50 text-slate-300 border border-white/10 hover:border-emerald-500/50'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Aguardados ({countAguardados})</span>
            </button>
          </div>
        </div>

        {/* RIGHT INTERACTION COLUMN (Like, Share, Audio, Prev/Next) */}
        <div className="relative z-20 self-end mr-3 flex flex-col items-center gap-3 pb-16">
          
          {/* Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundEffects.playClick();
              onLikeTrailer(currentTrailer.id);
            }}
            className="flex flex-col items-center group"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${
              currentTrailer.isLiked
                ? 'bg-red-950/80 border border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-black/50 border border-white/20 text-white group-hover:border-[#00F59B]'
            }`}>
              <Heart className={`w-5 h-5 ${currentTrailer.isLiked ? 'fill-current' : ''}`} />
            </div>
            <span className="text-[10px] font-bold text-white mt-1 drop-shadow">
              {(currentTrailer.likes + (currentTrailer.isLiked ? 1 : 0)).toLocaleString()}
            </span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center group"
            title="Compartilhar Trailer"
          >
            <div className="w-11 h-11 rounded-full bg-black/50 border border-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:border-[#00F59B] transition-all active:scale-90">
              {copiedShare ? <Check className="w-5 h-5 text-[#00F59B]" /> : <Share2 className="w-5 h-5" />}
            </div>
            <span className="text-[10px] font-bold text-white mt-1 drop-shadow">
              {copiedShare ? 'Copiado!' : currentTrailer.shares.toLocaleString()}
            </span>
          </button>

          {/* Mute/Unmute */}
          <button
            onClick={toggleMute}
            className="w-11 h-11 rounded-full bg-black/50 border border-white/20 backdrop-blur-md flex items-center justify-center text-white hover:border-[#00F59B] transition-all active:scale-90"
            title={isMuted ? 'Ativar Som' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-[#00F59B]" />}
          </button>

          {/* Prev Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="w-9 h-9 rounded-full bg-black/60 border border-white/20 text-slate-300 hover:text-white hover:border-[#00F59B] flex items-center justify-center active:scale-90 transition-all mt-1"
            title="Trailer Anterior"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          {/* Next Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="w-9 h-9 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-[#00F59B] hover:bg-[#00F59B] hover:text-slate-950 flex items-center justify-center active:scale-90 transition-all animate-bounce"
            title="Próximo Trailer"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* BOTTOM CONTENT OVERLAY */}
        <div className="relative z-20 p-4 pb-3 flex flex-col gap-2">
          
          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentTrailer.featuredTag && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-gradient-to-r from-emerald-600 to-[#00F59B] text-slate-950 rounded-md shadow-sm">
                {currentTrailer.featuredTag}
              </span>
            )}
            {currentTrailer.streamingPlatform && (
              <span className="text-[10px] font-bold text-slate-950 px-2 py-0.5 bg-amber-400 rounded shadow-sm">
                {currentTrailer.streamingPlatform}
              </span>
            )}
            <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded border border-emerald-900/60">
              {currentTrailer.category}
            </span>
            <span className="text-[10px] font-mono text-slate-300">
              {currentTrailer.year}
            </span>
          </div>

          {/* Movie Title */}
          <h2 className="text-xl sm:text-2xl font-black text-white font-display leading-tight drop-shadow-md">
            {currentTrailer.title}
          </h2>

          {/* Synopsis */}
          <p className="text-xs text-slate-200 leading-relaxed drop-shadow line-clamp-2">
            {currentTrailer.synopsis}
          </p>

          {/* ACTION BUTTONS (Grade de Programação + Área do Cliente) */}
          <div className="pt-2 grid grid-cols-2 gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                soundEffects.playSelect();
                onOpenDailyGuide();
              }}
              className="py-3 px-3 bg-[#0a2318] hover:bg-[#0f3323] border border-emerald-500/50 text-[#00F59B] font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 text-center truncate"
            >
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Grade de Hoje</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                soundEffects.playSelect();
                onOpenCustomerPortal();
              }}
              className="py-3 px-3 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,245,155,0.35)] flex items-center justify-center gap-1.5 transition-all active:scale-95 text-center truncate"
            >
              <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Baixar Apps</span>
            </button>
          </div>

          {/* Video bottom progress bar */}
          <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mt-1">
            <div 
              className="bg-[#00F59B] h-full rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Index counter and auto-advance status */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
            <span className="flex items-center gap-1.5">
              <span>Trailer {currentIndex + 1} de {activeTrailers.length}</span>
              <span className="text-[#00F59B] text-[9px] bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F59B] animate-pulse" />
                Auto-Próximo
              </span>
            </span>
            <span>Setas ↑ ↓</span>
          </div>
        </div>

      </div>

      {/* DESKTOP SIDE PANEL */}
      <div className="hidden lg:flex flex-col ml-8 max-w-xs text-slate-300 space-y-4">
        {/* Quick category filter selector */}
        <div className="bg-[#0a1e16] border border-emerald-900/60 rounded-3xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-[#00F59B]" />
            Catálogo do Feed Viral
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Trailers em alta de séries, filmes lançados e as maiores estreias cinematográficas de 2025/2026.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => handleSelectFilter('todos')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 text-center transition-all ${
                currentFilter === 'todos'
                  ? 'bg-[#00F59B] text-slate-950 font-black shadow-lg'
                  : 'bg-black/40 text-slate-300 hover:bg-emerald-950/60 border border-emerald-900/50'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Todos ({countAll})</span>
            </button>

            <button
              onClick={() => handleSelectFilter('lancamentos')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 text-center transition-all ${
                currentFilter === 'lancamentos'
                  ? 'bg-[#00F59B] text-slate-950 font-black shadow-lg'
                  : 'bg-black/40 text-slate-300 hover:bg-emerald-950/60 border border-emerald-900/50'
              }`}
            >
              <Film className="w-4 h-4 text-emerald-400" />
              <span>Lançamentos ({countLancamentos})</span>
            </button>

            <button
              onClick={() => handleSelectFilter('series')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 text-center transition-all ${
                currentFilter === 'series'
                  ? 'bg-[#00F59B] text-slate-950 font-black shadow-lg'
                  : 'bg-black/40 text-slate-300 hover:bg-emerald-950/60 border border-emerald-900/50'
              }`}
            >
              <Tv className="w-4 h-4 text-cyan-400" />
              <span>Séries Populares ({countSeries})</span>
            </button>

            <button
              onClick={() => handleSelectFilter('aguardados')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 text-center transition-all ${
                currentFilter === 'aguardados'
                  ? 'bg-[#00F59B] text-slate-950 font-black shadow-lg'
                  : 'bg-black/40 text-slate-300 hover:bg-emerald-950/60 border border-emerald-900/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Aguardados ({countAguardados})</span>
            </button>
          </div>
        </div>

        {/* Portal shortcut card */}
        <div className="bg-[#0a1e16] border border-emerald-900/60 rounded-3xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#00F59B]" />
            Portal do Assinante Zuxo
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Acesse seus aplicativos cadastrados, realize pagamentos via PIX ou confira a grade de jogos e programas no ar hoje.
          </p>

          <div className="space-y-2 pt-2 border-t border-emerald-950/80">
            <button
              onClick={onOpenCustomerPortal}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02]"
            >
              <User className="w-3.5 h-3.5" /> Acessar Área do Cliente
            </button>

            <button
              onClick={onOpenDailyGuide}
              className="w-full py-2.5 px-3 bg-[#071610] hover:bg-[#0c241a] border border-emerald-600/50 text-[#00F59B] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" /> Grade de Programação do Dia
            </button>

            <button
              onClick={onOpenAdminPanel}
              className="w-full py-2.5 px-3 bg-[#06120c] hover:bg-[#0a1d13] border border-emerald-950 text-slate-400 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> Painel Admin (Cadastrar Trailers)
            </button>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="bg-[#081711] border border-emerald-950 rounded-2xl p-4 text-[11px] text-slate-400 space-y-1.5">
          <p className="font-semibold text-slate-200">Atalhos:</p>
          <div className="flex justify-between">
            <span>Próximo / Anterior:</span>
            <span className="font-mono text-emerald-400">Setas ↑ ↓</span>
          </div>
          <div className="flex justify-between">
            <span>Pausar / Play:</span>
            <span className="font-mono text-emerald-400">Espaço</span>
          </div>
          <div className="flex justify-between">
            <span>Mutar / Desmutar:</span>
            <span className="font-mono text-emerald-400">Tecla M</span>
          </div>
        </div>
      </div>

    </div>
  );
};
