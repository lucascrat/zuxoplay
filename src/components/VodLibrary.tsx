import React, { useState } from 'react';
import { 
  Play, 
  Search, 
  Star, 
  Heart, 
  Clock, 
  Film, 
  Clapperboard, 
  X, 
  ArrowLeft,
  Sparkles,
  Volume2
} from 'lucide-react';
import { MediaItem } from '../types';
import { soundEffects } from '../utils/audio';

interface VodLibraryProps {
  mediaItems: MediaItem[];
  initialType?: 'all' | 'movie' | 'series' | 'favorites';
  onPlayMedia: (item: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onBackToHome: () => void;
}

export const VodLibrary: React.FC<VodLibraryProps> = ({
  mediaItems,
  initialType = 'all',
  onPlayMedia,
  onToggleFavorite,
  onBackToHome,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'series' | 'favorites'>(initialType);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Todos');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  const genres = ['Todos', 'Lançamentos', 'Ação & Guerra', 'Ficção & Drama', 'Comédia', 'Épico & Ação', 'Fantasia'];

  const filteredItems = mediaItems.filter((item) => {
    const matchesType = 
      filterType === 'all' ? true :
      filterType === 'favorites' ? item.isFavorite :
      item.type === filterType;

    const matchesGenre = 
      selectedGenre === 'Todos' ? true :
      selectedGenre === 'Lançamentos' ? item.year >= 2025 :
      item.category.toLowerCase().includes(selectedGenre.toLowerCase());

    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.synopsis.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesGenre && matchesSearch;
  });

  const handleOpenDetail = (item: MediaItem) => {
    soundEffects.playSelect();
    setSelectedItem(item);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-radial from-[#092219] via-[#04100b] to-[#020604] p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-emerald-950/70">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundEffects.playClick();
              onBackToHome();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-900/60 rounded-xl text-xs sm:text-sm font-semibold text-emerald-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#00F59B]" />
            Menu
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-display">
              {filterType === 'favorites' ? 'Meus Favoritos' : filterType === 'series' ? 'Catálogo de Séries' : filterType === 'movie' ? 'Catálogo de Filmes' : 'Catálogo Zuxo VOD'}
            </h2>
            <p className="text-xs text-emerald-400 font-medium">
              Milhares de títulos em alta definição com dublagem e legendas
            </p>
          </div>
        </div>

        {/* Type selector tabs */}
        <div className="flex items-center gap-1 bg-[#071711] border border-emerald-950 p-1 rounded-xl">
          <button
            onClick={() => {
              soundEffects.playClick();
              setFilterType('all');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'all' ? 'bg-[#00F59B] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => {
              soundEffects.playClick();
              setFilterType('movie');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              filterType === 'movie' ? 'bg-[#00F59B] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Filmes
          </button>
          <button
            onClick={() => {
              soundEffects.playClick();
              setFilterType('series');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              filterType === 'series' ? 'bg-[#00F59B] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" />
            Séries
          </button>
          <button
            onClick={() => {
              soundEffects.playClick();
              setFilterType('favorites');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              filterType === 'favorites' ? 'bg-[#00F59B] text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            Favoritos
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Genre buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => {
                soundEffects.playClick();
                setSelectedGenre(g);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedGenre === g
                  ? 'bg-emerald-900/80 text-[#00F59B] border border-emerald-500/60'
                  : 'bg-[#0a1e16] text-slate-400 hover:text-white border border-emerald-950'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar filmes, séries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00F59B]"
          />
        </div>
      </div>

      {/* Poster Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => handleOpenDetail(item)}
            className="group relative cursor-pointer bg-[#0a1a14] border border-emerald-950 hover:border-[#00F59B] rounded-2xl p-2 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(0,245,155,0.3)] flex flex-col justify-between"
          >
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 mb-2">
              <img
                src={item.poster}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                {item.year}
              </div>
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEffects.playClick();
                    onToggleFavorite(item.id);
                  }}
                  className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                    item.isFavorite ? 'text-red-500 bg-red-950/80' : 'text-slate-300 bg-black/50 hover:text-white'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-current" />
                {item.rating}
              </div>

              {/* Hover Play Button */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-[#00F59B] text-slate-950 flex items-center justify-center shadow-lg font-bold">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#00F59B] transition-colors">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {item.category}
              </p>
              <div className="flex items-center justify-between text-[10px] text-emerald-400/80 mt-1 font-mono">
                <span>{item.type === 'movie' ? item.duration : `${item.seasons} Temporadas`}</span>
                <span>4K HDR</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="py-24 text-center">
          <p className="text-slate-400 text-sm">Nenhum título encontrado com os filtros selecionados.</p>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-[#091b14] border border-emerald-600/50 rounded-3xl overflow-hidden shadow-2xl">
            {/* Modal Backdrop Banner */}
            <div className="relative h-56 sm:h-64 w-full">
              <img
                src={selectedItem.backdrop}
                alt={selectedItem.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#091b14] via-[#091b14]/50 to-transparent" />
              
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6">
                <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 bg-emerald-950/90 text-[#00F59B] border border-emerald-600/50 rounded-full">
                  {selectedItem.type === 'movie' ? 'Filme' : 'Série Completa'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white font-display mt-2">
                  {selectedItem.title}
                </h3>
              </div>
            </div>

            {/* Modal Body Info */}
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mb-4 pb-3 border-b border-emerald-950">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" /> {selectedItem.rating}
                </span>
                <span>{selectedItem.year}</span>
                <span>{selectedItem.category}</span>
                <span>{selectedItem.duration || `${selectedItem.seasons} Temporadas`}</span>
                <span className="px-2 py-0.5 bg-emerald-950 text-[#00F59B] rounded font-mono font-bold">
                  Ultra HD 4K
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Dublado / Legendado
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                {selectedItem.synopsis}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    soundEffects.playSelect();
                    onPlayMedia(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wide rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  Assistir Agora
                </button>

                <button
                  onClick={() => {
                    soundEffects.playClick();
                    onToggleFavorite(selectedItem.id);
                    setSelectedItem((prev: MediaItem | null) => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
                  }}
                  className={`py-3 px-4 rounded-2xl border transition-colors flex items-center gap-2 text-xs font-bold ${
                    selectedItem.isFavorite
                      ? 'bg-red-950/60 border-red-800 text-red-400'
                      : 'bg-[#0a1e16] border-emerald-900/60 text-slate-200 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${selectedItem.isFavorite ? 'fill-current' : ''}`} />
                  {selectedItem.isFavorite ? 'Salvo' : 'Favoritar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
