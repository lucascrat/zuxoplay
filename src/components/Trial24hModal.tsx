import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  Send, 
  MessageSquare, 
  Tv, 
  Smartphone, 
  Monitor, 
  Gamepad2, 
  ShieldCheck, 
  CheckCircle2, 
  HelpCircle,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ZuxoLogo } from './ZuxoLogo';
import { soundEffects } from '../utils/audio';

interface Trial24hModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Trial24hModal: React.FC<Trial24hModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>('zuxo_teste_84920');
  const [userPassword, setUserPassword] = useState<string>('zuxo2026pass');
  const serverDns = 'http://dns.zuxoplayer.live:8080';

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    soundEffects.playClick();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGenerateNew = () => {
    soundEffects.playSelect();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    setUserName(`zuxo_teste_${randomNum}`);
    setUserPassword(`zuxo${Math.floor(1000 + Math.random() * 9000)}`);
    setIsGenerated(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00F59B', '#10B981', '#34D399', '#FFFFFF']
    });
  };

  const m3uUrl = `${serverDns}/get.php?username=${userName}&password=${userPassword}&type=m3u_plus&output=ts`;

  const whatsappMessage = encodeURIComponent(
    `Olá! Gostaria de ativar meu teste de 24 horas no Zuxo Player.\nUsuário de teste: ${userName}`
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0e271e] via-[#081812] to-[#040e0a] border border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,245,155,0.25)] text-white my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-emerald-900/60 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header (Styling directly from Image 1 & 4) */}
        <div className="text-center mb-6">
          <div className="inline-block mb-2">
            <ZuxoLogo size="lg" subtitle="PLAYER" useImage={true} />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/90 text-[#00F59B] border border-emerald-600/50 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            Teste 24 Horas Gratuito
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            TUDO O QUE VOCÊ GOSTA, EM UM SÓ LUGAR!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg mx-auto">
            Filmes, séries, canais e esportes com a melhor qualidade, para você aproveitar quando e onde quiser!
          </p>
        </div>

        {/* Instant Xtream Codes Credentials Card */}
        <div className="bg-[#05140e] border border-emerald-600/40 rounded-2xl p-4 sm:p-5 mb-6">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-950">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00F59B]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Dados de Conexão Imediata (Xtream Codes API)
              </span>
            </div>
            <button
              onClick={handleGenerateNew}
              className="text-xs text-emerald-400 hover:text-[#00F59B] font-bold"
            >
              ⟳ Gerar Novo
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Server DNS */}
            <div className="flex items-center justify-between bg-[#081f16] p-2.5 rounded-xl border border-emerald-950">
              <div>
                <span className="text-slate-400 block text-[10px]">URL DO SERVIDOR (DNS):</span>
                <span className="font-mono font-semibold text-white">{serverDns}</span>
              </div>
              <button
                onClick={() => handleCopy(serverDns, 'dns')}
                className="p-1.5 hover:bg-emerald-900/60 rounded-lg text-emerald-400 transition-colors"
                title="Copiar DNS"
              >
                {copiedField === 'dns' ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Username */}
            <div className="flex items-center justify-between bg-[#081f16] p-2.5 rounded-xl border border-emerald-950">
              <div>
                <span className="text-slate-400 block text-[10px]">USUÁRIO:</span>
                <span className="font-mono font-bold text-[#00F59B]">{userName}</span>
              </div>
              <button
                onClick={() => handleCopy(userName, 'user')}
                className="p-1.5 hover:bg-emerald-900/60 rounded-lg text-emerald-400 transition-colors"
                title="Copiar Usuário"
              >
                {copiedField === 'user' ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Password */}
            <div className="flex items-center justify-between bg-[#081f16] p-2.5 rounded-xl border border-emerald-950">
              <div>
                <span className="text-slate-400 block text-[10px]">SENHA:</span>
                <span className="font-mono font-semibold text-white">{userPassword}</span>
              </div>
              <button
                onClick={() => handleCopy(userPassword, 'pass')}
                className="p-1.5 hover:bg-emerald-900/60 rounded-lg text-emerald-400 transition-colors"
                title="Copiar Senha"
              >
                {copiedField === 'pass' ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Direct Action Buttons: Direct / WhatsApp (Image 1 "CHAME NO DIRECT E SAIBA MAIS!") */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <a
            href={`https://wa.me/?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-4 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 text-center"
          >
            <Send className="w-4 h-4" />
            Chame no WhatsApp / Direct!
          </a>

          <button
            onClick={() => handleCopy(m3uUrl, 'm3u')}
            className="py-3 px-4 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-600/50 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            {copiedField === 'm3u' ? <Check className="w-4 h-4 text-[#00F59B]" /> : <Copy className="w-4 h-4 text-emerald-400" />}
            {copiedField === 'm3u' ? 'Link M3U Copiado!' : 'Copiar Lista URL M3U'}
          </button>
        </div>

        {/* Supported Devices Strip (Directly from Image 1 bottom footer) */}
        <div className="pt-4 border-t border-emerald-950/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/90 text-center mb-3">
            Compatível com todos os seus aparelhos
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            <div className="bg-[#06150f] border border-emerald-950 p-2 rounded-xl flex flex-col items-center">
              <Tv className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-[10px] font-semibold text-slate-300">TV Smart</span>
            </div>
            <div className="bg-[#06150f] border border-emerald-950 p-2 rounded-xl flex flex-col items-center">
              <Smartphone className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-[10px] font-semibold text-slate-300">Android</span>
            </div>
            <div className="bg-[#06150f] border border-emerald-950 p-2 rounded-xl flex flex-col items-center">
              <Smartphone className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-[10px] font-semibold text-slate-300">iPhone / iOS</span>
            </div>
            <div className="bg-[#06150f] border border-emerald-950 p-2 rounded-xl flex flex-col items-center">
              <Monitor className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-[10px] font-semibold text-slate-300">Tablet & PC</span>
            </div>
            <div className="bg-[#06150f] border border-emerald-950 p-2 rounded-xl flex flex-col items-center">
              <Tv className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-[10px] font-semibold text-slate-300">TV Box</span>
            </div>
            <div className="bg-[#06150f] border border-emerald-950 p-2 rounded-xl flex flex-col items-center">
              <Gamepad2 className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-[10px] font-semibold text-slate-300">Video Game</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
