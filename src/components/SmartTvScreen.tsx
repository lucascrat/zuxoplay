import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  Film, 
  Clapperboard, 
  Heart, 
  ListPlus, 
  Settings, 
  RotateCw, 
  Server, 
  Play, 
  Wifi, 
  Clock, 
  Star,
  CheckCircle2,
  Info
} from 'lucide-react';
import { ZuxoLogo } from './ZuxoLogo';
import { CHANNELS_DATA, MEDIA_ITEMS_DATA, SERVERS_DATA } from '../data/mockData';
import { Channel, MediaItem, ServerOption } from '../types';
import { soundEffects } from '../utils/audio';

interface SmartTvScreenProps {
  onNavigate: (screen: string) => void;
  onPlayMedia: (item: MediaItem) => void;
  onPlayChannel: (channel: Channel) => void;
  onOpenSettings: () => void;
  onOpenTrial: () => void;
  favoriteCount: number;
}

export const SmartTvScreen: React.FC<SmartTvScreenProps> = ({
  onNavigate,
  onPlayMedia,
  onPlayChannel,
  onOpenSettings,
  onOpenTrial,
  favoriteCount,
}) => {
  // Focus index for keyboard & remote navigation
  // 0: TV ao Vivo, 1: Filmes, 2: Séries, 3: Favoritos, 4: Playlist, 5: Config
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [selectedServer, setSelectedServer] = useState<ServerOption>(SERVERS_DATA[0]);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live clock
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      // Format: Quinta, 23 De Julho
      const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      
      const dayName = days[now.getDay()];
      const dayNum = now.getDate();
      const monthName = months[now.getMonth()];
      
      setCurrentDate(`${dayName}, ${dayNum} De ${monthName}`);
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation for TV feel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isServerModalOpen) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        soundEffects.playClick();
        setFocusedIndex((prev) => (prev < 4 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        soundEffects.playClick();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 4));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        soundEffects.playSelect();
        triggerAction(focusedIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, isServerModalOpen]);

  const triggerAction = (index: number) => {
    soundEffects.playSelect();
    switch (index) {
      case 0:
        onNavigate('live-tv');
        break;
      case 1:
        onNavigate('vod-movies');
        break;
      case 2:
        onNavigate('vod-series');
        break;
      case 3:
        onNavigate('favorites');
        break;
      case 4:
        onOpenSettings(); // Playlist / M3U
        break;
      case 5:
        onOpenSettings();
        break;
      default:
        break;
    }
  };

  const handleRefresh = () => {
    soundEffects.playClick();
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 900);
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full flex flex-col justify-between p-4 md:p-8 bg-radial from-[#092219] via-[#040f0b] to-[#020705] overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP BAR (Matches Image 4 & 3) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-emerald-950/70 pb-4">
        {/* Left: Zuxo PLAYER Logo */}
        <div className="flex items-center gap-3">
          <ZuxoLogo size="md" subtitle="PLAYER" />
        </div>

        {/* Center: Live Date & Clock */}
        <div className="flex items-center gap-2.5 text-slate-300 text-sm md:text-base font-medium">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>{currentDate}</span>
          <span className="text-emerald-500 font-bold px-2 py-0.5 bg-emerald-950/50 rounded border border-emerald-800/40 text-xs">
            {currentTime}
          </span>
        </div>

        {/* Right: Server, Refresh, Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Server Selector */}
          <button
            onClick={() => {
              soundEffects.playClick();
              setIsServerModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-600/40 hover:border-emerald-500 rounded-lg text-xs md:text-sm font-medium text-emerald-300 transition-all shadow-sm"
          >
            <div className="w-2 h-2 rounded-full bg-[#00F59B] animate-pulse" />
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Servidor:</span>
            <span className="font-bold text-white max-w-[130px] truncate">{selectedServer.name.split('(')[0]}</span>
          </button>

          {/* Refresh / Sync Button */}
          <button
            onClick={handleRefresh}
            title="Recarregar canais e listas"
            className="p-2 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-950 hover:border-emerald-700/60 rounded-lg text-emerald-400 hover:text-white transition-all"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00F59B]' : ''}`} />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              soundEffects.playClick();
              onOpenSettings();
            }}
            title="Configurações"
            className="p-2 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-950 hover:border-emerald-700/60 rounded-lg text-emerald-400 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CENTER TILES GRID (Matching Image 4 layout precisely) */}
      <div className="relative z-10 my-auto py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 max-w-7xl mx-auto">
          {/* TILE 1: TV AO VIVO (Hero big glowing card on left/center - directly from Image 4) */}
          <div 
            onClick={() => triggerAction(0)}
            onMouseEnter={() => setFocusedIndex(0)}
            className={`cursor-pointer md:col-span-6 lg:col-span-5 rounded-3xl p-6 lg:p-8 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group select-none ${
              focusedIndex === 0 
                ? 'bg-gradient-to-br from-[#0c2e21] to-[#071b13] border-2 border-[#00F59B] shadow-[0_0_35px_rgba(0,245,155,0.4)] scale-[1.02]' 
                : 'bg-gradient-to-br from-[#0a1f17] to-[#06140e] border border-emerald-900/40 hover:border-emerald-600/60'
            }`}
          >
            {/* Ambient inner glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#00F59B]/15 rounded-full blur-2xl pointer-events-none group-hover:bg-[#00F59B]/25 transition-all" />

            <div className="flex items-center justify-between mb-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-900/60 border border-emerald-500/50 flex items-center justify-center text-[#00F59B] shadow-inner group-hover:scale-105 transition-transform">
                <Tv className="w-9 h-9" />
              </div>
              <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 bg-emerald-950/80 text-[#00F59B] border border-emerald-600/40 rounded-full flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00F59B] animate-ping" />
                Ao Vivo HD/4K
              </span>
            </div>

            <div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight font-display mb-1">
                TV ao Vivo
              </h2>
              <p className="text-emerald-400 font-semibold text-sm lg:text-base flex items-center gap-1.5">
                <span>2.448 canais</span>
                <span className="text-slate-400">· Esportes, Filmes & Abertos</span>
              </p>
            </div>

            {/* Quick mini live preview badge */}
            <div className="mt-6 pt-4 border-t border-emerald-900/50 flex items-center justify-between text-xs text-slate-300">
              <span className="truncate">Premiere · Libertadores & Brasileirão</span>
              <span className="text-[#00F59B] font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Assistir <Play className="w-3 h-3 fill-current" />
              </span>
            </div>
          </div>

          {/* RIGHT 2x2 GRID (Filmes, Séries, Favoritos, Playlist - Image 4) */}
          <div className="md:col-span-6 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            {/* TILE 2: FILMES */}
            <div
              onClick={() => triggerAction(1)}
              onMouseEnter={() => setFocusedIndex(1)}
              className={`cursor-pointer rounded-3xl p-5 lg:p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group select-none ${
                focusedIndex === 1
                  ? 'bg-gradient-to-br from-[#0c2e21] to-[#071b13] border-2 border-[#00F59B] shadow-[0_0_30px_rgba(0,245,155,0.35)] scale-[1.02]'
                  : 'bg-gradient-to-br from-[#091b14] to-[#06140e] border border-emerald-900/40 hover:border-emerald-600/60'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-emerald-300">
                  <Film className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider">
                  Cinema & VOD
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white font-display mb-1">
                  Filmes
                </h3>
                <p className="text-emerald-400/90 text-sm font-medium">
                  42.327 filmes
                </p>
              </div>
            </div>

            {/* TILE 3: SÉRIES */}
            <div
              onClick={() => triggerAction(2)}
              onMouseEnter={() => setFocusedIndex(2)}
              className={`cursor-pointer rounded-3xl p-5 lg:p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group select-none ${
                focusedIndex === 2
                  ? 'bg-gradient-to-br from-[#0c2e21] to-[#071b13] border-2 border-[#00F59B] shadow-[0_0_30px_rgba(0,245,155,0.35)] scale-[1.02]'
                  : 'bg-gradient-to-br from-[#091b14] to-[#06140e] border border-emerald-900/40 hover:border-emerald-600/60'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-emerald-300">
                  <Clapperboard className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider">
                  Temporadas
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white font-display mb-1">
                  Séries
                </h3>
                <p className="text-emerald-400/90 text-sm font-medium">
                  8.539 séries
                </p>
              </div>
            </div>

            {/* TILE 4: FAVORITOS */}
            <div
              onClick={() => triggerAction(3)}
              onMouseEnter={() => setFocusedIndex(3)}
              className={`cursor-pointer rounded-3xl p-5 lg:p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group select-none ${
                focusedIndex === 3
                  ? 'bg-gradient-to-br from-[#0c2e21] to-[#071b13] border-2 border-[#00F59B] shadow-[0_0_30px_rgba(0,245,155,0.35)] scale-[1.02]'
                  : 'bg-gradient-to-br from-[#091b14] to-[#06140e] border border-emerald-900/40 hover:border-emerald-600/60'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-emerald-300">
                  <Heart className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider">
                  Marcados
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white font-display mb-1">
                  Favoritos
                </h3>
                <p className="text-emerald-400/90 text-sm font-medium">
                  {favoriteCount} itens salvos
                </p>
              </div>
            </div>

            {/* TILE 5: PLAYLIST / GERENCIAR */}
            <div
              onClick={() => triggerAction(4)}
              onMouseEnter={() => setFocusedIndex(4)}
              className={`cursor-pointer rounded-3xl p-5 lg:p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group select-none ${
                focusedIndex === 4
                  ? 'bg-gradient-to-br from-[#0c2e21] to-[#071b13] border-2 border-[#00F59B] shadow-[0_0_30px_rgba(0,245,155,0.35)] scale-[1.02]'
                  : 'bg-gradient-to-br from-[#091b14] to-[#06140e] border border-emerald-900/40 hover:border-emerald-600/60'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-emerald-300">
                  <ListPlus className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider">
                  M3U / Xtream
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white font-display mb-1">
                  Playlist
                </h3>
                <p className="text-emerald-400/90 text-sm font-medium">
                  Adicionar / gerenciar
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: "Recém adicionados" (Image 4 bottom carousel) */}
      <div className="relative z-10 pt-4 border-t border-emerald-950/70">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00F59B]" />
            <h3 className="text-base md:text-lg font-bold text-white tracking-wide font-display">
              Recém adicionados
            </h3>
          </div>
          <button
            onClick={() => onNavigate('vod-movies')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            Ver catálogo completo →
          </button>
        </div>

        {/* Carousel items */}
        <div className="flex gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
          {MEDIA_ITEMS_DATA.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                soundEffects.playSelect();
                onPlayMedia(item);
              }}
              className="flex-shrink-0 w-36 sm:w-44 bg-[#0a1b14] border border-emerald-900/40 hover:border-[#00F59B] rounded-2xl p-2 cursor-pointer transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(0,245,155,0.3)] group"
            >
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 bg-slate-900">
                <img
                  src={item.poster}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  {item.year}
                </div>
                <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  {item.rating}
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-[#00F59B] text-slate-950 flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-400 truncate">
                {item.category}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER ACCOUNT STATUS BAR (Matching Image 3 & 4) */}
      <div className="relative z-10 mt-4 pt-3 border-t border-emerald-950/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-medium">Status:</span>
            <span className="text-white font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00F59B]" /> Ativo
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-400">Vence em:</span>{' '}
            <span className="text-white font-semibold">15/04/2026</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <div className="hidden sm:block">
            <span className="text-slate-400">Conexões:</span>{' '}
            <span className="text-[#00F59B] font-semibold">1/1 ativa</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundEffects.playClick();
              onOpenTrial();
            }}
            className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all"
          >
            Renovar / Teste 24h
          </button>
          <div className="flex items-center gap-1.5 text-emerald-400/90 text-xs font-mono">
            <Wifi className="w-3.5 h-3.5" />
            <span>{selectedServer.ping}ms</span>
          </div>
        </div>
      </div>

      {/* SERVER SELECTION MODAL */}
      {isServerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1c15] border border-emerald-600/50 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-emerald-900/60 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-[#00F59B]" />
                <h3 className="text-lg font-bold text-white font-display">
                  Selecionar Servidor CDN
                </h3>
              </div>
              <button
                onClick={() => setIsServerModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Escolha a rota de streaming mais próxima da sua localização para menor latência e sem travamentos.
            </p>
            <div className="space-y-2 mb-6">
              {SERVERS_DATA.map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => {
                    soundEffects.playSelect();
                    setSelectedServer(srv);
                    setIsServerModalOpen(false);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedServer.id === srv.id
                      ? 'bg-emerald-950/70 border-[#00F59B] text-white shadow-[0_0_15px_rgba(0,245,155,0.25)]'
                      : 'bg-[#081610] border-emerald-950 text-slate-300 hover:border-emerald-700'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-semibold">{srv.name}</h4>
                    <span className="text-xs text-slate-400">{srv.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#00F59B]">{srv.ping}ms</span>
                    <div className="w-2 h-2 rounded-full bg-[#00F59B]" />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setIsServerModalOpen(false)}
              className="w-full py-2 bg-emerald-900/60 hover:bg-emerald-800 text-slate-200 text-xs font-bold rounded-xl"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
