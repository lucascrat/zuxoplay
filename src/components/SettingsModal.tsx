import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Wifi, 
  Shield, 
  Gauge, 
  ListPlus, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  PlayCircle,
  RefreshCw
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'playlist' | 'speedtest' | 'account'>('general');
  const [playerEngine, setPlayerEngine] = useState<string>('ExoPlayer v2.19 (Recomendado)');
  const [bufferSize, setBufferSize] = useState<string>('5 segundos (Equilibrado)');
  const [hardwareAccel, setHardwareAccel] = useState<boolean>(true);
  const [parentalPin, setParentalPin] = useState<string>('');
  
  // Speed test state
  const [isTestingSpeed, setIsTestingSpeed] = useState<boolean>(false);
  const [speedResults, setSpeedResults] = useState<{
    ping: number;
    download: number;
    jitter: number;
    tested: boolean;
  }>({
    ping: 14,
    download: 240,
    jitter: 3,
    tested: false,
  });

  // Playlist inputs
  const [playlistUrl, setPlaylistUrl] = useState<string>('');
  const [playlistSaved, setPlaylistSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const runSpeedTest = () => {
    soundEffects.playClick();
    setIsTestingSpeed(true);
    setTimeout(() => {
      setIsTestingSpeed(false);
      setSpeedResults({
        ping: Math.floor(10 + Math.random() * 8),
        download: Math.floor(180 + Math.random() * 120),
        jitter: Math.floor(2 + Math.random() * 3),
        tested: true,
      });
      soundEffects.playSelect();
    }, 1800);
  };

  const handleSavePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playSelect();
    setPlaylistSaved(true);
    setTimeout(() => setPlaylistSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#091b14] border border-emerald-600/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-white my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-950/80 mb-6">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-[#00F59B]" />
            <h2 className="text-xl font-black text-white font-display">
              Configurações do Zuxo Player
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 border-b border-emerald-950/50 no-scrollbar">
          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('general');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'general' ? 'bg-[#00F59B] text-slate-950' : 'bg-[#0a1e16] text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Reprodução
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('playlist');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'playlist' ? 'bg-[#00F59B] text-slate-950' : 'bg-[#0a1e16] text-slate-400 hover:text-white'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            Playlists & Xtream
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('speedtest');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'speedtest' ? 'bg-[#00F59B] text-slate-950' : 'bg-[#0a1e16] text-slate-400 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Teste de Rede
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('account');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'account' ? 'bg-[#00F59B] text-slate-950' : 'bg-[#0a1e16] text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Minha Conta
          </button>
        </div>

        {/* TAB 1: GENERAL PLAYBACK */}
        {activeTab === 'general' && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Motor de Decodificação de Vídeo:</label>
              <select
                value={playerEngine}
                onChange={(e) => setPlayerEngine(e.target.value)}
                className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
              >
                <option value="ExoPlayer v2.19 (Recomendado)">ExoPlayer v2.19 (Recomendado para Android & Smart TV)</option>
                <option value="VLC Player Nativo">VLC Player Nativo (Melhor para formatos pesados)</option>
                <option value="Web HLS Native Engine">Web HLS Native Engine (Otimizado para Navegadores & iOS)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Tamanho do Buffer de Pré-carregamento:</label>
              <select
                value={bufferSize}
                onChange={(e) => setBufferSize(e.target.value)}
                className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
              >
                <option value="2 segundos (Ultra Baixa Latência)">2 segundos (Ultra Baixa Latência - Ideal para Jogos ao Vivo)</option>
                <option value="5 segundos (Equilibrado)">5 segundos (Equilibrado - Padrão)</option>
                <option value="10 segundos (Máxima Estabilidade)">10 segundos (Máxima Estabilidade para conexões oscilantes)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#0a1e16] rounded-xl border border-emerald-950">
              <div>
                <span className="font-semibold block text-white">Aceleração de Hardware GPU</span>
                <span className="text-[11px] text-slate-400">Utiliza a placa gráfica do dispositivo para decodificar 4K 60fps</span>
              </div>
              <button
                onClick={() => setHardwareAccel(!hardwareAccel)}
                className={`w-11 h-6 rounded-full transition-colors relative ${hardwareAccel ? 'bg-[#00F59B]' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 absolute top-1 transition-all ${hardwareAccel ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Controle Parental (Bloqueio por PIN):</label>
              <input
                type="password"
                maxLength={4}
                placeholder="Definir PIN de 4 dígitos..."
                value={parentalPin}
                onChange={(e) => setParentalPin(e.target.value)}
                className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-[#00F59B]"
              />
            </div>
          </div>
        )}

        {/* TAB 2: PLAYLIST & XTREAM */}
        {activeTab === 'playlist' && (
          <form onSubmit={handleSavePlaylist} className="space-y-4 text-xs sm:text-sm">
            <p className="text-xs text-slate-300">
              Adicione listas M3U ou integre seu provedor de IPTV usando a API Xtream Codes para sincronizar canais e VOD.
            </p>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">URL da Lista M3U:</label>
              <input
                type="url"
                placeholder="https://servidor.com/get.php?username=..."
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-[#00F59B]"
              />
            </div>

            <div className="p-3 bg-[#0a1e16] rounded-xl border border-emerald-950">
              <span className="text-xs font-bold text-emerald-400 block mb-1">
                Lista Atual Conectada:
              </span>
              <span className="font-mono text-xs text-slate-300">
                http://dns.zuxoplayer.live:8080 (Zuxo VIP Master Feed · 2.448 Canais)
              </span>
            </div>

            {playlistSaved && (
              <div className="p-2.5 bg-emerald-950/80 border border-[#00F59B] rounded-xl text-xs text-[#00F59B] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Lista atualizada e sincronizada com sucesso!
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-bold rounded-xl transition-all"
            >
              Salvar e Recarregar Canais
            </button>
          </form>
        )}

        {/* TAB 3: SPEED TEST */}
        {activeTab === 'speedtest' && (
          <div className="space-y-5 text-center">
            <p className="text-xs text-slate-300">
              Teste a rota entre a sua operadora de internet e os servidores CDN de transmissão do Zuxo Player.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0a1e16] border border-emerald-900/50 p-4 rounded-2xl">
                <span className="text-slate-400 text-xs block">Latência (Ping)</span>
                <span className="text-xl sm:text-2xl font-black text-[#00F59B] font-mono mt-1 block">
                  {speedResults.ping} ms
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">Excelente</span>
              </div>

              <div className="bg-[#0a1e16] border border-emerald-900/50 p-4 rounded-2xl">
                <span className="text-slate-400 text-xs block">Download CDN</span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono mt-1 block">
                  {speedResults.download} Mb/s
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">Apto para 4K HDR</span>
              </div>

              <div className="bg-[#0a1e16] border border-emerald-900/50 p-4 rounded-2xl">
                <span className="text-slate-400 text-xs block">Jitter</span>
                <span className="text-xl sm:text-2xl font-black text-slate-300 font-mono mt-1 block">
                  {speedResults.jitter} ms
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">Sem oscilações</span>
              </div>
            </div>

            <button
              onClick={runSpeedTest}
              disabled={isTestingSpeed}
              className="py-3 px-6 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
            >
              {isTestingSpeed ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Medindo conexão com CDN...
                </span>
              ) : (
                'Iniciar Teste de Velocidade'
              )}
            </button>
          </div>
        )}

        {/* TAB 4: ACCOUNT INFO */}
        {activeTab === 'account' && (
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="bg-[#0a1e16] border border-emerald-900/60 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
                <span className="text-slate-400">Usuário Conectado:</span>
                <span className="font-mono font-bold text-white">zuxo_vip_premium</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
                <span className="text-slate-400">Status da Assinatura:</span>
                <span className="text-[#00F59B] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Ativo (Sem Limitações)
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
                <span className="text-slate-400">Data de Vencimento:</span>
                <span className="font-semibold text-white">15/04/2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Telas Simultâneas:</span>
                <span className="text-white font-semibold">1 de 1 em uso</span>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 pt-2">
              Para renovar seu plano ou adicionar mais telas, utilize o botão Teste 24h ou chame no WhatsApp de suporte.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-emerald-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-slate-200 text-xs font-bold rounded-xl"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
