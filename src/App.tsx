import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  User, 
  Calendar, 
  Layers, 
  ShieldCheck,
  Smartphone,
  LogOut,
  LogIn,
  Cloud,
  Lock
} from 'lucide-react';
import { ZuxoLogo } from './components/ZuxoLogo';
import { TrailerFeedScreen } from './components/TrailerFeedScreen';
import { CustomerPortal } from './components/CustomerPortal';
import { DailyGuideScreen } from './components/DailyGuideScreen';
import { AdminPanel } from './components/AdminPanel';
import { AuthScreen, AVATAR_PRESETS } from './components/AuthScreen';
import { AdminAuthModal } from './components/AdminAuthModal';
import { 
  INITIAL_TRAILERS, 
  INITIAL_APPS, 
  INITIAL_PROGRAM_GUIDE, 
  INITIAL_PAYMENT_PLANS, 
  INITIAL_INVOICES,
  INITIAL_CLIENTS
} from './data/appData';
import { 
  seedInitialFirestoreData,
  subscribeClients,
  saveClientToFirestore,
  deleteClientFromFirestore,
  subscribeTrailers,
  saveTrailerToFirestore,
  deleteTrailerFromFirestore,
  subscribeApps,
  saveAppToFirestore,
  deleteAppFromFirestore,
  subscribePrograms,
  saveProgramToFirestore,
  deleteProgramFromFirestore,
  subscribeSystemLogs,
  saveSystemLogToFirestore,
  deleteSystemLogFromFirestore
} from './services/firestoreService';
import { 
  subscribeNotifications, 
  sendPushNotification, 
  deleteNotification, 
  markNotificationAsRead, 
  seedInitialNotifications, 
  checkAndSendAutomatedAlerts, 
  INITIAL_NOTIFICATIONS 
} from './services/notificationService';
import { setupFCMForegroundListener } from './services/fcmService';
import { PushNotificationToast } from './components/PushNotificationToast';
import { TrailerItem, ClientApp, ProgramItem, ViewScreen, UserProfile, PushNotification, Invoice, SystemLog } from './types';
import { soundEffects } from './utils/audio';
import { INITIAL_SYSTEM_LOGS } from './data/appData';
import { syncDailyProgramGuide, startEpgAutoTicker } from './services/epgService';

const DEFAULT_USER: UserProfile = INITIAL_CLIENTS[0];

export default function App() {
  // Main default screen is the 9:16 mobile trailers feed
  const [activeScreen, setActiveScreen] = useState<ViewScreen>('trailer-feed');

  // REGISTERED CLIENTS STATE (Managed by admin with real apps, screens, prices)
  const [clients, setClients] = useState<UserProfile[]>(() => {
    try {
      const isRealDataV2 = localStorage.getItem('zuxo_real_data_v2') === 'true';
      const saved = localStorage.getItem('zuxo_clients');
      if (saved && isRealDataV2) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].expirationDate !== '15/05/2026') {
          return parsed;
        }
      }
    } catch {}
    try {
      localStorage.setItem('zuxo_real_data_v2', 'true');
    } catch {}
    return INITIAL_CLIENTS;
  });

  // USER AUTH STATE (Lucas Sousa / lrsousadesenvolvedor@gmail.com)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const isRealDataV2 = localStorage.getItem('zuxo_real_data_v2') === 'true';
      const saved = localStorage.getItem('zuxo_current_user');
      if (saved && isRealDataV2) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.expirationDate !== '15/05/2026') {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_CLIENTS[0];
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // ADMIN AUTHENTICATION STATE (Protected by password 01Deus02@@@@)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('zuxo_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState<boolean>(false);

  // TRAILERS STATE (with localStorage)
  const [trailers, setTrailers] = useState<TrailerItem[]>(() => {
    try {
      const saved = localStorage.getItem('zuxo_trailers');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_TRAILERS;
  });

  // CLIENT APPS STATE (global catalog registered by admin with localStorage)
  const [apps, setApps] = useState<ClientApp[]>(() => {
    try {
      const saved = localStorage.getItem('zuxo_client_apps');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_APPS;
  });

  // DAILY GUIDE PROGRAMS STATE (with localStorage)
  const [programs, setPrograms] = useState<ProgramItem[]>(() => {
    try {
      const saved = localStorage.getItem('zuxo_program_guide');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PROGRAM_GUIDE;
  });

  // PUSH NOTIFICATIONS (FCM) STATE
  const [notifications, setNotifications] = useState<PushNotification[]>(() => {
    try {
      const saved = localStorage.getItem('zuxo_notifications');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_NOTIFICATIONS;
  });

  // INVOICES STATE (Real Invoices with PIX Key)
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const isRealDataV2 = localStorage.getItem('zuxo_real_data_v2') === 'true';
      const saved = localStorage.getItem('zuxo_invoices');
      if (saved && isRealDataV2) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].dueDate !== '15/05/2026') {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_INVOICES;
  });

  // SYSTEM AUDIT & CRITICAL ACTIVITY LOGS STATE
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>(() => {
    try {
      const saved = localStorage.getItem('zuxo_system_logs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SYSTEM_LOGS;
  });

  const [latestPushToast, setLatestPushToast] = useState<PushNotification | null>(null);
  const [isEpgSyncing, setIsEpgSyncing] = useState<boolean>(false);

  // REAL-TIME FIRESTORE SYNC, INITIAL SEEDING & DAILY EPG AUTO-SYNC
  useEffect(() => {
    // 1. Initial cloud seeding if collections are empty
    seedInitialFirestoreData().catch(console.warn);
    seedInitialNotifications().catch(console.warn);

    // 2. Real-time Firestore snapshot subscriptions
    const unsubClients = subscribeClients((remoteClients) => {
      if (remoteClients && remoteClients.length > 0) {
        setClients(remoteClients);
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const updated = remoteClients.find((c) => c.id === prev.id);
          return updated || prev;
        });
      }
    });

    const unsubTrailers = subscribeTrailers((remoteTrailers) => {
      if (remoteTrailers && remoteTrailers.length > 0) {
        setTrailers(remoteTrailers);
      }
    });

    const unsubApps = subscribeApps((remoteApps) => {
      if (remoteApps && remoteApps.length > 0) {
        setApps(remoteApps);
      }
    });

    const unsubPrograms = subscribePrograms((remoteProgs) => {
      if (remoteProgs && remoteProgs.length > 0) {
        setPrograms(remoteProgs);
      }
    });

    const unsubNotifs = subscribeNotifications((remoteNotifs) => {
      if (remoteNotifs && remoteNotifs.length > 0) {
        setNotifications(remoteNotifs);
      }
    });

    const unsubLogs = subscribeSystemLogs((remoteLogs) => {
      if (remoteLogs && remoteLogs.length > 0) {
        setSystemLogs(remoteLogs);
      }
    });

    // 3. Foreground FCM push listener
    const unsubFCM = setupFCMForegroundListener((payload) => {
      const incomingNotif: PushNotification = {
        id: `fcm-inbound-${Date.now()}`,
        clientId: payload.data?.clientId || 'all',
        clientName: payload.data?.clientName || 'Cliente Zuxo',
        title: payload.title,
        body: payload.body,
        type: (payload.data?.type as any) || 'custom',
        status: 'delivered',
        read: false,
        createdAt: new Date().toISOString(),
        dueDate: payload.data?.dueDate,
        invoiceAmount: payload.data?.invoiceAmount ? parseFloat(payload.data.invoiceAmount) : undefined,
        deliveryChannel: 'fcm',
      };
      setLatestPushToast(incomingNotif);
    });

    // 4. Automated check for invoices and upcoming expirations
    const autoScanTimer = setTimeout(() => {
      if (clients.length > 0) {
        checkAndSendAutomatedAlerts(clients, notifications, currentUser?.id).catch(console.warn);
      }
    }, 2500);

    // 5. Automatic Daily EPG Program Guide Synchronization & Live Progress Ticker
    syncDailyProgramGuide().then((fresh) => {
      if (fresh && fresh.length > 0) {
        setPrograms(fresh);
      }
    }).catch(console.warn);

    const unsubEpgTicker = startEpgAutoTicker((refreshed) => {
      setPrograms(refreshed);
    }, () => programs);

    return () => {
      unsubClients();
      unsubTrailers();
      unsubApps();
      unsubPrograms();
      unsubNotifs();
      unsubLogs();
      unsubFCM();
      unsubEpgTicker();
      clearTimeout(autoScanTimer);
    };
  }, []);

  // Sync states to local backup
  useEffect(() => {
    try {
      localStorage.setItem('zuxo_clients', JSON.stringify(clients));
    } catch {}
  }, [clients]);

  useEffect(() => {
    try {
      localStorage.setItem('zuxo_system_logs', JSON.stringify(systemLogs));
    } catch {}
  }, [systemLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('zuxo_current_user', JSON.stringify(currentUser));
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('zuxo_trailers', JSON.stringify(trailers));
    } catch {}
  }, [trailers]);

  useEffect(() => {
    try {
      localStorage.setItem('zuxo_client_apps', JSON.stringify(apps));
    } catch {}
  }, [apps]);

  useEffect(() => {
    try {
      localStorage.setItem('zuxo_invoices', JSON.stringify(invoices));
    } catch {}
  }, [invoices]);

  const handleUpdateInvoices = (updatedInvoices: Invoice[]) => {
    setInvoices(updatedInvoices);
  };

  // Auth Handlers
  const handleOpenLogin = () => {
    soundEffects.playClick();
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    soundEffects.playClick();
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  const handleSuccessAuth = (user: UserProfile) => {
    const existingIndex = clients.findIndex(
      (c) => c.email.toLowerCase() === user.email.toLowerCase() || c.id === user.id
    );

    if (existingIndex >= 0) {
      const existingClient = clients[existingIndex];
      setCurrentUser(existingClient);
    } else {
      const newClientWithApps: UserProfile = {
        ...user,
        customApps: user.customApps && user.customApps.length > 0 ? user.customApps : apps,
        screens: user.screens || 1,
        customPrice: user.customPrice || 35.00,
      };
      setClients([newClientWithApps, ...clients]);
      setCurrentUser(newClientWithApps);
      saveClientToFirestore(newClientWithApps).catch(console.error);
    }

    setIsAuthModalOpen(false);
    setActiveScreen('customer-portal');
  };

  const handleLogout = () => {
    soundEffects.playClick();
    setCurrentUser(null);
    localStorage.removeItem('zuxo_current_user');
    setActiveScreen('trailer-feed');
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    setClients(clients.map((c) => (c.id === updatedUser.id ? updatedUser : c)));
    saveClientToFirestore(updatedUser).catch(console.error);
  };

  // CLIENT MANAGEMENT HANDLERS (ADMIN)
  const handleAddClient = (newClient: UserProfile) => {
    setClients([newClient, ...clients]);
    saveClientToFirestore(newClient).catch(console.error);
  };

  const handleUpdateClient = (updatedClient: UserProfile) => {
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    if (currentUser?.id === updatedClient.id) {
      setCurrentUser(updatedClient);
    }
    saveClientToFirestore(updatedClient).catch(console.error);
  };

  const handleDeleteClient = (id: string) => {
    setClients(clients.filter((c) => c.id !== id));
    if (currentUser?.id === id) {
      setCurrentUser(null);
    }
    deleteClientFromFirestore(id).catch(console.error);
  };

  const handleSwitchToClient = (client: UserProfile) => {
    setCurrentUser(client);
    setActiveScreen('customer-portal');
  };

  const handleAccessCustomerPortal = () => {
    soundEffects.playSelect();
    if (!currentUser) {
      handleOpenLogin();
    } else {
      setActiveScreen('customer-portal');
    }
  };

  // ADMIN PANEL ACCESS (Password Protected: 01Deus02@@@@)
  const handleAccessAdminPanel = () => {
    soundEffects.playClick();
    if (isAdminAuthenticated) {
      setActiveScreen('admin-panel');
    } else {
      setIsAdminAuthModalOpen(true);
    }
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    try {
      sessionStorage.setItem('zuxo_admin_auth', 'true');
    } catch {}
    setIsAdminAuthModalOpen(false);
    setActiveScreen('admin-panel');
  };

  const handleLockAdmin = () => {
    soundEffects.playClick();
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('zuxo_admin_auth');
    } catch {}
    setActiveScreen('trailer-feed');
  };

  // Trailers Admin Handlers
  const handleAddTrailer = (newT: Omit<TrailerItem, 'id' | 'likes' | 'shares' | 'views'>) => {
    const item: TrailerItem = {
      ...newT,
      id: `tr-${Date.now()}`,
      likes: Math.floor(1200 + Math.random() * 8000),
      shares: Math.floor(300 + Math.random() * 2000),
      views: Math.floor(15000 + Math.random() * 50000),
      isLiked: false,
    };
    setTrailers([item, ...trailers]);
    saveTrailerToFirestore(item).catch(console.error);
  };

  const handleUpdateTrailer = (updated: TrailerItem) => {
    setTrailers(trailers.map((t) => (t.id === updated.id ? updated : t)));
    saveTrailerToFirestore(updated).catch(console.error);
  };

  const handleDeleteTrailer = (id: string) => {
    setTrailers(trailers.filter((t) => t.id !== id));
    deleteTrailerFromFirestore(id).catch(console.error);
  };

  const handleLikeTrailer = (id: string) => {
    const target = trailers.find((t) => t.id === id);
    if (!target) return;
    const updated = {
      ...target,
      isLiked: !target.isLiked,
      likes: target.isLiked ? target.likes - 1 : target.likes + 1,
    };
    setTrailers(trailers.map((t) => (t.id === id ? updated : t)));
    saveTrailerToFirestore(updated).catch(console.error);
  };

  // Apps Admin Handlers
  const handleAddApp = (newApp: Omit<ClientApp, 'id'>) => {
    const item: ClientApp = {
      ...newApp,
      id: `app-${Date.now()}`,
    };
    setApps([...apps, item]);
    saveAppToFirestore(item).catch(console.error);
  };

  const handleUpdateApp = (updated: ClientApp) => {
    setApps(apps.map((a) => (a.id === updated.id ? updated : a)));
    saveAppToFirestore(updated).catch(console.error);
  };

  const handleDeleteApp = (id: string) => {
    setApps(apps.filter((a) => a.id !== id));
    deleteAppFromFirestore(id).catch(console.error);
  };

  // Program Guide Admin Handlers
  const handleAddProgram = (newProg: Omit<ProgramItem, 'id'>) => {
    const item: ProgramItem = {
      ...newProg,
      id: `prog-${Date.now()}`,
    };
    setPrograms([item, ...programs]);
    saveProgramToFirestore(item).catch(console.error);
  };

  const handleDeleteProgram = (id: string) => {
    setPrograms(programs.filter((p) => p.id !== id));
    deleteProgramFromFirestore(id).catch(console.error);
  };

  // SYSTEM LOG HANDLERS
  const handleAddSystemLog = (logData: Omit<SystemLog, 'id' | 'timestamp'>) => {
    const newLog: SystemLog = {
      ...logData,
      id: `log-sys-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      adminUser: logData.adminUser || 'Administrador (Mestre)',
    };
    setSystemLogs((prev) => [newLog, ...prev]);
    saveSystemLogToFirestore(newLog).catch(console.error);
  };

  const handleDeleteSystemLog = (id: string) => {
    setSystemLogs((prev) => prev.filter((l) => l.id !== id));
    deleteSystemLogFromFirestore(id).catch(console.error);
  };

  const handleResetDefaults = () => {
    soundEffects.playSelect();
    setTrailers(INITIAL_TRAILERS);
    setApps(INITIAL_APPS);
    setPrograms(INITIAL_PROGRAM_GUIDE);
    setClients(INITIAL_CLIENTS);
    setCurrentUser(INITIAL_CLIENTS[0]);
    setSystemLogs(INITIAL_SYSTEM_LOGS);
    localStorage.removeItem('zuxo_trailers');
    localStorage.removeItem('zuxo_client_apps');
    localStorage.removeItem('zuxo_program_guide');
    localStorage.removeItem('zuxo_clients');
    localStorage.removeItem('zuxo_system_logs');
    handleAddSystemLog({
      action: 'system_reset',
      severity: 'warning',
      title: 'Restauração de Dados Padrão',
      description: 'O sistema foi restaurado para os dados originais de fábrica pelo administrador.',
      details: { reason: 'Reset manual via painel' }
    });
    localStorage.removeItem('zuxo_current_user');
  };

  const handleRefreshDailyGuide = async () => {
    setIsEpgSyncing(true);
    try {
      const fresh = await syncDailyProgramGuide(true);
      setPrograms(fresh);
      handleAddSystemLog({
        action: 'system_reset',
        severity: 'info',
        title: 'Sincronização da Grade EPG',
        description: `Grade diária sincronizada com sucesso (${fresh.length} programas 4K atualizados).`,
        details: { 
          reason: 'Atualização solicitada na Grade de Programação',
          meta: { totalPrograms: fresh.length }
        }
      });
    } finally {
      setIsEpgSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030907] text-white flex flex-col selection:bg-[#00F59B] selection:text-slate-950 font-sans">
      {/* 
        TOP BAR CONTRACT:
        Zone 1: Single text element Brand wordmark
        Zone 2: 4-5 concise single-line nav links
        Zone 3: 1 primary action button (Customer / Login)
      */}
      <header className="h-16 shrink-0 bg-[#061610]/95 backdrop-blur-md border-b border-emerald-950/80 px-4 sm:px-6 flex items-center justify-between gap-8 z-40 sticky top-0">
        
        {/* Zone 1: Brand wordmark */}
        <a 
          href="#feed" 
          onClick={(e) => {
            e.preventDefault();
            soundEffects.playClick();
            setActiveScreen('trailer-feed');
          }}
          className="text-2xl font-black tracking-tight text-white font-display whitespace-nowrap shrink-0 flex items-center gap-1 hover:opacity-90 transition-opacity"
        >
          <span>Zux</span><span className="text-[#00F59B] glow-text">o</span>
          <span className="text-[10px] tracking-[0.25em] uppercase text-emerald-400 font-bold ml-1 px-1.5 py-0.5 bg-emerald-950 rounded border border-emerald-800/40">PLAYER</span>
        </a>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveScreen('trailer-feed');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white flex items-center gap-1.5 ${
              activeScreen === 'trailer-feed' ? 'text-[#00F59B]' : 'text-slate-300'
            }`}
          >
            <Flame className="w-4 h-4 text-[#00F59B]" />
            Feed de Trailers
          </button>

          <button
            onClick={handleAccessCustomerPortal}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white flex items-center gap-1.5 ${
              activeScreen === 'customer-portal' ? 'text-[#00F59B]' : 'text-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            Área do Cliente
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveScreen('daily-guide');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white flex items-center gap-1.5 ${
              activeScreen === 'daily-guide' ? 'text-[#00F59B]' : 'text-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Grade do Dia
          </button>

          <button
            onClick={handleAccessAdminPanel}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-white flex items-center gap-1.5 ${
              activeScreen === 'admin-panel' ? 'text-[#00F59B]' : 'text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Painel Admin</span>
            <Lock className="w-3 h-3 text-emerald-400/80 ml-0.5" />
          </button>
        </nav>

        {/* Zone 3: Primary Action / User Profile Avatar button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#05170f] border border-emerald-800/50 rounded-full text-[11px] text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#00F59B] animate-pulse"></span>
            <span className="hidden xl:inline">Firebase</span> Firestore Conectado
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAccessCustomerPortal}
                className="flex items-center gap-2 py-1 px-2.5 bg-[#0a2016] hover:bg-[#0e2e21] border border-emerald-600/50 rounded-full transition-all group"
                title="Acessar sua Área do Cliente"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-[#00F59B] shadow-sm flex-shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs font-bold text-white max-w-[100px] truncate hidden sm:inline">
                  {currentUser.name.split(' ')[0]}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenLogin}
                className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Entrar
              </button>

              <button
                onClick={handleOpenRegister}
                className="px-3.5 py-1.5 text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 rounded-xl shadow-[0_0_15px_rgba(0,245,155,0.3)] transition-all whitespace-nowrap"
              >
                Cadastrar-se
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MAIN VIEWPORT ROUTER */}
      <main className="flex-1 flex flex-col w-full relative">
        {/* TELA PRINCIPAL: FEED DE TRAILERS 9:16 */}
        {activeScreen === 'trailer-feed' && (
          <TrailerFeedScreen
            trailers={trailers}
            onOpenCustomerPortal={handleAccessCustomerPortal}
            onOpenDailyGuide={() => setActiveScreen('daily-guide')}
            onOpenAdminPanel={handleAccessAdminPanel}
            onLikeTrailer={handleLikeTrailer}
          />
        )}

        {/* ÁREA DO CLIENTE: COM FOTO DE PERFIL, APPS E PAGAMENTOS */}
        {activeScreen === 'customer-portal' && (
          currentUser ? (
            <CustomerPortal
              currentUser={currentUser}
              apps={apps}
              paymentPlans={INITIAL_PAYMENT_PLANS}
              invoices={invoices}
              programs={programs}
              notifications={notifications}
              onUpdateUser={handleUpdateUser}
              onUpdateInvoices={handleUpdateInvoices}
              onLogout={handleLogout}
              onBackToFeed={() => setActiveScreen('trailer-feed')}
              onOpenDailyGuide={() => setActiveScreen('daily-guide')}
              onOpenAdminPanel={handleAccessAdminPanel}
              onMarkNotificationAsRead={(id) => markNotificationAsRead(id).catch(console.warn)}
              onDeleteNotification={(id) => deleteNotification(id).catch(console.warn)}
            />
          ) : (
            <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-8 text-center bg-[#030907]">
              <ZuxoLogo size="lg" subtitle="ÁREA DO CLIENTE" />
              <h2 className="text-xl font-bold text-white mt-4 mb-2">Faça login para acessar seus aplicativos</h2>
              <p className="text-xs text-slate-400 mb-6 max-w-sm">
                Entre na sua conta ou cadastre-se para ver os downloads do Zuxo Player e gerenciar sua assinatura.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleOpenLogin}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 font-bold rounded-xl text-xs uppercase shadow-lg"
                >
                  Entrar na Minha Conta
                </button>
                <button
                  onClick={handleOpenRegister}
                  className="px-5 py-2.5 bg-[#0a1e16] border border-emerald-600/40 text-emerald-300 font-bold rounded-xl text-xs"
                >
                  Cadastrar Novo Cliente
                </button>
              </div>
            </div>
          )
        )}

        {/* GRADE DE PROGRAMAÇÃO DO DIA (COM ATUALIZAÇÃO AUTOMÁTICA EM TEMPO REAL) */}
        {activeScreen === 'daily-guide' && (
          <DailyGuideScreen
            programs={programs}
            onBackToFeed={() => setActiveScreen('trailer-feed')}
            onOpenCustomerPortal={handleAccessCustomerPortal}
            onRefreshDailyGuide={handleRefreshDailyGuide}
            isSyncing={isEpgSyncing}
          />
        )}

        {/* PAINEL ADMIN: GERENCIAMENTO DE CLIENTES, TRAILERS, APPS E GRADE (PROTEGIDO POR SENHA) */}
        {activeScreen === 'admin-panel' && (
          isAdminAuthenticated ? (
            <AdminPanel
              clients={clients}
              trailers={trailers}
              apps={apps}
              programs={programs}
              notifications={notifications}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onSwitchToClient={handleSwitchToClient}
              onAddTrailer={handleAddTrailer}
              onUpdateTrailer={handleUpdateTrailer}
              onDeleteTrailer={handleDeleteTrailer}
              onAddApp={handleAddApp}
              onUpdateApp={handleUpdateApp}
              onDeleteApp={handleDeleteApp}
              onAddProgram={handleAddProgram}
              onDeleteProgram={handleDeleteProgram}
              onResetDefaults={handleResetDefaults}
              onBackToFeed={() => setActiveScreen('trailer-feed')}
              onLockAdmin={handleLockAdmin}
              onSendNotification={sendPushNotification}
              onDeleteNotification={deleteNotification}
              systemLogs={systemLogs}
              onAddSystemLog={handleAddSystemLog}
              onDeleteSystemLog={handleDeleteSystemLog}
            />
          ) : (
            <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-8 text-center bg-[#030907]">
              <div className="w-16 h-16 rounded-3xl bg-[#0a271b] border-2 border-[#00F59B] flex items-center justify-center shadow-[0_0_35px_rgba(0,245,155,0.35)] mb-4 animate-pulse">
                <Lock className="w-8 h-8 text-[#00F59B]" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-3">
                <Lock className="w-3.5 h-3.5" /> Acesso Protegido
              </div>
              <h2 className="text-2xl font-black text-white font-display mb-2">Painel Administrativo Bloqueado</h2>
              <p className="text-xs text-slate-400 mb-6 max-w-sm">
                Esta área é exclusiva para administradores. Digite a senha mestra para gerenciar clientes, valores, telas e catálogo.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsAdminAuthModalOpen(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 font-black rounded-xl text-xs uppercase shadow-[0_0_20px_rgba(0,245,155,0.3)] hover:brightness-110 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Digitar Senha do Admin
                </button>
                <button
                  onClick={() => setActiveScreen('trailer-feed')}
                  className="px-5 py-2.5 bg-[#0a1e16] border border-emerald-900 hover:bg-[#0e2c20] text-slate-300 font-bold rounded-xl text-xs hover:text-white transition-colors"
                >
                  Voltar ao Feed
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* LOGIN & CADASTRO MODAL */}
      <AuthScreen
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        registeredClients={clients}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccessAuth={handleSuccessAuth}
      />

      {/* ADMIN AUTH MODAL (PROTEÇÃO COM SENHA 01Deus02@@@@) */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* PUSH NOTIFICATION LIVE TOAST (FIREBASE CLOUD MESSAGING) */}
      <PushNotificationToast
        notification={latestPushToast}
        onClose={() => setLatestPushToast(null)}
        onActionClick={(notif) => {
          if (notif.type === 'new_invoice' || notif.type === 'expiration_warning' || notif.type === 'plan_expired') {
            setActiveScreen('customer-portal');
          }
        }}
      />
    </div>
  );
}
