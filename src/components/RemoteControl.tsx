import React from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Power, 
  RotateCcw, 
  Home, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Tv, 
  X,
  Play,
  Pause
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface RemoteControlProps {
  isOpen: boolean;
  onClose: () => void;
  onDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onSelect: () => void;
  onBack: () => void;
  onHome: () => void;
  onVolumeChange: (delta: number) => void;
  onToggleMute: () => void;
  onQuickCategory?: (category: string) => void;
  onPowerToggle?: () => void;
  className?: string;
}

export const RemoteControl: React.FC<RemoteControlProps> = ({
  isOpen,
  onClose,
  onDirection,
  onSelect,
  onBack,
  onHome,
  onVolumeChange,
  onToggleMute,
  onQuickCategory,
  onPowerToggle,
  className = '',
}) => {
  if (!isOpen) return null;

  const handleDir = (dir: 'up' | 'down' | 'left' | 'right') => {
    soundEffects.playClick();
    onDirection(dir);
  };

  const handleOK = () => {
    soundEffects.playSelect();
    onSelect();
  };

  return (
    <div 
      className={`fixed right-4 bottom-4 z-50 w-72 bg-gradient-to-b from-[#141d1a] to-[#0a110e] border border-emerald-900/60 rounded-[38px] p-5 shadow-2xl backdrop-blur-md transition-all duration-300 text-slate-200 select-none ${className}`}
      style={{
        boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 25px rgba(0, 245, 155, 0.15)'
      }}
    >
      {/* Remote Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-950/80">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-400/90">
            Controle Remoto
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundEffects.playClick();
              onPowerToggle?.();
            }}
            title="Ligar / Desligar TV"
            className="w-7 h-7 rounded-full bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-400 flex items-center justify-center transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* D-PAD (Directional Pad) */}
      <div className="py-6 flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 rounded-full bg-gradient-to-b from-[#1c2924] to-[#111c17] border-2 border-emerald-900/40 p-2 shadow-inner flex items-center justify-center">
          {/* UP Button */}
          <button
            onClick={() => handleDir('up')}
            className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-10 flex items-center justify-center text-slate-300 hover:text-[#00F59B] active:scale-95 transition-all"
            title="Cima"
          >
            <ChevronUp className="w-6 h-6" />
          </button>

          {/* DOWN Button */}
          <button
            onClick={() => handleDir('down')}
            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-14 h-10 flex items-center justify-center text-slate-300 hover:text-[#00F59B] active:scale-95 transition-all"
            title="Baixo"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          {/* LEFT Button */}
          <button
            onClick={() => handleDir('left')}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-10 h-14 flex items-center justify-center text-slate-300 hover:text-[#00F59B] active:scale-95 transition-all"
            title="Esquerda"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* RIGHT Button */}
          <button
            onClick={() => handleDir('right')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-14 flex items-center justify-center text-slate-300 hover:text-[#00F59B] active:scale-95 transition-all"
            title="Direita"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* OK Center Button */}
          <button
            onClick={handleOK}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-[#00F59B] text-slate-950 font-black text-sm tracking-wider shadow-lg hover:brightness-110 active:scale-90 transition-all flex items-center justify-center"
            style={{
              boxShadow: '0 0 15px rgba(0, 245, 155, 0.4)'
            }}
          >
            OK
          </button>
        </div>
      </div>

      {/* Navigation Function Buttons (Back, Home, Menu) */}
      <div className="grid grid-cols-3 gap-2 px-2 pb-4">
        <button
          onClick={() => {
            soundEffects.playClick();
            onBack();
          }}
          className="flex flex-col items-center justify-center gap-1 py-2 bg-slate-900/80 hover:bg-slate-800 border border-emerald-950/70 rounded-xl text-xs text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px]">Voltar</span>
        </button>

        <button
          onClick={() => {
            soundEffects.playClick();
            onHome();
          }}
          className="flex flex-col items-center justify-center gap-1 py-2 bg-slate-900/80 hover:bg-slate-800 border border-emerald-950/70 rounded-xl text-xs text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <Home className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px]">Início</span>
        </button>

        <button
          onClick={() => {
            soundEffects.playClick();
            onToggleMute();
          }}
          className="flex flex-col items-center justify-center gap-1 py-2 bg-slate-900/80 hover:bg-slate-800 border border-emerald-950/70 rounded-xl text-xs text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <VolumeX className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px]">Mudo</span>
        </button>
      </div>

      {/* Volume & Channels Rockers */}
      <div className="grid grid-cols-2 gap-3 px-2 pb-4">
        <div className="bg-[#111a16] border border-emerald-900/30 rounded-2xl p-2 flex items-center justify-between">
          <button
            onClick={() => {
              soundEffects.playClick();
              onVolumeChange(-5);
            }}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center active:scale-90"
            title="Diminuir Volume"
          >
            <Volume1 className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold text-slate-400">VOL</span>
          <button
            onClick={() => {
              soundEffects.playClick();
              onVolumeChange(5);
            }}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center active:scale-90"
            title="Aumentar Volume"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#111a16] border border-emerald-900/30 rounded-2xl p-2 flex items-center justify-between">
          <button
            onClick={() => {
              soundEffects.playClick();
              onDirection('down');
            }}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center active:scale-90"
            title="Canal Anterior"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold text-slate-400">CH</span>
          <button
            onClick={() => {
              soundEffects.playClick();
              onDirection('up');
            }}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center active:scale-90"
            title="Próximo Canal"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Launch Buttons */}
      <div className="grid grid-cols-2 gap-2 px-2 pb-3">
        <button
          onClick={() => {
            soundEffects.playSelect();
            onQuickCategory?.('live-tv');
          }}
          className="py-1.5 px-2 bg-gradient-to-r from-emerald-950 to-emerald-900 hover:from-emerald-900 hover:to-emerald-800 border border-emerald-500/40 rounded-lg text-[10px] font-bold text-emerald-300 flex items-center justify-center gap-1.5 transition-all"
        >
          <Tv className="w-3.5 h-3.5 text-[#00F59B]" />
          TV AO VIVO
        </button>

        <button
          onClick={() => {
            soundEffects.playSelect();
            onQuickCategory?.('vod-movies');
          }}
          className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-all"
        >
          FILMES
        </button>
      </div>

      {/* Brand logo at bottom of remote */}
      <div className="pt-2 text-center border-t border-emerald-950/60">
        <span className="text-xs font-black tracking-widest text-slate-400 font-display">
          Zux<span className="text-[#00F59B]">o</span>
        </span>
      </div>

      {/* Keyboard hint */}
      <p className="text-[9px] text-center text-slate-400 mt-2">
        Teclado: Setas ↑ ↓ ← →, Enter e Esc
      </p>
    </div>
  );
};
