import React from 'react';
import { 
  Tv, 
  Smartphone, 
  Monitor, 
  Gamepad2, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  Play, 
  ShieldCheck, 
  Flame, 
  Film, 
  Trophy, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { ZuxoLogo } from './ZuxoLogo';
import { soundEffects } from '../utils/audio';

interface PromoLandingScreenProps {
  onOpenTrial: () => void;
  onNavigate: (screen: string) => void;
}

export const PromoLandingScreen: React.FC<PromoLandingScreenProps> = ({
  onOpenTrial,
  onNavigate,
}) => {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-radial from-[#09261d] via-[#04110c] to-[#020705] text-white p-4 sm:p-8 lg:p-12 overflow-hidden">
      {/* Hero Section matching Image 1 & Image 4 flyer */}
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-block mb-3">
            <ZuxoLogo size="xl" subtitle="PLAYER" useImage={true} />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-950/80 text-[#00F59B] border border-emerald-500/50 rounded-full text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            Tudo o que você gosta, em um só lugar!
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white font-display tracking-tight leading-tight mb-4">
            FILMES, SÉRIES, CANAIS E ESPORTES COM{' '}
            <span className="text-[#00F59B] glow-text">QUALIDADE MÁXIMA!</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8">
            Filmes, séries, canais e esportes com a melhor estabilidade e definição, para você aproveitar quando e onde quiser. Teste grátis agora mesmo!
          </p>

          {/* Call to action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => {
                soundEffects.playSelect();
                onOpenTrial();
              }}
              className="py-3.5 px-7 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wide rounded-2xl shadow-[0_0_25px_rgba(0,245,155,0.4)] transition-all hover:scale-105"
            >
              Liberar Teste 24 Horas Grátis
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                onNavigate('tv-dashboard');
              }}
              className="py-3.5 px-6 bg-[#0a2017] hover:bg-[#0f2e22] border border-emerald-600/50 text-white font-bold text-sm rounded-2xl transition-all flex items-center gap-2"
            >
              <Tv className="w-4 h-4 text-[#00F59B]" />
              Abrir Tela Smart TV
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                onNavigate('iphone-view');
              }}
              className="py-3.5 px-6 bg-[#0a2017] hover:bg-[#0f2e22] border border-emerald-600/50 text-white font-bold text-sm rounded-2xl transition-all flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4 text-[#00F59B]" />
              Ver no iPhone
            </button>
          </div>
        </div>

        {/* 4 Feature Cards (Directly from Image 1: Filmes, Séries, Canais, Esportes) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16">
          <div className="bg-gradient-to-b from-[#0a1e16] to-[#05120d] border border-emerald-900/50 hover:border-[#00F59B] p-6 rounded-3xl transition-all hover:scale-105 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-[#00F59B] mb-4 shadow-inner">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white font-display mb-1">
              FILMES
            </h3>
            <p className="text-xs text-[#00F59B] font-bold uppercase tracking-wider mb-2">
              Lançamentos & Clássicos
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mais de 42.000 títulos atualizados semanalmente com opções de áudio dublado e legendado em 4K.
            </p>
          </div>

          <div className="bg-gradient-to-b from-[#0a1e16] to-[#05120d] border border-emerald-900/50 hover:border-[#00F59B] p-6 rounded-3xl transition-all hover:scale-105 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-[#00F59B] mb-4 shadow-inner">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white font-display mb-1">
              SÉRIES
            </h3>
            <p className="text-xs text-[#00F59B] font-bold uppercase tracking-wider mb-2">
              As Melhores Temporadas
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Maratone séries completas dos maiores streamings com reprodução contínua e sem anúncios.
            </p>
          </div>

          <div className="bg-gradient-to-b from-[#0a1e16] to-[#05120d] border border-emerald-900/50 hover:border-[#00F59B] p-6 rounded-3xl transition-all hover:scale-105 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-[#00F59B] mb-4 shadow-inner">
              <Tv className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white font-display mb-1">
              CANAIS
            </h3>
            <p className="text-xs text-[#00F59B] font-bold uppercase tracking-wider mb-2">
              Nacionais & Internacionais
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mais de 2.400 canais ao vivo com guia EPG em tempo real e qualidade Full HD / 4K 60fps.
            </p>
          </div>

          <div className="bg-gradient-to-b from-[#0a1e16] to-[#05120d] border border-emerald-900/50 hover:border-[#00F59B] p-6 rounded-3xl transition-all hover:scale-105 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-600/40 flex items-center justify-center text-[#00F59B] mb-4 shadow-inner">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white font-display mb-1">
              ESPORTES
            </h3>
            <p className="text-xs text-[#00F59B] font-bold uppercase tracking-wider mb-2">
              Ao Vivo e Muito Mais!
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Libertadores, Brasileirão, Champions League, UFC, Fórmula 1 e NBA com sinal anti-travamento.
            </p>
          </div>
        </div>

        {/* Device Compatibility Grid (Image 1 bottom banner) */}
        <div className="bg-[#05130d] border border-emerald-600/40 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-emerald-950">
            <div>
              <h3 className="text-xl font-black text-white font-display">
                FUNCIONA EM TODOS OS SEUS DISPOSITIVOS
              </h3>
              <p className="text-xs text-emerald-400 font-medium">
                Instale em menos de 2 minutos sem necessidade de aparelhos caros
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00F59B]" /> Suporte Rápido e Eficiente
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#081a13] border border-emerald-950 p-4 rounded-2xl text-center flex flex-col items-center">
              <Tv className="w-7 h-7 text-[#00F59B] mb-2" />
              <span className="text-xs font-bold text-white">TV Smart</span>
              <span className="text-[10px] text-slate-400">Samsung & LG</span>
            </div>
            <div className="bg-[#081a13] border border-emerald-950 p-4 rounded-2xl text-center flex flex-col items-center">
              <Smartphone className="w-7 h-7 text-[#00F59B] mb-2" />
              <span className="text-xs font-bold text-white">Android</span>
              <span className="text-[10px] text-slate-400">Play Store & APK</span>
            </div>
            <div className="bg-[#081a13] border border-emerald-950 p-4 rounded-2xl text-center flex flex-col items-center">
              <Smartphone className="w-7 h-7 text-[#00F59B] mb-2" />
              <span className="text-xs font-bold text-white">iPhone</span>
              <span className="text-[10px] text-slate-400">iOS & iPadOS</span>
            </div>
            <div className="bg-[#081a13] border border-emerald-950 p-4 rounded-2xl text-center flex flex-col items-center">
              <Monitor className="w-7 h-7 text-[#00F59B] mb-2" />
              <span className="text-xs font-bold text-white">PC & Mac</span>
              <span className="text-[10px] text-slate-400">Web Player</span>
            </div>
            <div className="bg-[#081a13] border border-emerald-950 p-4 rounded-2xl text-center flex flex-col items-center">
              <Tv className="w-7 h-7 text-[#00F59B] mb-2" />
              <span className="text-xs font-bold text-white">TV Box</span>
              <span className="text-[10px] text-slate-400">Fire TV Stick</span>
            </div>
            <div className="bg-[#081a13] border border-emerald-950 p-4 rounded-2xl text-center flex flex-col items-center">
              <Gamepad2 className="w-7 h-7 text-[#00F59B] mb-2" />
              <span className="text-xs font-bold text-white">Consoles</span>
              <span className="text-[10px] text-slate-400">Xbox & PS5</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
