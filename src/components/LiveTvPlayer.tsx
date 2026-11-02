import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Heart, 
  Search, 
  Tv, 
  ChevronLeft, 
  ChevronRight, 
  Radio, 
  ShieldCheck, 
  Sparkles,
  ArrowLeft,
  Settings2
} from 'lucide-react';
import { Channel } from '../types';
import { soundEffects } from '../utils/audio';

interface LiveTvPlayerProps {
  channels: Channel[];
  selectedChannel: Channel;
  onSelectChannel: (channel: Channel) => void;
  onToggleFavorite: (id: string) => void;
  onBackToHome: () => void;
}

export const LiveTvPlayer: React.FC<LiveTvPlayerProps> = ({
  channels,
  selectedChannel,
  onSelectChannel,
  onToggleFavorite,
  onBackToHome,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [audioTrack, setAudioTrack] = useState<string>('Português (Brasil) 5.1');
  const [quality, setQuality] = useState<string>('4K 60fps Ultra');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const categories = ['Todos', 'Esportes', 'Filmes & Séries', 'Canais Abertos', 'Notícias', 'Documentários', 'Infantil'];

  const filteredChannels = channels.filter((ch) => {
    const matchesCat = selectedCategory === 'Todos' || ch.category === selectedCategory;
    const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ch.currentProgram.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback: mute then play
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [selectedChannel]);

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

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      if (newVol > 0 && isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const toggleMute = () => {
    soundEffects.playClick();
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
  };

  const toggleFullscreen = () => {
    soundEffects.playClick();
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  const changeChannelRelative = (delta: number) => {
    soundEffects.playClick();
    const currentIndex = channels.findIndex(c => c.id === selectedChannel.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + delta + channels.length) % channels.length;
    onSelectChannel(channels[nextIndex]);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#030907] text-white flex flex-col lg:flex-row">
      {/* LEFT/MAIN: Video Player & EPG Program Details */}
      <div className="flex-1 flex flex-col p-3 sm:p-6 lg:p-8">
        
        {/* Navigation back bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              soundEffects.playClick();
              onBackToHome();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-900/60 rounded-xl text-xs sm:text-sm font-semibold text-emerald-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#00F59B]" />
            Voltar para o Menu Principal
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 bg-red-950/80 text-red-400 border border-red-700/50 rounded-full flex items-center gap-1.5 animate-pulse">
              <Radio className="w-3 h-3 text-red-400" />
              Sinal Ao Vivo
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-950 text-[#00F59B] border border-emerald-700/40 rounded">
              {selectedChannel.resolution}
            </span>
          </div>
        </div>

        {/* The Video Display Container */}
        <div
          ref={playerContainerRef}
          onMouseMove={handleMouseMove}
          className="relative aspect-video w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-emerald-900/50 shadow-2xl group flex items-center justify-center"
        >
          <video
            ref={videoRef}
            src={selectedChannel.streamUrl}
            className="w-full h-full object-contain"
            playsInline
            loop
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Quick channel switch overlay buttons on edges */}
          <button
            onClick={() => changeChannelRelative(-1)}
            title="Canal Anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => changeChannelRelative(1)}
            title="Próximo Canal"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Bottom Video Controls Overlay */}
          <div
            className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 sm:p-6 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Top program title inside video */}
            <div className="flex items-center justify-between mb-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl">{selectedChannel.logo}</span>
                <div>
                  <h3 className="font-extrabold text-white text-sm sm:text-base">
                    {selectedChannel.name}
                  </h3>
                  <p className="text-emerald-400 text-xs truncate max-w-xs sm:max-w-md">
                    {selectedChannel.currentProgram}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onToggleFavorite(selectedChannel.id)}
                className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                  selectedChannel.isFavorite
                    ? 'text-red-500 bg-red-950/60'
                    : 'text-slate-300 hover:text-white bg-black/40'
                }`}
              >
                <Heart className={`w-5 h-5 ${selectedChannel.isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* EPG Progress Bar */}
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mb-3">
              <div
                className="bg-gradient-to-r from-emerald-500 to-[#00F59B] h-full rounded-full transition-all duration-300"
                style={{ width: `${selectedChannel.programProgress}%` }}
              />
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-[#00F59B] hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold shadow-lg transition-transform active:scale-95"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 text-slate-300 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-24 accent-[#00F59B] cursor-pointer"
                  />
                </div>
              </div>

              {/* Quality & Audio Selectors */}
              <div className="flex items-center gap-2 sm:gap-4 text-xs">
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="bg-black/60 border border-emerald-900/60 text-emerald-300 px-2.5 py-1 rounded-lg text-xs outline-none cursor-pointer hidden sm:block"
                >
                  <option value="4K 60fps Ultra">4K 60fps Ultra</option>
                  <option value="1080p FHD 60fps">1080p FHD 60fps</option>
                  <option value="720p HD">720p HD</option>
                </select>

                <select
                  value={audioTrack}
                  onChange={(e) => setAudioTrack(e.target.value)}
                  className="bg-black/60 border border-emerald-900/60 text-slate-300 px-2.5 py-1 rounded-lg text-xs outline-none cursor-pointer hidden sm:block"
                >
                  <option value="Português (Brasil) 5.1">PT-BR 5.1</option>
                  <option value="Inglês Original">Áudio Original</option>
                </select>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-slate-300 hover:text-white transition-colors"
                  title="Tela Cheia"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CURRENT & NEXT SHOW (EPG GUIDE CARDS) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[#091b14] border border-emerald-900/40 rounded-2xl p-4">
            <span className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider">
              No Ar Agora
            </span>
            <h4 className="text-sm font-bold text-white mt-1">
              {selectedChannel.currentProgram}
            </h4>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
              <span>{selectedChannel.category}</span>
              <span className="font-mono text-emerald-400">{selectedChannel.programProgress}% concluído</span>
            </div>
          </div>

          <div className="bg-[#091b14] border border-emerald-900/40 rounded-2xl p-4">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              A Seguir
            </span>
            <h4 className="text-sm font-bold text-slate-200 mt-1">
              {selectedChannel.nextProgram}
            </h4>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
              <span>Transmissão Automática</span>
              <span className="text-xs text-slate-300">Grade EPG Zuxo</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: CHANNELS LIST & CATEGORIES SIDEBAR */}
      <div className="w-full lg:w-96 bg-[#06140e] border-t lg:border-t-0 lg:border-l border-emerald-950/80 flex flex-col h-auto lg:h-[calc(100vh-64px)]">
        {/* Sidebar Header with Search */}
        <div className="p-4 border-b border-emerald-950/80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Tv className="w-4 h-4 text-[#00F59B]" />
              Grade de Canais
            </h3>
            <span className="text-xs text-emerald-400 font-mono font-bold">
              {filteredChannels.length} canais
            </span>
          </div>

          {/* Channel Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar canal ou programa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b2118] border border-emerald-900/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00F59B]"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  soundEffects.playClick();
                  setSelectedCategory(cat);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#00F59B] text-slate-950'
                    : 'bg-[#0a1e16] text-slate-400 hover:text-white border border-emerald-950'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Channels List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => {
                soundEffects.playSelect();
                onSelectChannel(channel);
              }}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${
                selectedChannel.id === channel.id
                  ? 'bg-gradient-to-r from-[#0d2e23] to-[#081a13] border-[#00F59B] shadow-[0_0_15px_rgba(0,245,155,0.25)]'
                  : 'bg-[#091a13] border-emerald-950/60 hover:border-emerald-700/60'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-800/40 flex items-center justify-center text-lg flex-shrink-0">
                  {channel.logo}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs sm:text-sm font-bold text-white truncate">
                      {channel.name}
                    </h5>
                    <span className="text-[9px] font-mono px-1 bg-emerald-950 text-emerald-400 rounded">
                      {channel.resolution}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {channel.currentProgram}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEffects.playClick();
                    onToggleFavorite(channel.id);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    channel.isFavorite ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${channel.isFavorite ? 'fill-current' : ''}`} />
                </button>
                {selectedChannel.id === channel.id && (
                  <div className="w-2 h-2 rounded-full bg-[#00F59B] animate-ping" />
                )}
              </div>
            </div>
          ))}

          {filteredChannels.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhum canal encontrado para essa busca.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
