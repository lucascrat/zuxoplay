import React, { useState, useRef } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Camera, 
  Upload, 
  Check, 
  Sparkles, 
  ArrowLeft, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ZuxoLogo } from './ZuxoLogo';
import { UserProfile } from '../types';
import { soundEffects } from '../utils/audio';

interface AuthScreenProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  registeredClients?: UserProfile[];
  onClose: () => void;
  onSuccessAuth: (user: UserProfile) => void;
}

// Curated avatar presets with high-quality styled avatars
export const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=300&auto=format&fit=crop',
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  isOpen,
  initialMode = 'login',
  registeredClients = [],
  onClose,
  onSuccessAuth,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState<string>('lrsousadesenvolvedor@gmail.com');
  const [loginPassword, setLoginPassword] = useState<string>('zuxo2026pass');

  // Register fields
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regAvatar, setRegAvatar] = useState<string>(AVATAR_PRESETS[0]);
  const [selectedPlanName, setSelectedPlanName] = useState<string>('Plano Mensal Zuxo (R$ 35/mês)');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local image file upload for profile avatar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('A imagem deve ter no máximo 5MB.');
        return;
      }
      setErrorMessage(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        soundEffects.playSelect();
        setRegAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Por favor, informe e-mail e senha.');
      return;
    }

    soundEffects.playSelect();

    // Check if client exists in registeredClients
    const matched = registeredClients.find(
      (c) => c.email.toLowerCase() === loginEmail.trim().toLowerCase()
    );

    if (matched) {
      onSuccessAuth(matched);
      return;
    }

    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 30);
    const day = String(expDate.getDate()).padStart(2, '0');
    const month = String(expDate.getMonth() + 1).padStart(2, '0');
    const year = expDate.getFullYear();
    const formattedExp = `${day}/${month}/${year}`;

    // Otherwise create session with defaults
    const authenticatedUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: loginEmail.includes('lucas') ? 'Lucas Sousa' : loginEmail.split('@')[0],
      email: loginEmail,
      whatsapp: '(11) 98849-2026',
      avatar: regAvatar || AVATAR_PRESETS[0],
      plan: 'Plano VIP 2 Telas',
      expirationDate: formattedExp,
      screens: 2,
      customPrice: 35.00,
      customApps: [],
      status: 'ativo',
      provider: 'http://dns.zuxoplayer.live:8080',
      username: loginEmail.split('@')[0],
      password: 'zuxo2026pass',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onSuccessAuth(authenticatedUser);
  };

  // Register submission
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Preencha todos os campos obrigatórios.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    soundEffects.playSelect();

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: regName,
      email: regEmail,
      whatsapp: regPhone || '(11) 98765-4321',
      avatar: regAvatar || AVATAR_PRESETS[0],
      plan: selectedPlanName,
      expirationDate: '11/11/2026',
      screens: selectedPlanName.includes('VIP') ? 3 : 2,
      customPrice: selectedPlanName.includes('VIP') ? 55.00 : 35.00,
      customApps: [],
      status: 'ativo',
      createdAt: new Date().toISOString().split('T')[0],
    };

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00F59B', '#10E58F', '#047857', '#FFFFFF']
    });

    onSuccessAuth(newUser);
  };

  const handleQuickSelectClient = (client: UserProfile) => {
    soundEffects.playClick();
    setLoginEmail(client.email);
    setLoginPassword('zuxo2026pass');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#0c291f] via-[#071c14] to-[#04100b] border border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,245,155,0.25)] text-white my-auto">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-emerald-900/60 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-block mb-1">
            <ZuxoLogo size="md" subtitle="ÁREA DO CLIENTE" />
          </div>
          <p className="text-xs text-slate-300">
            {mode === 'login' ? 'Entre na sua conta para ver seus apps e pagamentos' : 'Crie sua conta para acessar seus aplicativos'}
          </p>
        </div>

        {/* Tab switcher: Login vs Cadastro */}
        <div className="flex bg-[#05140e] border border-emerald-950 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar (Login)
          </button>

          <button
            type="button"
            onClick={() => {
              soundEffects.playClick();
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cadastrar-se
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================= */}
        {/* LOGIN FORM                                */}
        {/* ========================================= */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                E-mail ou WhatsApp:
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="seu.email@gmail.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-[#00F59B]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">Senha de Acesso:</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-slate-500 outline-none focus:border-[#00F59B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-[#00F59B] rounded" />
                Lembrar meu acesso
              </label>
              <span className="text-slate-400">Suporte 24h</span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 mt-2"
            >
              Entrar na Área do Cliente
            </button>

            {/* QUICK CLIENT SELECTION PILLS (SHOWS REGISTERED CLIENTS) */}
            {registeredClients.length > 0 && (
              <div className="pt-3 border-t border-emerald-950/80">
                <span className="block text-[10px] text-slate-400 mb-2 font-semibold">
                  Ou selecione uma conta de cliente cadastrada para testar:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {registeredClients.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleQuickSelectClient(c)}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        loginEmail.toLowerCase() === c.email.toLowerCase()
                          ? 'bg-[#00F59B]/15 border-[#00F59B] text-white'
                          : 'bg-[#071912] border-emerald-900/50 hover:border-emerald-700 text-slate-300'
                      }`}
                    >
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="w-7 h-7 rounded-full object-cover border border-[#00F59B] flex-shrink-0"
                      />
                      <div className="overflow-hidden text-[10px]">
                        <p className="font-bold truncate text-white">{c.name.split(' ')[0]}</p>
                        <p className="text-[9px] text-[#00F59B] truncate">{c.screens}t · R${c.customPrice}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {/* ========================================= */}
        {/* CADASTRO FORM (COM FOTO DE PERFIL)       */}
        {/* ========================================= */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
            
            {/* FOTO DE PERFIL / AVATAR UPLOAD SECTION */}
            <div className="bg-[#05140e] border border-emerald-900/60 p-3.5 rounded-2xl">
              <span className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                Foto de Perfil do Cliente:
              </span>

              <div className="flex items-center gap-3.5">
                {/* Avatar Preview */}
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#00F59B] shadow-[0_0_15px_rgba(0,245,155,0.4)] flex-shrink-0 bg-slate-900 group">
                  <img
                    src={regAvatar}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Carregar foto"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <Camera className="w-5 h-5 text-[#00F59B]" />
                  </button>
                </div>

                {/* Upload action & preset options */}
                <div className="flex-1 space-y-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5 px-3 bg-[#0a2318] hover:bg-[#0f3424] border border-emerald-600/50 rounded-xl text-xs font-semibold text-[#00F59B] flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Escolher Foto do Aparelho
                  </button>
                  <p className="text-[10px] text-slate-400">
                    JPG, PNG ou WebP até 5MB
                  </p>
                </div>
              </div>

              {/* Gallery of avatar presets */}
              <div className="mt-3 pt-2.5 border-t border-emerald-950">
                <span className="text-[10px] text-slate-400 block mb-1.5">
                  Ou escolha um avatar pré-definido:
                </span>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        soundEffects.playClick();
                        setRegAvatar(preset);
                      }}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 flex-shrink-0 transition-transform ${
                        regAvatar === preset
                          ? 'border-[#00F59B] scale-110 shadow-[0_0_10px_rgba(0,245,155,0.5)]'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Nome Completo */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Nome Completo *:
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Lucas Sousa"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 outline-none focus:border-[#00F59B]"
                />
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                E-mail de Acesso *:
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 outline-none focus:border-[#00F59B]"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                WhatsApp com DDD (para suporte e dados):
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  placeholder="(11) 98849-2026"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 outline-none focus:border-[#00F59B]"
                />
              </div>
            </div>

            {/* Senha e Confirmação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Senha *:</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 dígitos"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl pl-8 pr-3 py-2 text-white outline-none focus:border-[#00F59B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirmar Senha *:</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl pl-8 pr-3 py-2 text-white outline-none focus:border-[#00F59B]"
                  />
                </div>
              </div>
            </div>

            {/* Plano de entrada */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Plano Desejado:</label>
              <select
                value={selectedPlanName}
                onChange={(e) => setSelectedPlanName(e.target.value)}
                className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
              >
                <option value="Plano Mensal Zuxo (R$ 35/mês)">Plano Mensal Zuxo (R$ 35/mês - 1 Tela)</option>
                <option value="Plano Trimestral VIP (R$ 89,90 - 2 Telas)">Plano Trimestral VIP (R$ 89,90 - 2 Telas)</option>
                <option value="Plano Anual VIP Premium (R$ 249,90 - 3 Telas)">Plano Anual VIP Premium (R$ 249,90 - 3 Telas)</option>
                <option value="Teste Grátis 24 Horas">Teste Grátis 24 Horas (Liberação Imediata)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 mt-2"
            >
              Criar Minha Conta Zuxo
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
