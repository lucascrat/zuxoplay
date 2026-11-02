import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, ArrowRight, X, KeyRound, AlertTriangle } from 'lucide-react';
import { soundEffects } from '../utils/audio';

export const ADMIN_MASTER_PASSWORD = '01Deus02@@@@';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setError('Por favor, informe a senha de acesso.');
      return;
    }

    setIsSubmitting(true);

    if (password === ADMIN_MASTER_PASSWORD) {
      setError(null);
      soundEffects.playSelect();
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess();
      }, 250);
    } else {
      soundEffects.playClick();
      setError('Senha incorreta! Verifique as credenciais e tente novamente.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className={`w-full max-w-md bg-[#05150e] border border-emerald-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(0,245,155,0.25)] relative transition-transform ${
          isShaking ? 'translate-x-1 animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={() => {
            soundEffects.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900/60 border border-slate-800 transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* HEADER ICON & TITLE */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#0a271b] border-2 border-[#00F59B] flex items-center justify-center shadow-[0_0_20px_rgba(0,245,155,0.35)] mb-3">
            <Lock className="w-7 h-7 text-[#00F59B]" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
            <KeyRound className="w-3 h-3" /> Acesso Restrito
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-display">
            Painel do Administrador
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Digite a senha mestra para desbloquear o gerenciamento de clientes, telas, valores e catálogo.
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Senha de Acesso</span>
              <span className="text-[10px] text-emerald-400/80 font-mono">01Deus02@@@@</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
              </div>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Digite a senha mestra..."
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 bg-[#0a1f16] border border-emerald-900/80 focus:border-[#00F59B] focus:ring-1 focus:ring-[#00F59B] rounded-2xl text-white text-sm placeholder:text-slate-500 outline-none transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setShowPassword(!showPassword);
                }}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-xs text-red-300 flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 active:scale-[0.99] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,245,155,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Desbloquear Painel Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-950 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar e Voltar
            </button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-emerald-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-500/80">
            <Lock className="w-3 h-3" /> Sessão Protegida
          </span>
          <span className="text-slate-500">Zuxo Player Admin v3.5</span>
        </div>
      </div>
    </div>
  );
};
