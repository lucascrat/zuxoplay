import React, { useState } from 'react';
import { 
  Video, 
  Film, 
  CalendarDays, 
  Heart, 
  Settings, 
  RotateCw, 
  Wifi, 
  Battery, 
  Sparkles,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Tv
} from 'lucide-react';
import { ZuxoLogo } from './ZuxoLogo';
import { soundEffects } from '../utils/audio';

interface IphoneScreenProps {
  onNavigate: (screen: string) => void;
  onOpenSettings: () => void;
  onOpenTrial: () => void;
  favoriteCount: number;
}

export const IphoneScreen: React.FC<IphoneScreenProps> = ({
  onNavigate,
  onOpenSettings,
  onOpenTrial,
  favoriteCount,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTile, setActiveTile] = useState<string>('tv-ao-vivo');
  const [frameMode, setFrameMode] = useState<'iphone-mockup' | 'full-mobile'>('iphone-mockup');

  const handleTileClick = (id: string, targetScreen: string) => {
    soundEffects.playSelect();
    setActiveTile(id);
    if (targetScreen === 'settings') {
      onOpenSettings();
    } else {
      onNavigate(targetScreen);
    }
  };

  const handleRefresh = () => {
    soundEffects.playClick();
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full py-6 px-4 bg-radial from-[#09241b] via-[#04100b] to-[#020604] flex flex-col items-center justify-center overflow-x-hidden">
      {/* Background radial ambient lights */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Frame Mode Switcher Bar */}
      <div className="z-10 mb-6 flex items-center justify-between w-full max-w-sm sm:max-w-md bg-[#0a1b14] border border-emerald-900/50 rounded-2xl p-1.5 shadow-lg">
        <button
          onClick={() => {
            soundEffects.playClick();
            setFrameMode('iphone-mockup');
          }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            frameMode === 'iphone-mockup'
              ? 'bg-[#00F59B] text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Mockup iPhone
        </button>
        <button
          onClick={() => {
            soundEffects.playClick();
            setFrameMode('full-mobile');
          }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            frameMode === 'full-mobile'
              ? 'bg-[#00F59B] text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tela Completa
        </button>
      </div>

      {/* THE IPHONE CONTAINER (Directly replicating Image 2) */}
      <div
        className={`relative z-10 transition-all duration-300 ${
          frameMode === 'iphone-mockup'
            ? 'w-[360px] sm:w-[390px] h-[780px] sm:h-[820px] rounded-[52px] p-3.5 bg-gradient-to-b from-[#25322d] to-[#121915] border-[6px] border-[#364740] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(0,245,155,0.2)]'
            : 'w-full max-w-md min-h-[720px] rounded-3xl p-4 bg-[#05110d] border border-emerald-900/60 shadow-2xl'
        }`}
      >
        {/* Inner Phone Screen Display */}
        <div className="relative w-full h-full rounded-[44px] bg-gradient-to-b from-[#081f18] via-[#05140f] to-[#020907] p-5 flex flex-col justify-between overflow-hidden border border-emerald-950">
          
          {/* Ambient inner soft glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-56 h-56 bg-[#00F59B]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Status Bar (9:41, Dynamic Island, Wifi, Battery) */}
          <div className="relative z-20 flex items-center justify-between text-white text-xs font-semibold pt-1 px-3">
            <span>9:41</span>
            {/* Dynamic Island pill */}
            <div className="w-24 h-6 bg-black rounded-full border border-neutral-800 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 mr-2" />
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-white" />
              <Battery className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* BRAND LOGO (Center top - Image 2) */}
          <div className="relative z-20 text-center my-auto pt-4 pb-2">
            <div className="inline-block">
              <ZuxoLogo size="lg" showSubtitle={false} />
            </div>
            <p className="text-[11px] font-medium text-emerald-400/80 tracking-wide mt-1">
              Reprodutor Multimídia & IPTV
            </p>
          </div>

          {/* THE 6 MAIN ACTION TILES (Matching Image 2 grid layout) */}
          <div className="relative z-20 space-y-3.5 my-auto px-1">
            {/* 2x2 Grid: TV ao vivo, Filmes, Séries, Favoritos */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Tile 1: TV ao vivo (Active green glowing border like in Image 2) */}
              <button
                onClick={() => handleTileClick('tv-ao-vivo', 'live-tv')}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all duration-200 select-none ${
                  activeTile === 'tv-ao-vivo'
                    ? 'bg-[#0d2e23] border-2 border-[#00F59B] shadow-[0_0_20px_rgba(0,245,155,0.4)] scale-[1.02]'
                    : 'bg-[#0b1d16] border border-emerald-900/60 hover:border-emerald-600/70'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-950/80 flex items-center justify-center text-[#00F59B] mb-2 shadow-inner">
                  <Video className="w-6 h-6" />
                </div>
                <span className="text-white text-xs sm:text-sm font-bold tracking-tight">
                  TV ao vivo
                </span>
                <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                  2.448 canais
                </span>
              </button>

              {/* Tile 2: Filmes */}
              <button
                onClick={() => handleTileClick('filmes', 'vod-movies')}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all duration-200 select-none ${
                  activeTile === 'filmes'
                    ? 'bg-[#0d2e23] border-2 border-[#00F59B] shadow-[0_0_20px_rgba(0,245,155,0.4)] scale-[1.02]'
                    : 'bg-[#0b1d16] border border-emerald-900/60 hover:border-emerald-600/70'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-950/80 flex items-center justify-center text-emerald-300 mb-2 shadow-inner">
                  <Film className="w-6 h-6" />
                </div>
                <span className="text-white text-xs sm:text-sm font-bold tracking-tight">
                  Filmes
                </span>
                <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                  42.327 títulos
                </span>
              </button>

              {/* Tile 3: Séries */}
              <button
                onClick={() => handleTileClick('series', 'vod-series')}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all duration-200 select-none ${
                  activeTile === 'series'
                    ? 'bg-[#0d2e23] border-2 border-[#00F59B] shadow-[0_0_20px_rgba(0,245,155,0.4)] scale-[1.02]'
                    : 'bg-[#0b1d16] border border-emerald-900/60 hover:border-emerald-600/70'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-950/80 flex items-center justify-center text-emerald-300 mb-2 shadow-inner">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <span className="text-white text-xs sm:text-sm font-bold tracking-tight">
                  Séries
                </span>
                <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                  8.539 títulos
                </span>
              </button>

              {/* Tile 4: Favoritos */}
              <button
                onClick={() => handleTileClick('favoritos', 'favorites')}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all duration-200 select-none ${
                  activeTile === 'favoritos'
                    ? 'bg-[#0d2e23] border-2 border-[#00F59B] shadow-[0_0_20px_rgba(0,245,155,0.4)] scale-[1.02]'
                    : 'bg-[#0b1d16] border border-emerald-900/60 hover:border-emerald-600/70'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-950/80 flex items-center justify-center text-emerald-300 mb-2 shadow-inner">
                  <Heart className="w-6 h-6" />
                </div>
                <span className="text-white text-xs sm:text-sm font-bold tracking-tight">
                  Favoritos
                </span>
                <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                  {favoriteCount} salvos
                </span>
              </button>
            </div>

            {/* Tile 5: Configurações (Wide button matching Image 2) */}
            <button
              onClick={() => handleTileClick('config', 'settings')}
              className={`w-full flex items-center justify-center gap-2.5 py-4 px-4 rounded-2xl transition-all duration-200 select-none ${
                activeTile === 'config'
                  ? 'bg-[#0d2e23] border-2 border-[#00F59B] shadow-[0_0_20px_rgba(0,245,155,0.4)]'
                  : 'bg-[#0b1d16] border border-emerald-900/60 hover:border-emerald-600/70'
              }`}
            >
              <Settings className="w-5 h-5 text-emerald-300" />
              <span className="text-white text-xs sm:text-sm font-bold tracking-tight">
                Configurações
              </span>
            </button>

            {/* Tile 6: Recarregar (Refresh button matching Image 2) */}
            <button
              onClick={handleRefresh}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#081510] hover:bg-[#0d241c] border border-emerald-950 hover:border-emerald-800 text-slate-300 hover:text-white transition-all text-xs font-semibold"
            >
              <RotateCw className={`w-4 h-4 text-emerald-400 ${isRefreshing ? 'animate-spin text-[#00F59B]' : ''}`} />
              <span>{isRefreshing ? 'Atualizando...' : 'Recarregar'}</span>
            </button>
          </div>

          {/* Bottom Callout / "Disponível no iPhone & Assista Agora" (Image 2 bottom graphic) */}
          <div className="relative z-20 pt-4 border-t border-emerald-950 flex flex-col gap-2">
            <button
              onClick={() => {
                soundEffects.playSelect();
                onOpenTrial();
              }}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              Assista Agora! Teste 24 Horas
            </button>
            <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <span>Disponível para iPhone, iPad & Apple TV</span>
            </div>
          </div>

        </div>
      </div>

      {/* Helpful Info under the phone mockup */}
      <div className="z-10 mt-6 text-center max-w-md">
        <p className="text-xs text-slate-300">
          Você pode interagir diretamente com a tela do iPhone acima tocando em qualquer botão para navegar pelos canais, filmes ou configurações!
        </p>
      </div>
    </div>
  );
};
