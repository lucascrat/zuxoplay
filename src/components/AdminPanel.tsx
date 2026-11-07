import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Smartphone, 
  Video, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  ArrowLeft, 
  Tv, 
  Box, 
  Monitor, 
  DollarSign, 
  Layers, 
  CheckCircle2, 
  RotateCcw, 
  Eye, 
  FileText, 
  ShieldCheck,
  Sparkles,
  Search,
  Lock,
  BarChart3,
  TrendingUp,
  Bell,
  Send,
  Radio,
  Zap,
  Megaphone,
  CreditCard,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  Link as LinkIcon,
  Key,
  Copy,
  ShieldAlert,
  MessageSquare,
  Server,
  RefreshCcw,
  Ban,
  CheckCircle,
  PlusCircle,
  Timer
} from 'lucide-react';
import { TrailerItem, ClientApp, ProgramItem, UserProfile, PushNotification, NotificationType, SystemLog } from '../types';
import { soundEffects } from '../utils/audio';
import { RevenueBarChart } from './RevenueBarChart';
import { SystemLogsTab } from './SystemLogsTab';
import { 
  checkAndSendAutomatedAlerts, 
  sendPushNotification, 
  deleteNotification, 
  calculateDaysRemaining,
  addDaysToDateString,
  AutomatedAlertResult,
  INITIAL_NOTIFICATIONS
} from '../services/notificationService';
import { INITIAL_SYSTEM_LOGS } from '../data/appData';
import { displaySystemPushNotification } from '../services/fcmService';
import { getEfiGatewayConfig, EfiGatewayConfig, EFIBANK_OFFICIAL_PIX_KEY } from '../services/efiBankService';

interface AdminPanelProps {
  clients: UserProfile[];
  trailers: TrailerItem[];
  apps: ClientApp[];
  programs: ProgramItem[];
  notifications?: PushNotification[];
  systemLogs?: SystemLog[];
  onAddClient: (newClient: UserProfile) => void;
  onUpdateClient: (updatedClient: UserProfile) => void;
  onDeleteClient: (id: string) => void;
  onSwitchToClient: (client: UserProfile) => void;
  onAddTrailer: (newTrailer: Omit<TrailerItem, 'id' | 'likes' | 'shares' | 'views'>) => void;
  onUpdateTrailer: (updated: TrailerItem) => void;
  onDeleteTrailer: (id: string) => void;
  onAddApp: (newApp: Omit<ClientApp, 'id'>) => void;
  onUpdateApp: (updated: ClientApp) => void;
  onDeleteApp: (id: string) => void;
  onAddProgram: (newProg: Omit<ProgramItem, 'id'>) => void;
  onDeleteProgram: (id: string) => void;
  onResetDefaults: () => void;
  onBackToFeed: () => void;
  onLockAdmin?: () => void;
  onSendNotification?: (notif: Omit<PushNotification, 'id'>) => Promise<PushNotification>;
  onDeleteNotification?: (id: string) => Promise<void>;
  onAddSystemLog?: (log: Omit<SystemLog, 'id' | 'timestamp'>) => void;
  onDeleteSystemLog?: (id: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  clients,
  trailers,
  apps,
  programs,
  notifications: notificationsProp,
  systemLogs: systemLogsProp,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onSwitchToClient,
  onAddTrailer,
  onUpdateTrailer,
  onDeleteTrailer,
  onAddApp,
  onUpdateApp,
  onDeleteApp,
  onAddProgram,
  onDeleteProgram,
  onResetDefaults,
  onBackToFeed,
  onLockAdmin,
  onSendNotification,
  onDeleteNotification,
  onAddSystemLog,
  onDeleteSystemLog,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'clients' | 'revenue' | 'notifications' | 'logs' | 'apps' | 'trailers' | 'guide' | 'gateway' | 'whatsapp' | 'wmanage'>('clients');
  const [showChartInClientsTab, setShowChartInClientsTab] = useState<boolean>(true);

  // EFÍ BANK GATEWAY CONFIG & TESTING STATE
  const [efiGatewayInfo, setEfiGatewayInfo] = useState<EfiGatewayConfig | null>(null);
  const [isCheckingEfiConfig, setIsCheckingEfiConfig] = useState<boolean>(false);
  const [efiTestStatus, setEfiTestStatus] = useState<string>('');
  const [testPixAmount, setTestPixAmount] = useState<string>('35.00');
  const [generatedTestCharge, setGeneratedTestCharge] = useState<any>(null);

  useEffect(() => {
    getEfiGatewayConfig().then(setEfiGatewayInfo).catch(console.warn);
  }, []);

  // WHATSAPP RECEIPT ALERTS
  interface WaAlert { id: string; clientPhone: string; clientName: string; aiAnalysis: string; createdAt: string; read: boolean; }
  const [waAlerts, setWaAlerts] = useState<WaAlert[]>([]);
  const [waDismissing, setWaDismissing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchWaAlerts = async () => {
      try {
        const r = await fetch('/api/whatsapp/alerts');
        if (r.ok) { const d = await r.json(); setWaAlerts(d.alerts || []); }
      } catch { /* silencioso */ }
    };
    fetchWaAlerts();
    const iv = setInterval(fetchWaAlerts, 30000);
    return () => clearInterval(iv);
  }, []);

  const dismissWaAlert = async (id: string) => {
    setWaDismissing((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/whatsapp/alerts/${id}/read`, { method: 'POST' });
      setWaAlerts((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setWaDismissing((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  // WMANAGE STATE
  interface WzClient {
    id: number; username: string; password: string; status: number; is_trial: number;
    exp_date: string; whatsapp: string; notes: string; planId: number;
    plan?: { name: string }; createdAt: string;
  }
  interface WzList { items: WzClient[]; total: number; actualPage: number; pagesQuantity: number; }
  const [wzClients, setWzClients] = useState<WzList | null>(null);
  const [wzLoading, setWzLoading] = useState(false);
  const [wzSearch, setWzSearch] = useState('');
  const [wzFilter, setWzFilter] = useState<'all' | 'expiring' | 'expired' | 'blocked'>('all');
  const [wzPage, setWzPage] = useState(1);
  const [wzActionStatus, setWzActionStatus] = useState<Record<number, string>>({});
  const [wzExtendDays, setWzExtendDays] = useState<Record<number, string>>({});

  const fetchWzClients = async (page = 1, search = wzSearch, filter = wzFilter) => {
    setWzLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), quantityPerPage: '20' });
      if (search) params.set('generalSearch', search);
      if (filter === 'expiring') params.set('closeToExpire', 'true');
      else if (filter === 'expired') params.set('expired', '1');
      else if (filter === 'blocked') params.set('status', '0');
      const r = await fetch(`/api/wmanage/clients?${params}`);
      if (r.ok) setWzClients(await r.json());
    } catch { /* silencioso */ }
    setWzLoading(false);
  };

  useEffect(() => {
    if (activeAdminTab === 'wmanage' && !wzClients) fetchWzClients();
  }, [activeAdminTab]);

  const wzAction = async (clientId: number, label: string, url: string, body?: Record<string, unknown>) => {
    setWzActionStatus((prev) => ({ ...prev, [clientId]: label }));
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const d = await r.json();
      setWzActionStatus((prev) => ({ ...prev, [clientId]: r.ok ? '✓ OK' : `Erro: ${d.message || r.status}` }));
      if (r.ok) fetchWzClients(wzPage);
    } catch (e) {
      setWzActionStatus((prev) => ({ ...prev, [clientId]: 'Falha na requisição' }));
    }
    setTimeout(() => setWzActionStatus((prev) => { const n = { ...prev }; delete n[clientId]; return n; }), 3500);
  };

  // SYSTEM LOGS STATE
  const [localSystemLogs, setLocalSystemLogs] = useState<SystemLog[]>(
    systemLogsProp || INITIAL_SYSTEM_LOGS
  );

  useEffect(() => {
    if (systemLogsProp) {
      setLocalSystemLogs(systemLogsProp);
    }
  }, [systemLogsProp]);

  // NOTIFICATIONS (FCM) STATE
  const [localNotifications, setLocalNotifications] = useState<PushNotification[]>(
    notificationsProp || INITIAL_NOTIFICATIONS
  );

  useEffect(() => {
    if (notificationsProp) {
      setLocalNotifications(notificationsProp);
    }
  }, [notificationsProp]);

  // PUSH NOTIFICATION FORM & AUTOMATION STATE
  const [notifTarget, setNotifTarget] = useState<string>('all');
  const [notifType, setNotifType] = useState<NotificationType>('expiration_warning');
  const [notifTitle, setNotifTitle] = useState<string>('⚠️ Aviso de Vencimento de Plano Próximo');
  const [notifBody, setNotifBody] = useState<string>(
    'Olá! Seu plano Zuxo vence nos próximos dias. Renove agora via PIX para não ficar sem sinal.'
  );
  const [notifAmount, setNotifAmount] = useState<string>('35.00');
  const [notifDueDate, setNotifDueDate] = useState<string>(() => addDaysToDateString(new Date().toLocaleDateString('pt-BR'), 30));
  const [isSendingPush, setIsSendingPush] = useState<boolean>(false);
  const [isAutomatingAlerts, setIsAutomatingAlerts] = useState<boolean>(false);
  const [automationReport, setAutomationReport] = useState<AutomatedAlertResult | null>(null);
  const [notifFilter, setNotifFilter] = useState<'all' | 'invoices' | 'expirations' | 'automated'>('all');
  const [autoRules, setAutoRules] = useState({
    exp3Days: true,
    expDueDay: true,
    newInvoices: true,
  });

  // CLIENT EDIT MODAL STATE
  const [editingClient, setEditingClient] = useState<UserProfile | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [isNewClientMode, setIsNewClientMode] = useState<boolean>(false);

  // Client form fields
  const [cName, setCName] = useState<string>('');
  const [cEmail, setCEmail] = useState<string>('');
  const [cWhatsapp, setCWhatsapp] = useState<string>('');
  const [cAvatar, setCAvatar] = useState<string>('');
  const [cScreens, setCScreens] = useState<number>(2);
  const [cCustomPrice, setCCustomPrice] = useState<number>(35.00);
  const [cExpiration, setCExpiration] = useState<string>('15/05/2026');
  const [cStatus, setCStatus] = useState<'ativo' | 'pendente' | 'expirado'>('ativo');
  const [cProvider, setCProvider] = useState<string>('http://dns.zuxoplayer.live:8080');
  const [cUsername, setCUsername] = useState<string>('');
  const [cPassword, setCPassword] = useState<string>('zuxo8849pass');
  const [cNotes, setCNotes] = useState<string>('');
  const [cCustomApps, setCCustomApps] = useState<ClientApp[]>([]);

  // Client search and filter
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('');
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'ativo' | 'pendente' | 'expirado'>('all');

  // Individual App sub-form inside Client modal
  const [isAddingAppToClient, setIsAddingAppToClient] = useState<boolean>(false);
  const [newAppName, setNewAppName] = useState<string>('');
  const [newAppPlatform, setNewAppPlatform] = useState<ClientApp['platform']>('android');
  const [newAppSubtitle, setNewAppSubtitle] = useState<string>('App exclusivo para o cliente');
  const [newAppVersion, setNewAppVersion] = useState<string>('v3.5.4');
  const [newAppDownloadUrl, setNewAppDownloadUrl] = useState<string>('');
  const [newAppPairingCode, setNewAppPairingCode] = useState<string>('');
  const [newAppInstructions, setNewAppInstructions] = useState<string>('Instale o app e acesse com seus dados');

  // Per-app credential editing state
  const [editingCredAppId, setEditingCredAppId] = useState<string | null>(null);
  const [credProvedor, setCredProvedor] = useState<string>('');
  const [credUsuario, setCredUsuario] = useState<string>('');
  const [credSenha, setCredSenha] = useState<string>('');
  const [credMac, setCredMac] = useState<string>('');

  // Known IPTV players for quick catalog selection
  const IPTV_KNOWN_APPS: Array<{ name: string; platform: ClientApp['platform']; subtitle: string; downloadUrl?: string }> = [
    { name: 'Quick Player', platform: 'android', subtitle: 'Player IPTV para Android' },
    { name: 'Quick Player PRO', platform: 'android', subtitle: 'Versão PRO do Quick Player' },
    { name: 'QPlay', platform: 'android', subtitle: 'QPlay IPTV Player' },
    { name: 'Big Player', platform: 'smart-tv', subtitle: 'Big Player para Smart TV' },
    { name: 'GTV Player', platform: 'android', subtitle: 'GTV Player IPTV' },
    { name: 'Quick Plus+', platform: 'android', subtitle: 'Quick Plus+ Player' },
    { name: 'RX Purple', platform: 'android', subtitle: 'RX Purple IPTV' },
    { name: 'ZUXO Player', platform: 'android', subtitle: 'App oficial Zuxo Player', downloadUrl: 'https://play.google.com/store/apps/details?id=com.zuxoplayer.app' },
    { name: 'CORTEX Player', platform: 'android', subtitle: 'CORTEX Player IPTV' },
    { name: 'UTM Play', platform: 'android', subtitle: 'UTM Play IPTV' },
  ];

  // TRAILER FORM STATE
  const [isTrailerFormOpen, setIsTrailerFormOpen] = useState<boolean>(false);
  const [editingTrailerId, setEditingTrailerId] = useState<string | null>(null);
  const [trTitle, setTrTitle] = useState<string>('');
  const [trCategory, setTrCategory] = useState<string>('Ação & Aventura');
  const [trYear, setTrYear] = useState<number>(2026);
  const [trVideoUrl, setTrVideoUrl] = useState<string>('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4');
  const [trPoster, setTrPoster] = useState<string>('https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop');
  const [trSynopsis, setTrSynopsis] = useState<string>('');
  const [trFeaturedTag, setTrFeaturedTag] = useState<string>('Estreia Exclusiva 2026');
  const [trType, setTrType] = useState<TrailerItem['type']>('lancamento');
  const [trPlatform, setTrPlatform] = useState<TrailerItem['streamingPlatform']>('Cinema 4K');

  // APP FORM STATE (GLOBAL)
  const [isAppFormOpen, setIsAppFormOpen] = useState<boolean>(false);
  const [appName, setAppName] = useState<string>('');
  const [appPlatform, setAppPlatform] = useState<ClientApp['platform']>('android');
  const [appSubtitle, setAppSubtitle] = useState<string>('');
  const [appVersion, setAppVersion] = useState<string>('v3.5.4');
  const [appDownloadUrl, setAppDownloadUrl] = useState<string>('');
  const [appPairingCode, setAppPairingCode] = useState<string>('');
  const [appIconUrl, setAppIconUrl] = useState<string>('');

  // CLIENT CATALOG SELECTION STATE
  const [isSelectingFromCatalog, setIsSelectingFromCatalog] = useState<boolean>(false);

  // PROGRAM FORM STATE
  const [isProgFormOpen, setIsProgFormOpen] = useState<boolean>(false);
  const [progChannel, setProgChannel] = useState<string>('ESPN Brasil 4K');
  const [progLogo, setProgLogo] = useState<string>('🏆');
  const [progCategory, setProgCategory] = useState<ProgramItem['category']>('Esportes');
  const [progTime, setProgTime] = useState<string>('16:00');
  const [progTitle, setProgTitle] = useState<string>('');
  const [progDesc, setProgDesc] = useState<string>('');
  const [progBadge, setProgBadge] = useState<string>('AO VIVO');
  const [progIsLive, setProgIsLive] = useState<boolean>(false);

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // --- CLIENT HANDLERS ---
  const handleOpenEditClient = (client: UserProfile) => {
    soundEffects.playClick();
    setIsNewClientMode(false);
    setEditingClient(client);
    setCName(client.name);
    setCEmail(client.email);
    setCWhatsapp(client.whatsapp || '');
    setCAvatar(client.avatar);
    setCScreens(client.screens || 1);
    setCCustomPrice(client.customPrice || 35.00);
    setCExpiration(client.expirationDate || addDaysToDateString(new Date().toLocaleDateString('pt-BR'), 30));
    setCStatus(client.status || 'ativo');
    setCProvider(client.provider || 'http://dns.zuxoplayer.live:8080');
    setCUsername(client.username || client.email.split('@')[0]);
    setCPassword(client.password || 'zuxo2026pass');
    setCNotes(client.notes || '');
    setCCustomApps(client.customApps || apps);
    setIsAddingAppToClient(false);
    setIsClientModalOpen(true);
  };

  const handleOpenNewClient = () => {
    soundEffects.playClick();
    setIsNewClientMode(true);
    setEditingClient(null);
    setCName('');
    setCEmail('');
    setCWhatsapp('');
    setCAvatar('https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop');
    setCScreens(2);
    setCCustomPrice(35.00);
    setCExpiration(addDaysToDateString(new Date().toLocaleDateString('pt-BR'), 30));
    setCStatus('ativo');
    setCProvider('http://dns.zuxoplayer.live:8080');
    setCUsername('');
    setCPassword('zuxo2026pass');
    setCNotes('');
    setCCustomApps([...apps]); // clone default apps
    setIsAddingAppToClient(false);
    setIsClientModalOpen(true);
  };

  // CRITICAL ACTION: Client deletion with audit logging
  const handleDeleteClientWithLog = (client: UserProfile) => {
    soundEffects.playClick();
    const confirmed = window.confirm(
      `ATENÇÃO: Deseja realmente excluir permanentemente o cliente "${client.name}" (${client.email})?\n\nEsta ação revogará seus acessos e será registrada nos Logs de Sistema.`
    );
    if (!confirmed) return;

    onDeleteClient(client.id);

    if (onAddSystemLog) {
      onAddSystemLog({
        action: 'client_delete',
        severity: 'critical',
        title: 'Exclusão Crítica de Cliente',
        description: `Cliente "${client.name}" (${client.email}) foi removido permanentemente do sistema pelo administrador.`,
        targetClientId: client.id,
        targetClientName: client.name,
        details: {
          email: client.email,
          previousPrice: client.customPrice,
          screens: client.screens,
          previousExpiration: client.expirationDate,
          provider: client.provider,
          username: client.username,
          reason: 'Exclusão manual executada pelo painel administrativo'
        }
      });
    }

    showNotification(`Cliente ${client.name} excluído (Registrado em Logs de Sistema).`);
  };

  // CRITICAL ACTION: Manual renewal with audit logging
  const handleQuickRenewSubscription = (client: UserProfile, daysToAdd: number = 30) => {
    soundEffects.playSelect();
    const oldExpiration = client.expirationDate;
    const newExpiration = addDaysToDateString(oldExpiration, daysToAdd);

    const updated: UserProfile = {
      ...client,
      expirationDate: newExpiration,
      status: 'ativo'
    };

    onUpdateClient(updated);

    if (onAddSystemLog) {
      onAddSystemLog({
        action: 'subscription_renewal',
        severity: 'info',
        title: 'Renovação Manual de Assinatura',
        description: `Assinatura do cliente "${client.name}" renovada manualmente por +${daysToAdd} dias (Novo vencimento: ${newExpiration}). Status reativado para Ativo.`,
        targetClientId: client.id,
        targetClientName: client.name,
        details: {
          previousExpiration: oldExpiration,
          newExpiration: newExpiration,
          daysAdded: daysToAdd,
          screens: client.screens,
          newPrice: client.customPrice,
          reason: 'Renovação manual executada pelo administrador no painel'
        }
      });
    }

    showNotification(`Assinatura de ${client.name} renovada até ${newExpiration}! (Registrado nos Logs)`);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cEmail.trim()) return;

    soundEffects.playSelect();

    const finalUsername = cUsername.trim() || cEmail.split('@')[0];
    const finalPassword = cPassword.trim() || 'zuxo8849pass';
    const finalProvider = cProvider.trim() || 'http://dns.zuxoplayer.live:8080';

    if (isNewClientMode) {
      const newClient: UserProfile = {
        id: `usr-${Date.now()}`,
        name: cName,
        email: cEmail,
        whatsapp: cWhatsapp,
        avatar: cAvatar,
        plan: `Plano ${cScreens} Telas (R$ ${cCustomPrice.toFixed(2)})`,
        expirationDate: cExpiration,
        screens: cScreens,
        customPrice: cCustomPrice,
        status: cStatus,
        provider: finalProvider,
        username: finalUsername,
        password: finalPassword,
        notes: cNotes,
        customApps: cCustomApps,
        createdAt: new Date().toISOString().split('T')[0],
      };
      onAddClient(newClient);

      if (onAddSystemLog) {
        onAddSystemLog({
          action: 'client_create',
          severity: 'info',
          title: 'Novo Cliente Cadastrado',
          description: `Cliente "${cName}" (${cEmail}) cadastrado com ${cScreens} tela(s) a R$ ${cCustomPrice.toFixed(2).replace('.', ',')} e vencimento em ${cExpiration}.`,
          targetClientId: newClient.id,
          targetClientName: cName,
          details: {
            email: cEmail,
            newPrice: cCustomPrice,
            screens: cScreens,
            newExpiration: cExpiration,
            provider: finalProvider,
            username: finalUsername,
            reason: 'Cadastro inicial pelo administrador'
          }
        });
      }
      showNotification('Novo cliente cadastrado com sucesso!');
    } else if (editingClient) {
      const priceChanged = Math.abs(editingClient.customPrice - cCustomPrice) > 0.001;
      const expirationChanged = editingClient.expirationDate !== cExpiration;

      const updated: UserProfile = {
        ...editingClient,
        name: cName,
        email: cEmail,
        whatsapp: cWhatsapp,
        avatar: cAvatar,
        screens: cScreens,
        customPrice: cCustomPrice,
        expirationDate: cExpiration,
        status: cStatus,
        provider: finalProvider,
        username: finalUsername,
        password: finalPassword,
        notes: cNotes,
        customApps: cCustomApps,
      };
      onUpdateClient(updated);

      // CRITICAL ACTION LOG: Price Change
      if (priceChanged && onAddSystemLog) {
        onAddSystemLog({
          action: 'price_change',
          severity: 'warning',
          title: 'Alteração de Preço Individual',
          description: `Valor da assinatura de "${cName}" alterado de R$ ${editingClient.customPrice.toFixed(2).replace('.', ',')} para R$ ${cCustomPrice.toFixed(2).replace('.', ',')}.`,
          targetClientId: editingClient.id,
          targetClientName: cName,
          details: {
            previousPrice: editingClient.customPrice,
            newPrice: cCustomPrice,
            screens: cScreens,
            reason: `Reajuste de valor na edição de cliente (${cScreens} telas)`
          }
        });
      }

      // CRITICAL ACTION LOG: Manual Renewal / Expiration adjustment
      if (expirationChanged && onAddSystemLog) {
        onAddSystemLog({
          action: 'subscription_renewal',
          severity: 'info',
          title: 'Renovação / Ajuste Manual de Vencimento',
          description: `Data de vencimento de "${cName}" alterada de ${editingClient.expirationDate} para ${cExpiration}. Status: ${cStatus}.`,
          targetClientId: editingClient.id,
          targetClientName: cName,
          details: {
            previousExpiration: editingClient.expirationDate,
            newExpiration: cExpiration,
            screens: cScreens,
            newPrice: cCustomPrice,
            reason: 'Vencimento alterado manualmente na edição'
          }
        });
      }

      showNotification(`Dados e apps de ${cName} atualizados!`);
    }

    setIsClientModalOpen(false);
  };

  // Add a personalized app to this specific client
  const handleAddCustomAppToClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;

    soundEffects.playSelect();
    const appItem: ClientApp = {
      id: `app-custom-${Date.now()}`,
      name: newAppName,
      platform: newAppPlatform,
      subtitle: newAppSubtitle,
      version: newAppVersion,
      status: 'ativo',
      downloadUrl: newAppDownloadUrl || undefined,
      pairingCode: newAppPairingCode || undefined,
      instructions: newAppInstructions.split('\n').filter(Boolean),
    };

    setCCustomApps([...cCustomApps, appItem]);
    setIsAddingAppToClient(false);
    setNewAppName('');
    setNewAppDownloadUrl('');
    setNewAppPairingCode('');
    showNotification('App exclusivo adicionado para este cliente!');
  };

  const handleRemoveCustomAppFromClient = (appId: string) => {
    soundEffects.playClick();
    setCCustomApps(cCustomApps.filter((a) => a.id !== appId));
  };

  const handleOpenEditCredentials = (cApp: ClientApp) => {
    soundEffects.playClick();
    setEditingCredAppId(cApp.id);
    setCredProvedor(cApp.credProvedor || cProvider);
    setCredUsuario(cApp.credUsuario || cUsername);
    setCredSenha(cApp.credSenha || cPassword);
    setCredMac(cApp.credMac || '');
  };

  const handleSaveCredentials = (appId: string) => {
    soundEffects.playSelect();
    setCCustomApps((prev) =>
      prev.map((a) =>
        a.id === appId
          ? {
              ...a,
              credProvedor: credProvedor.trim() || undefined,
              credUsuario: credUsuario.trim() || undefined,
              credSenha: credSenha.trim() || undefined,
              credMac: credMac.trim() || undefined,
            }
          : a
      )
    );
    setEditingCredAppId(null);
    showNotification('✅ Credenciais de acesso salvas!');
  };

  const handleAddKnownIptvApp = (preset: typeof IPTV_KNOWN_APPS[0]) => {
    soundEffects.playSelect();
    const already = cCustomApps.some((a) => a.name === preset.name);
    if (already) {
      showNotification(`${preset.name} já está na lista.`);
      return;
    }
    const newApp: ClientApp = {
      id: `app-iptv-${Date.now()}`,
      name: preset.name,
      platform: preset.platform,
      subtitle: preset.subtitle,
      version: 'v1.0',
      status: 'ativo',
      downloadUrl: preset.downloadUrl,
      instructions: [
        'Baixe e instale o aplicativo',
        'Abra o app e toque em "Adicionar" ou "Novo Portal"',
        'Digite o Provedor, Usuário e Senha exibidos nos seus dados de acesso abaixo',
      ],
      credProvedor: cProvider || '',
      credUsuario: cUsername || '',
      credSenha: cPassword || '',
    };
    setCCustomApps((prev) => [...prev, newApp]);
    showNotification(`${preset.name} adicionado! Configure as credenciais individuais abaixo.`);
  };

  // Quick preset loader for client apps
  const handleQuickPresetClientApp = (type: 'android' | 'ios' | 'smart-tv' | 'firestick') => {
    soundEffects.playClick();
    if (type === 'android') {
      setNewAppName(`Zuxo Player Android (${cName.split(' ')[0]})`);
      setNewAppPlatform('android');
      setNewAppSubtitle('APK direto configurado para sua conta');
      setNewAppVersion('v3.5.4');
      setNewAppDownloadUrl('https://zuxoplayer.tv/downloads/zuxo-apk.apk');
      setNewAppPairingCode(`Código: ${Math.floor(10000 + Math.random() * 90000)}`);
      setNewAppInstructions('Baixe o APK no seu aparelho\nInstale e faça login com seu usuário');
    } else if (type === 'ios') {
      setNewAppName(`Zuxo Player iPhone (${cName.split(' ')[0]})`);
      setNewAppPlatform('ios');
      setNewAppSubtitle('Configurado para iOS 16/17/18');
      setNewAppVersion('v3.5.2');
      setNewAppDownloadUrl('https://apps.apple.com/app/zuxo-player');
      setNewAppPairingCode(`ID: ZX-${cName.split(' ')[0].toUpperCase()}`);
      setNewAppInstructions('Instale o app na App Store\nDigite o código de ativação');
    } else if (type === 'smart-tv') {
      setNewAppName(`Zuxo Smart TV (${cName.split(' ')[0]})`);
      setNewAppPlatform('smart-tv');
      setNewAppSubtitle('Samsung Tizen / LG webOS');
      setNewAppVersion('v2.8.0');
      setNewAppPairingCode(`Pareamento: ZX-${Math.floor(1000 + Math.random() * 9000)}`);
      setNewAppInstructions('Abra o app na Smart TV\nDigite o código de pareamento');
    } else if (type === 'firestick') {
      setNewAppName(`FireStick Downloader (${cName.split(' ')[0]})`);
      setNewAppPlatform('tv-box');
      setNewAppSubtitle('Código rápido do Downloader');
      setNewAppVersion('v3.5.4');
      setNewAppPairingCode(`Código Downloader: ${Math.floor(10000 + Math.random() * 90000)}`);
      setNewAppInstructions('Abra o Downloader no FireStick\nDigite o código numérico acima');
    }
    setIsAddingAppToClient(true);
  };

  // --- TRAILERS HANDLERS ---
  const handleSaveTrailer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trTitle.trim() || !trVideoUrl.trim()) return;

    soundEffects.playSelect();
    if (editingTrailerId) {
      const existing = trailers.find((t) => t.id === editingTrailerId);
      if (existing) {
        onUpdateTrailer({
          ...existing,
          title: trTitle,
          category: trCategory,
          year: trYear,
          videoUrl: trVideoUrl,
          poster: trPoster,
          synopsis: trSynopsis,
          featuredTag: trFeaturedTag,
          type: trType,
          streamingPlatform: trPlatform,
        });
      }
    } else {
      onAddTrailer({
        title: trTitle,
        category: trCategory,
        year: trYear,
        videoUrl: trVideoUrl,
        poster: trPoster,
        synopsis: trSynopsis,
        featuredTag: trFeaturedTag,
        type: trType,
        streamingPlatform: trPlatform,
      });
    }

    showNotification('Trailer salvo com sucesso!');
    setIsTrailerFormOpen(false);
  };

  // --- FCM NOTIFICATION HANDLERS ---
  const handleQuickSendExpirationAlert = async (client: UserProfile) => {
    soundEffects.playSelect();
    const days = calculateDaysRemaining(client.expirationDate);
    const title = days <= 0 
      ? '🚨 Seu Plano Zuxo Venceu - Renove seu Acesso'
      : `⚠️ Vencimento Próximo: Vence em ${days} dia(s)`;
    const body = `Olá ${client.name}! Seu plano Zuxo vence em ${client.expirationDate}. Renove via PIX por R$ ${client.customPrice.toFixed(2).replace('.', ',')} para manter suas ${client.screens} telas ativas.`;

    try {
      const newNotif = await sendPushNotification({
        clientId: client.id,
        clientName: client.name,
        title,
        body,
        type: days <= 0 ? 'plan_expired' : 'expiration_warning',
        status: 'delivered',
        read: false,
        createdAt: new Date().toISOString(),
        dueDate: client.expirationDate,
        invoiceAmount: client.customPrice,
        deliveryChannel: 'fcm',
        isAutomated: false,
      });
      setLocalNotifications((prev) => [newNotif, ...prev]);
      showNotification(`Alerta de vencimento enviado para ${client.name} via FCM!`);
    } catch (err) {
      showNotification('Erro ao enviar notificação FCM.');
    }
  };

  const handleQuickSendInvoiceAlert = async (client: UserProfile) => {
    soundEffects.playSelect();
    const title = '📄 Nova Fatura Disponível - Zuxo Player';
    const body = `Fatura de R$ ${client.customPrice.toFixed(2).replace('.', ',')} gerada para ${client.screens} tela(s). Chave PIX pronta para pagamento instantâneo.`;

    try {
      const newNotif = await sendPushNotification({
        clientId: client.id,
        clientName: client.name,
        title,
        body,
        type: 'new_invoice',
        status: 'delivered',
        read: false,
        createdAt: new Date().toISOString(),
        dueDate: client.expirationDate,
        invoiceAmount: client.customPrice,
        deliveryChannel: 'fcm',
        isAutomated: false,
      });
      setLocalNotifications((prev) => [newNotif, ...prev]);
      showNotification(`Alerta de nova fatura enviado para ${client.name} via FCM!`);
    } catch (err) {
      showNotification('Erro ao enviar notificação FCM.');
    }
  };

  const handleTriggerAutomatedScan = async () => {
    soundEffects.playSelect();
    setIsAutomatingAlerts(true);
    try {
      const report = await checkAndSendAutomatedAlerts(clients, localNotifications);
      setAutomationReport(report);
      showNotification(`Varredura concluída! ${report.alertsSent} alerta(s) disparado(s) automaticamente.`);
    } catch (err) {
      showNotification('Erro ao executar varredura automática.');
    } finally {
      setIsAutomatingAlerts(false);
    }
  };

  const handleSendCustomPush = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playSelect();
    setIsSendingPush(true);

    const targetClient = clients.find((c) => c.id === notifTarget);
    const clientName = notifTarget === 'all' ? 'Todos os Clientes' : targetClient?.name || 'Cliente';

    try {
      const newNotif = await sendPushNotification({
        clientId: notifTarget,
        clientName,
        title: notifTitle,
        body: notifBody,
        type: notifType,
        status: 'delivered',
        read: false,
        createdAt: new Date().toISOString(),
        dueDate: notifDueDate || undefined,
        invoiceAmount: notifAmount ? parseFloat(notifAmount.replace(',', '.')) : undefined,
        deliveryChannel: 'fcm',
        isAutomated: false,
      });
      setLocalNotifications((prev) => [newNotif, ...prev]);
      showNotification(`Notificação Push enviada para ${clientName}!`);
    } catch (err) {
      showNotification('Erro ao enviar notificação push.');
    } finally {
      setIsSendingPush(false);
    }
  };

  const handleDeleteNotif = async (id: string) => {
    soundEffects.playClick();
    try {
      await deleteNotification(id);
      setLocalNotifications((prev) => prev.filter((n) => n.id !== id));
      showNotification('Notificação excluída com sucesso.');
    } catch (err) {
      showNotification('Erro ao remover notificação.');
    }
  };

  const handleSelectNotifPreset = (type: NotificationType) => {
    soundEffects.playClick();
    setNotifType(type);
    const client = clients.find((c) => c.id === notifTarget);
    const clientName = client ? client.name : 'Cliente';
    const priceStr = client ? `R$ ${client.customPrice.toFixed(2).replace('.', ',')}` : 'R$ 35,00';
    const expDate = client ? client.expirationDate : '15/05/2026';

    if (type === 'expiration_warning') {
      setNotifTitle('⚠️ Aviso de Vencimento de Plano Próximo');
      setNotifBody(`Olá ${clientName}! Seu plano Zuxo vence em breve (${expDate}). Renove via PIX por ${priceStr} para manter seu sinal ativo.`);
    } else if (type === 'new_invoice') {
      setNotifTitle('📄 Nova Fatura Gerada - Zuxo Player');
      setNotifBody(`Fatura no valor de ${priceStr} gerada para sua conta. Clique para visualizar o código PIX e realizar o pagamento.`);
    } else if (type === 'plan_expired') {
      setNotifTitle('🚨 Seu Plano Zuxo Venceu - Renove seu Acesso');
      setNotifBody(`Olá ${clientName}, seu plano venceu em ${expDate}. Renove agora via PIX por ${priceStr} para liberar suas telas imediatamente.`);
    } else {
      setNotifTitle('📢 Comunicado Oficial Zuxo Player');
      setNotifBody('Novos canais e estreias foram adicionados ao seu aplicativo. Aproveite sua programação em 4K!');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-radial from-[#07241a] via-[#04110c] to-[#010604] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* TOP BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-emerald-950">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundEffects.playClick();
                onBackToFeed();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-900/60 rounded-xl text-xs sm:text-sm font-semibold text-emerald-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#00F59B]" />
              Voltar ao Feed
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white font-display">
                Painel Administrativo Zuxo
              </h1>
              <p className="text-xs text-slate-400">
                Gerencie individualmente cada cliente, telas liberadas, valores a pagar e aplicativos personalizados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundEffects.playClick();
                onResetDefaults();
                showNotification('Dados restaurados para o padrão.');
              }}
              className="px-3 py-1.5 bg-[#0a1e16] hover:bg-[#0f2e21] border border-emerald-950 rounded-xl text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrão
            </button>

            {onLockAdmin && (
              <button
                onClick={() => {
                  soundEffects.playClick();
                  onLockAdmin();
                }}
                className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900/60 border border-red-800/60 rounded-xl text-xs text-red-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
                title="Bloquear e sair do painel administrativo"
              >
                <Lock className="w-3.5 h-3.5 text-red-400" />
                Bloquear Admin
              </button>
            )}
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex gap-2 border-b border-emerald-950 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveAdminTab('clients');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'clients'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <Users className="w-4 h-4" />
            Clientes & Planos Individuais ({clients.length})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveAdminTab('revenue');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'revenue'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Faturamento Projetado (Recharts)
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveAdminTab('notifications');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'notifications'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <Bell className="w-4 h-4" />
            Alertas & Push FCM ({localNotifications.length})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveAdminTab('logs');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'logs'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Logs de Sistema ({localSystemLogs.length})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveAdminTab('trailers');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'trailers'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <Video className="w-4 h-4" />
            Trailers 9:16 ({trailers.length})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveAdminTab('apps');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'apps'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Catálogo Global de Apps ({apps.length})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveAdminTab('guide');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'guide'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Grade de Programação ({programs.length})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveAdminTab('gateway');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'gateway'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            Gateway Efí Bank PIX
          </button>

          <button
            onClick={() => { soundEffects.playClick(); setActiveAdminTab('whatsapp'); }}
            className={`relative py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'whatsapp'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-green-400" />
            WhatsApp Bot
            {waAlerts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-lg animate-pulse">
                {waAlerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { soundEffects.playClick(); setActiveAdminTab('wmanage'); }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeAdminTab === 'wmanage'
                ? 'bg-[#00F59B] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0a1e16]'
            }`}
          >
            <Server className="w-4 h-4 text-cyan-400" />
            Servidor IPTV
          </button>
        </div>

        {/* NOTIFICATION */}
        {notification && (
          <div className="p-3 bg-emerald-950/90 border border-[#00F59B] rounded-2xl text-xs text-[#00F59B] flex items-center gap-2 shadow-lg animate-fadeIn">
            <CheckCircle2 className="w-4 h-4" /> {notification}
          </div>
        )}

        {/* ====================================================================== */}
        {/* TAB 1: GERENCIAMENTO INDIVIDUAL DE CLIENTES                            */}
        {/* ====================================================================== */}
        {activeAdminTab === 'clients' && (() => {
          const totalScreens = clients.reduce((acc, c) => acc + (c.screens || 1), 0);
          const totalMonthlyRevenue = clients.reduce((acc, c) => acc + (c.customPrice || 0), 0);
          const activeClientsCount = clients.filter((c) => c.status === 'ativo').length;
          const pendingClientsCount = clients.filter((c) => c.status === 'pendente').length;

          const filteredClients = clients.filter((c) => {
            const matchesSearch = 
              c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
              c.email.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
              (c.whatsapp && c.whatsapp.includes(clientSearchTerm));
            const matchesStatus = clientStatusFilter === 'all' || c.status === clientStatusFilter;
            return matchesSearch && matchesStatus;
          });

          return (
            <div className="space-y-6">
              {/* TOP HEADER */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Clientes Cadastrados no Zuxo Player
                  </h3>
                  <p className="text-xs text-slate-400">
                    Gerencie a quantidade de telas, valores a pagar e os aplicativos liberados para cada cliente individualmente.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundEffects.playClick();
                      setShowChartInClientsTab(!showChartInClientsTab);
                    }}
                    className={`py-2 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                      showChartInClientsTab
                        ? 'bg-[#092217] border-emerald-500/50 text-[#00F59B]'
                        : 'bg-[#0a1e16] border-emerald-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-[#00F59B]" />
                    <span>{showChartInClientsTab ? 'Ocultar Gráfico' : 'Exibir Gráfico de Receita'}</span>
                  </button>

                  <button
                    onClick={handleOpenNewClient}
                    className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wide rounded-xl shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Cadastrar Novo Cliente
                  </button>
                </div>
              </div>

              {/* SUMMARY METRICS CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#0a1e16] border border-emerald-900/60 p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-[#00F59B]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total de Clientes</span>
                    <strong className="text-lg font-black text-white font-display">{clients.length}</strong>
                  </div>
                </div>

                <div className="bg-[#0a1e16] border border-emerald-900/60 p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-[#00F59B]">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Telas Liberadas</span>
                    <strong className="text-lg font-black text-[#00F59B] font-display">{totalScreens} telas</strong>
                  </div>
                </div>

                <div className="bg-[#0a1e16] border border-emerald-900/60 p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-[#00F59B]">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Faturamento Previsto</span>
                    <strong className="text-lg font-black text-white font-mono">R$ {totalMonthlyRevenue.toFixed(2).replace('.', ',')}</strong>
                  </div>
                </div>

                <div className="bg-[#0a1e16] border border-emerald-900/60 p-3.5 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-[#00F59B]">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Status</span>
                    <span className="text-xs font-bold text-white">
                      <span className="text-[#00F59B]">{activeClientsCount} Ativos</span> · <span className="text-amber-400">{pendingClientsCount} Pend.</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* REVENUE BAR CHART (UTILIZANDO RECHARTS) */}
              {showChartInClientsTab && (
                <RevenueBarChart clients={clients} />
              )}

              {/* SEARCH & STATUS FILTER */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#071912] border border-emerald-950 p-3 rounded-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nome, e-mail ou WhatsApp..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="w-full bg-[#0a1e16] border border-emerald-900/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#00F59B]"
                  />
                  {clientSearchTerm && (
                    <button
                      onClick={() => setClientSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  <button
                    onClick={() => setClientStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors whitespace-nowrap ${
                      clientStatusFilter === 'all'
                        ? 'bg-[#00F59B] text-slate-950'
                        : 'bg-[#0a1e16] text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({clients.length})
                  </button>
                  <button
                    onClick={() => setClientStatusFilter('ativo')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors whitespace-nowrap ${
                      clientStatusFilter === 'ativo'
                        ? 'bg-[#00F59B] text-slate-950'
                        : 'bg-[#0a1e16] text-slate-400 hover:text-white'
                    }`}
                  >
                    Ativos ({activeClientsCount})
                  </button>
                  <button
                    onClick={() => setClientStatusFilter('pendente')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors whitespace-nowrap ${
                      clientStatusFilter === 'pendente'
                        ? 'bg-[#00F59B] text-slate-950'
                        : 'bg-[#0a1e16] text-slate-400 hover:text-white'
                    }`}
                  >
                    Pendentes ({pendingClientsCount})
                  </button>
                </div>
              </div>

              {/* CLIENTS LIST CARDS */}
              <div className="grid grid-cols-1 gap-3.5">
                {filteredClients.length === 0 ? (
                  <div className="p-8 text-center bg-[#071912] border border-emerald-950 rounded-3xl text-slate-400 text-xs">
                    <Users className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-white mb-1">Nenhum cliente encontrado com os filtros aplicados.</p>
                    <p>Tente alterar o termo de busca ou limpar os filtros.</p>
                  </div>
                ) : (
                  filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-[#0a1e16] border border-emerald-950 hover:border-emerald-600/60 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#00F59B] flex-shrink-0 shadow-[0_0_15px_rgba(0,245,155,0.25)]">
                      <img src={client.avatar} alt={client.name} className="w-full h-full object-cover" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-white font-display">
                          {client.name}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          client.status === 'ativo'
                            ? 'bg-emerald-950 text-[#00F59B] border-emerald-700/60'
                            : client.status === 'pendente'
                            ? 'bg-amber-950 text-amber-400 border-amber-700/60'
                            : 'bg-red-950 text-red-400 border-red-700/60'
                        }`}>
                          {client.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-mono mt-0.5">
                        {client.email} {client.whatsapp ? `· ${client.whatsapp}` : ''}
                      </p>

                      {/* Client parameters highlights */}
                      <div className="flex flex-wrap items-center gap-2.5 text-xs mt-2">
                        <span className="px-2 py-0.5 bg-[#05140e] border border-emerald-900/60 rounded-lg text-emerald-300 font-semibold flex items-center gap-1">
                          <Tv className="w-3.5 h-3.5 text-[#00F59B]" />
                          {client.screens} {client.screens === 1 ? 'Tela Liberada' : 'Telas Liberadas'}
                        </span>

                        <span className="px-2 py-0.5 bg-[#05140e] border border-emerald-900/60 rounded-lg text-emerald-300 font-semibold font-mono flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-[#00F59B]" />
                          R$ {client.customPrice.toFixed(2).replace('.', ',')} a pagar
                        </span>

                        <span className="px-2 py-0.5 bg-[#05140e] border border-emerald-900/60 rounded-lg text-slate-300 text-[11px] flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                          {(client.customApps || apps).length} apps liberados
                        </span>

                        <span className="text-slate-400 text-[11px]">
                          Vence: <strong className="text-white">{client.expirationDate}</strong>
                        </span>
                      </div>

                      {/* Credenciais Zuxo Player do Cliente */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-emerald-950/70 text-[11px] font-mono">
                        <span className="text-slate-400">Provedor:</span>
                        <span className="text-emerald-400 font-bold">{client.provider || 'http://dns.zuxoplayer.live:8080'}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">Usuário:</span>
                        <span className="text-[#00F59B] font-bold">{client.username || client.email.split('@')[0]}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">Senha:</span>
                        <span className="text-amber-300 font-bold">{client.password || 'zuxo2026pass'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center flex-wrap justify-end">
                    {/* Quick Push Buttons */}
                    <button
                      onClick={() => handleQuickSendExpirationAlert(client)}
                      className="px-2.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 text-amber-300 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                      title="Disparar Alerta de Vencimento via Push FCM"
                    >
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden xl:inline">Alerta Vencimento</span>
                    </button>

                    <button
                      onClick={() => handleQuickSendInvoiceAlert(client)}
                      className="px-2.5 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-600/40 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
                      title="Disparar Alerta de Nova Fatura via Push FCM"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-[#00F59B]" />
                      <span className="hidden xl:inline">Alerta Fatura</span>
                    </button>

                    <button
                      onClick={() => {
                        soundEffects.playSelect();
                        onSwitchToClient(client);
                        showNotification(`Alternado para a visão de ${client.name}!`);
                      }}
                      className="px-3 py-1.5 bg-[#071610] hover:bg-[#0c241b] border border-emerald-600/50 text-[#00F59B] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Visualizar a Área do Cliente como este usuário"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Área Dele
                    </button>

                    {/* MANUAL RENEWAL BUTTON (+30 DIAS) */}
                    <button
                      onClick={() => handleQuickRenewSubscription(client, 30)}
                      className="px-2.5 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-500/50 text-[#00F59B] text-xs font-bold rounded-xl flex items-center gap-1 transition-all shadow-sm active:scale-95"
                      title="Renovação Manual: Estender vigência por +30 dias e reativar sinal"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#00F59B]" />
                      <span className="hidden sm:inline">Renovar (+30d)</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditClient(client)}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm hover:brightness-110 transition-transform active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar Telas & Apps
                    </button>

                    <button
                      onClick={() => handleDeleteClientWithLog(client)}
                      className="p-2 bg-red-950/40 hover:bg-red-900/70 border border-red-800/40 text-red-400 hover:text-white rounded-xl transition-colors"
                      title="Excluir Cliente (Ação Crítica Registrada em Logs)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })()}

        {/* ====================================================================== */}
        {/* MODAL: EDITAR TELAS, VALORES E APPS PERSONALIZADOS DO CLIENTE         */}
        {/* ====================================================================== */}
        {isClientModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="relative w-full max-w-3xl bg-[#091d15] border border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-white my-auto max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/40 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-6 pb-4 border-b border-emerald-950">
                <h3 className="text-xl font-black text-white font-display flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#00F59B]" />
                  {isNewClientMode ? 'Cadastrar Novo Cliente' : `Gerenciar Cliente: ${cName}`}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure individualmente as telas liberadas, valor da mensalidade e os apps que aparecerão na área dele.
                </p>
              </div>

              <form onSubmit={handleSaveClient} className="space-y-6 text-xs">
                {/* PARÂMETROS PRINCIPAIS: TELAS & VALOR */}
                <div className="bg-[#05140e] border border-emerald-600/40 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Telas Liberadas e Valor Personalizado a Pagar
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* QUANTIDADE DE TELAS LIBERADAS */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Quantidade de Telas Liberadas *:
                      </label>
                      <div className="relative">
                        <Tv className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="number"
                          min={1}
                          max={10}
                          required
                          value={cScreens}
                          onChange={(e) => setCScreens(parseInt(e.target.value) || 1)}
                          className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl pl-9 pr-3 py-2 text-white font-bold outline-none focus:border-[#00F59B]"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Ex: 1, 2, 3, 4 telas</span>
                    </div>

                    {/* VALOR INDIVIDUAL A PAGAR */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Valor Individual a Pagar (R$) *:
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={cCustomPrice}
                          onChange={(e) => setCCustomPrice(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl pl-9 pr-3 py-2 text-white font-bold font-mono outline-none focus:border-[#00F59B]"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Valor cobrado no Pix/Cartão</span>
                    </div>

                    {/* STATUS DA ASSINATURA */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Status:</label>
                      <select
                        value={cStatus}
                        onChange={(e) => setCStatus(e.target.value as any)}
                        className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                      >
                        <option value="ativo">Ativo (Liberado)</option>
                        <option value="pendente">Pendente (Aguardando Pix)</option>
                        <option value="expirado">Expirado (Bloqueado)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* DADOS CADASTRAIS DO CLIENTE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nome Completo *:</label>
                    <input
                      type="text"
                      required
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">E-mail *:</label>
                    <input
                      type="email"
                      required
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">WhatsApp:</label>
                    <input
                      type="tel"
                      value={cWhatsapp}
                      onChange={(e) => setCWhatsapp(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold">Data de Vencimento:</label>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Renovação:</span>
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setCExpiration(addDaysToDateString(cExpiration, 30));
                            setCStatus('ativo');
                          }}
                          className="px-1.5 py-0.5 rounded bg-emerald-950 text-[#00F59B] border border-emerald-700/60 text-[10px] font-bold hover:bg-emerald-900"
                          title="Estender em +30 dias"
                        >
                          +30d
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setCExpiration(addDaysToDateString(cExpiration, 90));
                            setCStatus('ativo');
                          }}
                          className="px-1.5 py-0.5 rounded bg-emerald-950 text-[#00F59B] border border-emerald-700/60 text-[10px] font-bold hover:bg-emerald-900"
                          title="Estender em +90 dias"
                        >
                          +90d
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEffects.playClick();
                            setCExpiration(addDaysToDateString(cExpiration, 365));
                            setCStatus('ativo');
                          }}
                          className="px-1.5 py-0.5 rounded bg-emerald-950 text-[#00F59B] border border-emerald-700/60 text-[10px] font-bold hover:bg-emerald-900"
                          title="Estender em +1 Ano"
                        >
                          +1 Ano
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={cExpiration}
                      onChange={(e) => setCExpiration(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Foto de Perfil (URL ou Avatar):</label>
                    <input
                      type="text"
                      value={cAvatar}
                      onChange={(e) => setCAvatar(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-2 text-white font-mono text-[11px] outline-none focus:border-[#00F59B]"
                    />
                  </div>
                </div>

                {/* ============================================================== */}
                {/* DADOS DE ACESSO DO ZUXO PLAYER: PROVEDOR, USUÁRIO E SENHA     */}
                {/* ============================================================== */}
                <div className="bg-[#05140e] border border-emerald-500/60 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-emerald-950">
                    <div>
                      <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-[#00F59B]" />
                        Dados de Acesso do Zuxo Player (Provedor, Usuário e Senha)
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        O cliente verá estes dados em destaque no topo da Área do Cliente para logar no aplicativo.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cleanBase = cName.trim()
                          ? cName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_')
                          : (cEmail.split('@')[0] || `user_${Math.floor(1000 + Math.random() * 9000)}`);
                        setCUsername(cleanBase);
                        setCPassword(`zuxo${Math.floor(1000 + Math.random() * 9000)}pass`);
                        setCProvider('http://dns.zuxoplayer.live:8080');
                        showNotification('Credenciais geradas automaticamente!');
                      }}
                      className="px-3 py-1.5 bg-[#0c2f21] hover:bg-[#124230] border border-emerald-500/50 text-[#00F59B] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-center"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Gerar Acesso Automático
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* PROVEDOR / SERVIDOR DNS */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                        Provedor / DNS do Servidor *:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="http://dns.zuxoplayer.live:8080"
                        value={cProvider}
                        onChange={(e) => setCProvider(e.target.value)}
                        className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-[#00F59B]"
                      />
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                        <span>Padrão:</span>
                        <button
                          type="button"
                          onClick={() => setCProvider('http://dns.zuxoplayer.live:8080')}
                          className="text-[#00F59B] hover:underline font-mono"
                        >
                          dns.zuxoplayer.live:8080
                        </button>
                      </div>
                    </div>

                    {/* USUÁRIO */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                        Usuário do Zuxo Player *:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: lucas_sousa"
                        value={cUsername}
                        onChange={(e) => setCUsername(e.target.value)}
                        className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl px-3 py-2 text-white font-mono text-xs font-bold outline-none focus:border-[#00F59B]"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Login que o cliente usará</span>
                    </div>

                    {/* SENHA */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                        Senha do Zuxo Player *:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: zuxo2026pass"
                        value={cPassword}
                        onChange={(e) => setCPassword(e.target.value)}
                        className="w-full bg-[#0a1e16] border border-emerald-900/60 rounded-xl px-3 py-2 text-white font-mono text-xs font-bold outline-none focus:border-[#00F59B]"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Senha para logar no app</span>
                    </div>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* APPS PERSONALIZADOS E INDIVIDUAIS DESTE CLIENTE               */}
                {/* ============================================================== */}
                <div className="bg-[#05140e] border border-emerald-600/50 rounded-2xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-950">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-[#00F59B]" />
                        Apps Exclusivos Deste Cliente ({cCustomApps.length})
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        O cliente verá apenas estes aplicativos personalizados na Área do Cliente dele.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setIsSelectingFromCatalog(!isSelectingFromCatalog); setIsAddingAppToClient(false); }}
                        className="py-1.5 px-3 bg-[#0a2318] hover:bg-[#0e2e20] border border-emerald-700/60 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5" /> Do Catálogo Global
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsAddingAppToClient(true); setIsSelectingFromCatalog(false); }}
                        className="py-1.5 px-3 bg-[#0c2f21] hover:bg-[#124230] border border-emerald-500/50 text-[#00F59B] text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> App Personalizado
                      </button>
                    </div>
                  </div>

                  {/* SELECT FROM GLOBAL CATALOG */}
                  {isSelectingFromCatalog && (
                    <div className="p-4 bg-[#071a11] border border-emerald-700/50 rounded-2xl space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Selecionar Apps do Catálogo Global:</span>
                        <button type="button" onClick={() => setIsSelectingFromCatalog(false)} className="text-slate-400 hover:text-white text-xs">✕ Fechar</button>
                      </div>
                      <p className="text-[10px] text-slate-400">Marque os apps que deseja liberar para este cliente. Clique em "Adicionar Selecionados" para confirmar.</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {apps.map((catalogApp) => {
                          const isAlreadyAdded = cCustomApps.some(a => a.name === catalogApp.name);
                          return (
                            <div key={catalogApp.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isAlreadyAdded ? 'bg-emerald-950/60 border-emerald-700/60' : 'bg-[#0a1e16] border-emerald-950 hover:border-emerald-700/40'}`}
                              onClick={() => {
                                if (isAlreadyAdded) {
                                  setCCustomApps(prev => prev.filter(a => a.name !== catalogApp.name));
                                } else {
                                  const newApp: ClientApp = {
                                    ...catalogApp,
                                    id: `app-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
                                  };
                                  setCCustomApps(prev => [...prev, newApp]);
                                }
                              }}
                            >
                              <div className="w-10 h-10 rounded-xl bg-[#061510] border border-emerald-900/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {catalogApp.iconUrl ? (
                                  <img src={catalogApp.iconUrl} alt={catalogApp.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-lg">
                                    {catalogApp.platform === 'android' ? '🤖' : catalogApp.platform === 'ios' ? '🍎' : catalogApp.platform === 'smart-tv' ? '📺' : catalogApp.platform === 'tv-box' ? '📦' : catalogApp.platform === 'windows' ? '🖥️' : '🌐'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-white text-xs block truncate">{catalogApp.name}</span>
                                <span className="text-[10px] text-slate-400 truncate block">{catalogApp.subtitle}</span>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isAlreadyAdded ? 'bg-[#00F59B] border-[#00F59B]' : 'border-emerald-700'}`}>
                                {isAlreadyAdded && <Check className="w-3 h-3 text-slate-950" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-emerald-400 font-semibold">{cCustomApps.length} apps selecionados para este cliente.</p>
                    </div>
                  )}

                  {/* Quick Preset Buttons for this client */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">Modelos Rápidos:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickPresetClientApp('android')}
                      className="px-2.5 py-1 bg-[#0a1e16] hover:bg-emerald-950 border border-emerald-900/60 rounded-lg text-[10px] text-emerald-300 whitespace-nowrap"
                    >
                      + APK Android
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPresetClientApp('ios')}
                      className="px-2.5 py-1 bg-[#0a1e16] hover:bg-emerald-950 border border-emerald-900/60 rounded-lg text-[10px] text-emerald-300 whitespace-nowrap"
                    >
                      + App iPhone
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPresetClientApp('smart-tv')}
                      className="px-2.5 py-1 bg-[#0a1e16] hover:bg-emerald-950 border border-emerald-900/60 rounded-lg text-[10px] text-emerald-300 whitespace-nowrap"
                    >
                      + Smart TV
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPresetClientApp('firestick')}
                      className="px-2.5 py-1 bg-[#0a1e16] hover:bg-emerald-950 border border-emerald-900/60 rounded-lg text-[10px] text-emerald-300 whitespace-nowrap"
                    >
                      + FireStick
                    </button>
                  </div>

                  {/* Sub-form to add a custom app */}
                  {isAddingAppToClient && (
                    <div className="p-4 bg-[#0a2318] border border-emerald-500/60 rounded-2xl space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">Novo App para {cName || 'o Cliente'}:</span>
                        <button
                          type="button"
                          onClick={() => setIsAddingAppToClient(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">Nome do App *:</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Zuxo Player APK Exclusivo"
                            value={newAppName}
                            onChange={(e) => setNewAppName(e.target.value)}
                            className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#00F59B]"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">Plataforma:</label>
                          <select
                            value={newAppPlatform}
                            onChange={(e) => setNewAppPlatform(e.target.value as any)}
                            className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#00F59B]"
                          >
                            <option value="android">Android (APK)</option>
                            <option value="ios">iPhone / iOS</option>
                            <option value="smart-tv">Smart TV</option>
                            <option value="tv-box">FireStick / TV Box</option>
                            <option value="windows">Windows PC</option>
                            <option value="web">Web Player</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">Link de Download Oficial do APK (opcional):</label>
                          <input
                            type="text"
                            placeholder="https://..."
                            value={newAppDownloadUrl}
                            onChange={(e) => setNewAppDownloadUrl(e.target.value)}
                            className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-1.5 text-white font-mono outline-none focus:border-[#00F59B]"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">Código de Pareamento / Downloader Exclusivo:</label>
                          <input
                            type="text"
                            placeholder="Ex: Código TV: ZX-8821"
                            value={newAppPairingCode}
                            onChange={(e) => setNewAppPairingCode(e.target.value)}
                            className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#00F59B]"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddCustomAppToClient}
                        className="py-2 px-4 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 font-bold rounded-xl text-xs uppercase"
                      >
                        Confirmar e Inserir App na Lista Dele
                      </button>
                    </div>
                  )}

                  {/* Known IPTV Apps quick-add panel */}
                  <div className="p-3 bg-[#060f0a] border border-emerald-900/40 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <Key className="w-3 h-3" /> Players IPTV Conhecidos — Adicionar com Credenciais:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {IPTV_KNOWN_APPS.map((preset) => {
                        const isAdded = cCustomApps.some((a) => a.name === preset.name);
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => isAdded
                              ? setCCustomApps(prev => prev.filter(a => a.name !== preset.name))
                              : handleAddKnownIptvApp(preset)
                            }
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                              isAdded
                                ? 'bg-emerald-700/40 border-emerald-500 text-emerald-200'
                                : 'bg-[#0a1e16] border-emerald-900/60 text-slate-300 hover:border-emerald-500'
                            }`}
                          >
                            {isAdded && <Check className="w-3 h-3" />}
                            {preset.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* List of custom apps currently assigned to this client */}
                  <div className="space-y-2">
                    {cCustomApps.map((cApp) => (
                      <div key={cApp.id} className="bg-[#0a1e16] border border-emerald-950 rounded-xl overflow-hidden">
                        {/* App row */}
                        <div className="p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-[#00F59B] flex-shrink-0">
                              {cApp.platform === 'ios' && <Smartphone className="w-4 h-4" />}
                              {cApp.platform === 'android' && <Smartphone className="w-4 h-4 text-emerald-400" />}
                              {cApp.platform === 'smart-tv' && <Tv className="w-4 h-4 text-[#00F59B]" />}
                              {cApp.platform === 'tv-box' && <Box className="w-4 h-4 text-emerald-300" />}
                              {cApp.platform === 'windows' && <Monitor className="w-4 h-4 text-emerald-400" />}
                              {cApp.platform === 'web' && <Monitor className="w-4 h-4 text-cyan-400" />}
                            </div>
                            <div>
                              <span className="font-bold text-white text-xs block">{cApp.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {cApp.credUsuario
                                  ? `👤 ${cApp.credUsuario}`
                                  : cApp.pairingCode || cApp.downloadUrl || 'Sem credenciais'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                editingCredAppId === cApp.id
                                  ? setEditingCredAppId(null)
                                  : handleOpenEditCredentials(cApp)
                              }
                              className={`p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-colors ${
                                editingCredAppId === cApp.id
                                  ? 'bg-emerald-700/40 border-emerald-500 text-emerald-200'
                                  : 'bg-[#071610] border-emerald-900/60 text-emerald-400 hover:border-emerald-500'
                              }`}
                              title="Editar credenciais de acesso"
                            >
                              <Key className="w-3 h-3" />
                              <span className="hidden sm:inline">Acesso</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomAppFromClient(cApp.id)}
                              className="p-1.5 text-red-400 hover:text-white hover:bg-red-950/60 rounded-lg transition-colors"
                              title="Remover app deste cliente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Credential inline editor */}
                        {editingCredAppId === cApp.id && (
                          <div className="px-3 pb-3 pt-0 border-t border-emerald-900/40 bg-[#060f0a] space-y-2.5 animate-fadeIn">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider pt-3 block">
                              Dados de Acesso — {cApp.name}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-400 font-semibold mb-1">Provedor (URL do servidor)</label>
                                <input
                                  type="text"
                                  placeholder="http://dns.servidor.com:8080"
                                  value={credProvedor}
                                  onChange={(e) => setCredProvedor(e.target.value)}
                                  className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-1.5 text-white text-xs font-mono outline-none focus:border-[#00F59B]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-semibold mb-1">MAC do Aparelho (opcional)</label>
                                <input
                                  type="text"
                                  placeholder="00:1A:2B:3C:4D:5E"
                                  value={credMac}
                                  onChange={(e) => setCredMac(e.target.value)}
                                  className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-1.5 text-white text-xs font-mono outline-none focus:border-[#00F59B]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-semibold mb-1">Usuário</label>
                                <input
                                  type="text"
                                  placeholder="nome_usuario"
                                  value={credUsuario}
                                  onChange={(e) => setCredUsuario(e.target.value)}
                                  className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-[#00F59B]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-semibold mb-1">Senha</label>
                                <input
                                  type="text"
                                  placeholder="senha_de_acesso"
                                  value={credSenha}
                                  onChange={(e) => setCredSenha(e.target.value)}
                                  className="w-full bg-[#05130d] border border-emerald-900/60 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-[#00F59B]"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleSaveCredentials(cApp.id)}
                                className="py-1.5 px-4 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 font-bold rounded-xl text-xs uppercase flex items-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" /> Salvar Credenciais
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCredAppId(null)}
                                className="py-1.5 px-3 bg-[#0a1e16] border border-emerald-900/60 text-slate-400 font-bold rounded-xl text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {cCustomApps.length === 0 && (
                      <p className="text-center py-4 text-slate-400 text-xs">
                        Nenhum app atribuído individualmente ainda. Use os botões acima para adicionar players IPTV.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-emerald-950">
                  <button
                    type="button"
                    onClick={() => setIsClientModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg"
                  >
                    {isNewClientMode ? 'Criar Cliente' : 'Salvar Alterações do Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================================== */}
        {/* TAB: RECEITA MENSAL ACUMULADA (GRÁFICO RECHARTS & ANÁLISE FINANCEIRA)  */}
        {/* ====================================================================== */}
        {activeAdminTab === 'revenue' && (
          <div className="space-y-6">
            <RevenueBarChart clients={clients} />

            {/* TABELA DE MENSALIDADES E TELAS DOS CLIENTES */}
            <div className="bg-[#05170f] border border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-emerald-950 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#00F59B]" /> Detalhamento de Mensalidades por Cliente
                  </h4>
                  <p className="text-xs text-slate-400">
                    Valores personalizados e telas liberadas para a composição da receita acumulada
                  </p>
                </div>
                <button
                  onClick={() => setActiveAdminTab('clients')}
                  className="px-3 py-1.5 bg-[#0a2016] hover:bg-[#0f2e21] border border-emerald-900/60 rounded-xl text-xs text-emerald-300 font-semibold"
                >
                  Gerenciar Clientes
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-emerald-950 text-slate-400 text-[11px] uppercase font-semibold">
                      <th className="pb-3 pl-2">Cliente</th>
                      <th className="pb-3">Plano / Contrato</th>
                      <th className="pb-3 text-center">Telas Liberadas</th>
                      <th className="pb-3 text-right">Mensalidade (R$)</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-right pr-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/60">
                    {clients.map((c) => (
                      <tr key={c.id} className="hover:bg-emerald-950/20 transition-colors">
                        <td className="py-3 pl-2 flex items-center gap-2.5">
                          <img
                            src={c.avatar}
                            alt={c.name}
                            className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
                          />
                          <div>
                            <span className="font-bold text-white block">{c.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{c.email}</span>
                          </div>
                        </td>
                        <td className="py-3 text-slate-300">
                          <span>{c.plan}</span>
                          <span className="text-[10px] text-slate-400 block">Venc: {c.expirationDate}</span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-[#00F59B] font-bold text-[11px]">
                            {c.screens} {c.screens === 1 ? 'tela' : 'telas'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-white text-sm">
                          R$ {(c.customPrice || 0).toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            c.status === 'ativo'
                              ? 'bg-emerald-950 text-[#00F59B] border border-emerald-700/50'
                              : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2">
                          <button
                            onClick={() => {
                              handleOpenEditClient(c);
                              setActiveAdminTab('clients');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#0a2016] hover:bg-[#0e2c20] text-emerald-300 text-[11px] font-semibold border border-emerald-900"
                          >
                            Ajustar Valor
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================== */}
        {/* TAB: CENTRAL DE NOTIFICAÇÕES PUSH (FIREBASE CLOUD MESSAGING - FCM)     */}
        {/* ====================================================================== */}
        {activeAdminTab === 'notifications' && (
          <div className="space-y-6">
            
            {/* TOP HEADER & FCM STATUS BAR */}
            <div className="bg-[#05170f] border border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-[#00F59B]/15 border border-[#00F59B]/40 text-[#00F59B]">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white font-display flex items-center gap-2">
                        Central de Notificações Push FCM
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-[#00F59B] border border-emerald-700/60">
                          Firebase Cloud Messaging
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Envio de alertas automáticos e manuais de faturas pendentes e vencimentos próximos
                      </p>
                    </div>
                  </div>
                </div>

                {/* SYSTEM HEALTH BADGES */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3 py-1.5 bg-[#03130c] border border-emerald-700/60 rounded-xl text-xs flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00F59B] animate-ping" />
                    <span className="text-slate-300 font-semibold">FCM Status:</span>
                    <strong className="text-[#00F59B]">Conectado & Ativo</strong>
                  </div>

                  <div className="px-3 py-1.5 bg-[#03130c] border border-emerald-900/60 rounded-xl text-xs flex items-center gap-2 font-mono">
                    <span className="text-slate-400">Sender ID:</span>
                    <span className="text-white font-bold">378614234879</span>
                  </div>

                  <div className="px-3 py-1.5 bg-[#03130c] border border-emerald-900/60 rounded-xl text-xs flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-[#00F59B]" />
                    <span className="text-slate-300">Total Enviadas:</span>
                    <strong className="text-white">{localNotifications.length}</strong>
                  </div>
                </div>
              </div>

              {/* STATS TILES */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-emerald-950">
                <div className="p-3 bg-[#081f15] rounded-2xl border border-emerald-950">
                  <span className="text-[11px] text-slate-400 font-semibold block">Total de Alertas</span>
                  <span className="text-xl font-black text-white font-mono">{localNotifications.length}</span>
                </div>
                <div className="p-3 bg-[#081f15] rounded-2xl border border-emerald-950">
                  <span className="text-[11px] text-amber-300 font-semibold block">Vencimentos Próximos</span>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    {localNotifications.filter((n) => n.type === 'expiration_warning' || n.type === 'plan_expired').length}
                  </span>
                </div>
                <div className="p-3 bg-[#081f15] rounded-2xl border border-emerald-950">
                  <span className="text-[11px] text-[#00F59B] font-semibold block">Novas Faturas</span>
                  <span className="text-xl font-black text-[#00F59B] font-mono">
                    {localNotifications.filter((n) => n.type === 'new_invoice').length}
                  </span>
                </div>
                <div className="p-3 bg-[#081f15] rounded-2xl border border-emerald-950">
                  <span className="text-[11px] text-cyan-300 font-semibold block">Alertas Automáticos</span>
                  <span className="text-xl font-black text-cyan-400 font-mono">
                    {localNotifications.filter((n) => n.isAutomated).length}
                  </span>
                </div>
              </div>
            </div>

            {/* AUTOMATION ENGINE CARD */}
            <div className="bg-gradient-to-r from-[#072418] via-[#051a11] to-[#04120c] border border-[#00F59B]/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(0,245,155,0.1)]">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-emerald-950">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#00F59B]" />
                    <h4 className="text-base font-black text-white font-display">
                      Motor de Alertas Automáticos FCM
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-[#00F59B] border border-emerald-700/60">
                      Automático
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Varre a base de clientes no Firestore, calcula a proximidade do vencimento de cada plano e identifica faturas pendentes para disparar notificações push instantâneas.
                  </p>
                </div>

                <button
                  onClick={handleTriggerAutomatedScan}
                  disabled={isAutomatingAlerts}
                  className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isAutomatingAlerts ? 'animate-spin' : ''}`} />
                  {isAutomatingAlerts ? 'Varrendo Clientes...' : 'Executar Verificação & Disparar Alertas Agora'}
                </button>
              </div>

              {/* AUTOMATION REPORT FEEDBACK */}
              {automationReport && (
                <div className="mt-4 p-4 rounded-2xl bg-[#04160e] border border-emerald-600/50 animate-in fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#00F59B]" />
                      Relatório da Varredura Automática:
                    </span>
                    <span className="text-xs font-mono text-[#00F59B]">
                      {automationReport.alertsSent} alerta(s) disparado(s) de {automationReport.totalClientsChecked} clientes analisados
                    </span>
                  </div>
                  {automationReport.details.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Nenhum cliente com plano vencendo nos próximos 5 dias ou com faturas pendentes no momento.
                    </p>
                  ) : (
                    <div className="space-y-1.5 mt-2">
                      {automationReport.details.map((item, idx) => (
                        <div key={idx} className="text-xs text-slate-300 flex items-center gap-2 bg-[#082015] p-2 rounded-xl">
                          <span className="font-bold text-white">{item.clientName}:</span>
                          <span className="text-slate-300">{item.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AUTOMATION RULES SWITCHES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                <div className="p-3 bg-[#03130c] rounded-2xl border border-emerald-950 flex items-center justify-between">
                  <div>
                    <strong className="text-white block">Aviso prévio de vencimento</strong>
                    <span className="text-[11px] text-slate-400">Alertar 3 a 5 dias antes</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-[#00F59B] border border-emerald-800">
                    Ativo
                  </span>
                </div>

                <div className="p-3 bg-[#03130c] rounded-2xl border border-emerald-950 flex items-center justify-between">
                  <div>
                    <strong className="text-white block">Vencimento & Expiração</strong>
                    <span className="text-[11px] text-slate-400">Alertar no dia do vencimento</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-[#00F59B] border border-emerald-800">
                    Ativo
                  </span>
                </div>

                <div className="p-3 bg-[#03130c] rounded-2xl border border-emerald-950 flex items-center justify-between">
                  <div>
                    <strong className="text-white block">Novas faturas geradas</strong>
                    <span className="text-[11px] text-slate-400">Alertar clientes com faturas pendentes</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-[#00F59B] border border-emerald-800">
                    Ativo
                  </span>
                </div>
              </div>
            </div>

            {/* CARD: MANUAL / CUSTOM PUSH NOTIFICATION FORM */}
            <div className="bg-[#05170f] border border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="pb-4 border-b border-emerald-950 mb-5">
                <h4 className="text-base font-black text-white font-display flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#00F59B]" />
                  Disparo de Alerta Push Personalizado
                </h4>
                <p className="text-xs text-slate-400">
                  Envie uma notificação push direta para um cliente específico ou para todos os clientes cadastrados.
                </p>
              </div>

              <form onSubmit={handleSendCustomPush} className="space-y-4 text-xs">
                {/* PRESET SHORTCUTS */}
                <div>
                  <label className="block text-slate-300 font-bold mb-2">Modelos Prontos de Alerta:</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectNotifPreset('expiration_warning')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                        notifType === 'expiration_warning'
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : 'bg-[#0a1e16] text-amber-300 hover:text-white border border-amber-900/40'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Vencimento Próximo
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectNotifPreset('new_invoice')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                        notifType === 'new_invoice'
                          ? 'bg-[#00F59B] text-slate-950 shadow-md'
                          : 'bg-[#0a1e16] text-emerald-300 hover:text-white border border-emerald-900/40'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Nova Fatura
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectNotifPreset('plan_expired')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                        notifType === 'plan_expired'
                          ? 'bg-red-400 text-slate-950 shadow-md'
                          : 'bg-[#0a1e16] text-red-300 hover:text-white border border-red-900/40'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Plano Vencido
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectNotifPreset('custom')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                        notifType === 'custom'
                          ? 'bg-cyan-400 text-slate-950 shadow-md'
                          : 'bg-[#0a1e16] text-cyan-300 hover:text-white border border-cyan-900/40'
                      }`}
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      Comunicado VIP
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* TARGET CLIENT */}
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Destinatário da Notificação *:</label>
                    <select
                      value={notifTarget}
                      onChange={(e) => {
                        setNotifTarget(e.target.value);
                        const sel = clients.find((c) => c.id === e.target.value);
                        if (sel) {
                          setNotifDueDate(sel.expirationDate);
                          setNotifAmount(sel.customPrice.toFixed(2));
                        }
                      }}
                      className="w-full bg-[#0a1e16] border border-emerald-900/80 rounded-xl px-3 py-2 text-white font-semibold outline-none focus:border-[#00F59B]"
                    >
                      <option value="all">📢 Todos os Clientes Ativos ({clients.length})</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          👤 {c.name} — R$ {c.customPrice.toFixed(2)} ({c.screens} telas · Vence: {c.expirationDate})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* TITLE */}
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Título da Notificação Push *:</label>
                    <input
                      type="text"
                      required
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="Ex: ⚠️ Aviso de Vencimento de Plano Próximo"
                      className="w-full bg-[#0a1e16] border border-emerald-900/80 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                    />
                  </div>
                </div>

                {/* BODY CONTENT */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Mensagem do Alerta *:</label>
                  <textarea
                    rows={3}
                    required
                    value={notifBody}
                    onChange={(e) => setNotifBody(e.target.value)}
                    placeholder="Digite o texto detalhado da notificação..."
                    className="w-full bg-[#0a1e16] border border-emerald-900/80 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Valor da Fatura (Opcional - R$):</label>
                    <input
                      type="text"
                      value={notifAmount}
                      onChange={(e) => setNotifAmount(e.target.value)}
                      placeholder="Ex: 35.00"
                      className="w-full bg-[#0a1e16] border border-emerald-900/80 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#00F59B]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Data de Vencimento (Opcional):</label>
                    <input
                      type="text"
                      value={notifDueDate}
                      onChange={(e) => setNotifDueDate(e.target.value)}
                      placeholder="Ex: 15/05/2026"
                      className="w-full bg-[#0a1e16] border border-emerald-900/80 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#00F59B]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSendingPush}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    {isSendingPush ? 'Disparando FCM...' : 'Disparar Notificação Push FCM Agora'}
                  </button>
                </div>
              </form>
            </div>

            {/* CARD: NOTIFICATIONS LOGS & HISTORY */}
            <div className="bg-[#05170f] border border-emerald-900/60 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-emerald-950 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00F59B]" /> Histórico & Logs de Envios Push FCM
                  </h4>
                  <p className="text-xs text-slate-400">
                    Notificações enviadas aos clientes com registro em tempo real no Firestore
                  </p>
                </div>

                {/* LOGS FILTERS */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  <button
                    onClick={() => setNotifFilter('all')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all ${
                      notifFilter === 'all'
                        ? 'bg-[#00F59B] text-slate-950'
                        : 'bg-[#0a1e16] text-slate-400 hover:text-white'
                    }`}
                  >
                    Todas ({localNotifications.length})
                  </button>
                  <button
                    onClick={() => setNotifFilter('expirations')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all ${
                      notifFilter === 'expirations'
                        ? 'bg-[#00F59B] text-slate-950'
                        : 'bg-[#0a1e16] text-slate-400 hover:text-white'
                    }`}
                  >
                    Vencimentos
                  </button>
                  <button
                    onClick={() => setNotifFilter('invoices')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all ${
                      notifFilter === 'invoices'
                        ? 'bg-[#00F59B] text-slate-950'
                        : 'bg-[#0a1e16] text-slate-400 hover:text-white'
                    }`}
                  >
                    Faturas
                  </button>
                  <button
                    onClick={() => setNotifFilter('automated')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all ${
                      notifFilter === 'automated'
                        ? 'bg-[#00F59B] text-slate-950'
                        : 'bg-[#0a1e16] text-slate-400 hover:text-white'
                    }`}
                  >
                    Automáticas
                  </button>
                </div>
              </div>

              {/* LOGS TABLE / CARDS */}
              <div className="space-y-3">
                {localNotifications
                  .filter((n) => {
                    if (notifFilter === 'expirations') return n.type === 'expiration_warning' || n.type === 'plan_expired';
                    if (notifFilter === 'invoices') return n.type === 'new_invoice';
                    if (notifFilter === 'automated') return n.isAutomated;
                    return true;
                  })
                  .map((notif) => {
                    const isInvoice = notif.type === 'new_invoice';
                    const isExp = notif.type === 'expiration_warning' || notif.type === 'plan_expired';

                    return (
                      <div
                        key={notif.id}
                        className="p-4 bg-[#081e14] border border-emerald-950 hover:border-emerald-700/60 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
                            isInvoice
                              ? 'bg-[#00F59B]/20 text-[#00F59B]'
                              : isExp
                              ? 'bg-amber-400/20 text-amber-400'
                              : 'bg-cyan-400/20 text-cyan-400'
                          }`}>
                            {isInvoice ? <CreditCard className="w-4 h-4" /> : isExp ? <AlertTriangle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-xs">{notif.clientName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isInvoice
                                  ? 'bg-emerald-950 text-[#00F59B] border border-emerald-800'
                                  : isExp
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              }`}>
                                {isInvoice ? 'Fatura' : isExp ? 'Vencimento' : 'Alerta'}
                              </span>
                              {notif.isAutomated && (
                                <span className="px-1.5 py-0.2 bg-emerald-900/60 text-emerald-300 text-[9px] font-bold uppercase rounded border border-emerald-700">
                                  Auto
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400">
                                {new Date(notif.createdAt).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <p className="text-xs font-bold text-emerald-300 mt-1">{notif.title}</p>
                            <p className="text-xs text-slate-300 mt-0.5">{notif.body}</p>

                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                              {notif.invoiceAmount && (
                                <span className="font-mono text-[#00F59B] font-bold">
                                  R$ {notif.invoiceAmount.toFixed(2).replace('.', ',')}
                                </span>
                              )}
                              {notif.dueDate && <span>Vence: <strong className="text-white">{notif.dueDate}</strong></span>}
                              <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                                <Radio className="w-3 h-3 text-[#00F59B]" /> FCM Web Push · Entregue
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          <button
                            onClick={() => handleDeleteNotif(notif.id)}
                            className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-white border border-red-900/40 rounded-xl transition-colors"
                            title="Excluir do Histórico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        )}

        {/* ====================================================================== */}
        {/* TAB: LOGS DE SISTEMA & AÇÕES CRÍTICAS                                  */}
        {/* ====================================================================== */}
        {activeAdminTab === 'logs' && (
          <SystemLogsTab
            logs={localSystemLogs}
            onAddLog={(newLog) => {
              if (onAddSystemLog) {
                onAddSystemLog(newLog);
              }
              const logItem: SystemLog = {
                ...newLog,
                id: `log-local-${Date.now()}`,
                timestamp: new Date().toISOString(),
                adminUser: newLog.adminUser || 'Administrador (Mestre)',
              };
              setLocalSystemLogs((prev) => [logItem, ...prev]);
            }}
            onDeleteLog={(logId) => {
              if (onDeleteSystemLog) {
                onDeleteSystemLog(logId);
              }
              setLocalSystemLogs((prev) => prev.filter((l) => l.id !== logId));
              showNotification('Registro de log removido com sucesso.');
            }}
          />
        )}

        {/* ====================================================================== */}
        {/* TAB 2: TRAILERS 9:16                                                   */}
        {/* ====================================================================== */}
        {activeAdminTab === 'trailers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Trailers Verticais 9:16 do Feed
                </h3>
                <p className="text-xs text-slate-400">
                  Vídeos verticais cadastrados para exibição na tela inicial
                </p>
              </div>

              <button
                onClick={() => {
                  soundEffects.playClick();
                  setEditingTrailerId(null);
                  setTrTitle('');
                  setTrSynopsis('');
                  setIsTrailerFormOpen(true);
                }}
                className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 font-bold text-xs uppercase rounded-xl"
              >
                + Cadastrar Trailer
              </button>
            </div>

            {isTrailerFormOpen && (
              <form onSubmit={handleSaveTrailer} className="bg-[#091d15] border border-emerald-600/50 p-6 rounded-3xl space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Título:</label>
                    <input
                      type="text"
                      required
                      value={trTitle}
                      onChange={(e) => setTrTitle(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Gênero:</label>
                    <input
                      type="text"
                      required
                      value={trCategory}
                      onChange={(e) => setTrCategory(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Tipo de Conteúdo:</label>
                    <select
                      value={trType || 'lancamento'}
                      onChange={(e) => setTrType(e.target.value as TrailerItem['type'])}
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="lancamento">🎬 Filme Lançamento</option>
                      <option value="serie">📺 Série de Sucesso</option>
                      <option value="aguardado">✨ Filme Aguardado (2025/2026)</option>
                      <option value="filme">🎥 Filme Clássico / Catálogo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Plataforma / Onde Assistir:</label>
                    <select
                      value={trPlatform || 'Cinema 4K'}
                      onChange={(e) => setTrPlatform(e.target.value as TrailerItem['streamingPlatform'])}
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="Cinema 4K">Cinema 4K</option>
                      <option value="Netflix">Netflix</option>
                      <option value="Max">Max (HBO)</option>
                      <option value="Disney+">Disney+</option>
                      <option value="Prime Video">Prime Video</option>
                      <option value="Apple TV+">Apple TV+</option>
                      <option value="Zuxo VIP">Zuxo VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Tag em Destaque:</label>
                    <input
                      type="text"
                      value={trFeaturedTag}
                      onChange={(e) => setTrFeaturedTag(e.target.value)}
                      placeholder="Ex: 🔥 Em Alta / Mais Aguardado"
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 font-bold">URL do Vídeo (YouTube Shorts, YouTube ou MP4 direto) *:</label>
                    <span className="text-[10px] text-[#00F59B] font-mono">Aceita shorts do YouTube e links .mp4</span>
                  </div>
                  <input
                    type="url"
                    required
                    value={trVideoUrl}
                    onChange={(e) => setTrVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/shorts/... ou https://seusite.com/video.mp4"
                    className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#00F59B]"
                  />
                  <div className="mt-2 p-2.5 bg-[#071710] border border-emerald-900/50 rounded-xl text-[11px] text-slate-300 space-y-1">
                    <p className="font-semibold text-[#00F59B]">💡 Como colocar seus vídeos:</p>
                    <p>• <strong>YouTube Shorts:</strong> Copie o link do Shorts (ex: <code className="text-emerald-300 bg-black/40 px-1 py-0.5 rounded">https://www.youtube.com/shorts/ID_DO_VIDEO</code>) e cole acima diretamente!</p>
                    <p>• <strong>Links MP4 Diretos:</strong> Vídeos hospedados em CDN, servidor próprio, AWS S3, Cloudflare R2 ou Firebase Storage terminando em <code className="text-emerald-300 bg-black/40 px-1 py-0.5 rounded">.mp4</code>.</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    <span className="text-[10px] text-slate-400 self-center mr-1">Exemplos para testar:</span>
                    <button
                      type="button"
                      onClick={() => setTrVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4')}
                      className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-800 text-[10px] text-emerald-300 font-mono"
                    >
                      MP4: TearsOfSteel
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4')}
                      className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-800 text-[10px] text-emerald-300 font-mono"
                    >
                      MP4: ForBiggerBlazes
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4')}
                      className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-800 text-[10px] text-emerald-300 font-mono"
                    >
                      MP4: ForBiggerJoyrides
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Sinopse:</label>
                  <textarea
                    rows={2}
                    value={trSynopsis}
                    onChange={(e) => setTrSynopsis(e.target.value)}
                    className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsTrailerFormOpen(false)} className="px-4 py-2 bg-slate-800 rounded-xl">Cancelar</button>
                  <button type="submit" className="px-5 py-2 bg-[#00F59B] text-slate-950 font-bold rounded-xl">Salvar</button>
                </div>
              </form>
            )}

            <div className="bg-[#0a1e16] border border-emerald-950 rounded-3xl divide-y divide-emerald-950/70">
              {trailers.map((tr) => (
                <div key={tr.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={tr.poster} alt={tr.title} className="w-12 h-16 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-bold text-white text-sm">{tr.title}</h4>
                      <p className="text-xs text-slate-400">{tr.category} · {tr.year}</p>
                    </div>
                  </div>
                  <button onClick={() => onDeleteTrailer(tr.id)} className="p-2 text-red-400 hover:text-white">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================== */}
        {/* TAB 3: CATÁLOGO GLOBAL DE APPS                                         */}
        {/* ====================================================================== */}
        {activeAdminTab === 'apps' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Catálogo Geral de Aplicativos
                </h3>
                <p className="text-xs text-slate-400">
                  Modelos de aplicativos usados para vincular aos clientes
                </p>
              </div>

              <button
                onClick={() => {
                  soundEffects.playClick();
                  setAppName('');
                  setIsAppFormOpen(true);
                }}
                className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 font-bold text-xs uppercase rounded-xl"
              >
                + Novo App Global
              </button>
            </div>

            {isAppFormOpen && (
              <form onSubmit={(e) => {
                e.preventDefault();
                onAddApp({
                  name: appName,
                  platform: appPlatform,
                  subtitle: appSubtitle || 'App Zuxo Player',
                  version: appVersion,
                  status: 'ativo',
                  downloadUrl: appDownloadUrl || undefined,
                  iconUrl: appIconUrl || undefined,
                  pairingCode: appPairingCode || undefined,
                  instructions: ['Instale e acesse com seus dados de login'],
                });
                setIsAppFormOpen(false);
                setAppName('');
                setAppIconUrl('');
                setAppDownloadUrl('');
                setAppPairingCode('');
                showNotification('App adicionado ao catálogo geral!');
              }} className="bg-[#091d15] border border-emerald-600/50 p-6 rounded-3xl space-y-4 text-xs">
                <h4 className="text-sm font-bold text-white">Novo App no Catálogo Global</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nome do App *:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Zuxo Player para Android"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Plataforma:</label>
                    <select
                      value={appPlatform}
                      onChange={(e) => setAppPlatform(e.target.value as any)}
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                    >
                      <option value="android">Android (Play Store / APK)</option>
                      <option value="ios">iOS / iPadOS (App Store)</option>
                      <option value="smart-tv">Smart TV (LG / Samsung / Roku)</option>
                      <option value="tv-box">FireStick / TV Box</option>
                      <option value="windows">Windows PC (Microsoft Store)</option>
                      <option value="web">Web / macOS</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subtítulo (descrição curta):</label>
                  <input
                    type="text"
                    placeholder="Ex: Google Play Store Oficial (Celulares e Tablets)"
                    value={appSubtitle}
                    onChange={(e) => setAppSubtitle(e.target.value)}
                    className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">URL da Logo / Ícone do App:</label>
                    <input
                      type="url"
                      placeholder="https://... (imagem do ícone do app)"
                      value={appIconUrl}
                      onChange={(e) => setAppIconUrl(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#00F59B]"
                    />
                    {appIconUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={appIconUrl} alt="Preview" className="w-10 h-10 rounded-xl object-cover border border-emerald-800" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        <span className="text-[10px] text-emerald-400">Preview do ícone</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Link de Download (Play Store / App Store):</label>
                    <input
                      type="url"
                      placeholder="https://play.google.com/... ou https://apps.apple.com/..."
                      value={appDownloadUrl}
                      onChange={(e) => setAppDownloadUrl(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#00F59B]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código de Pareamento / Downloader (opcional):</label>
                  <input
                    type="text"
                    placeholder="Ex: Código Downloader: 84920"
                    value={appPairingCode}
                    onChange={(e) => setAppPairingCode(e.target.value)}
                    className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white outline-none focus:border-[#00F59B]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-emerald-950">
                  <button type="button" onClick={() => setIsAppFormOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" className="px-5 py-2 bg-[#00F59B] text-slate-950 font-bold rounded-xl">Salvar no Catálogo</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map((app) => (
                <div key={app.id} className="p-4 bg-[#0a1e16] border border-emerald-950 hover:border-emerald-700/60 rounded-2xl flex items-start gap-3 transition-all group">
                  {/* Logo */}
                  <div className="w-14 h-14 rounded-2xl bg-[#061510] border border-emerald-900/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {app.iconUrl ? (
                      <img src={app.iconUrl} alt={app.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
                    ) : (
                      <span className="text-2xl">
                        {app.platform === 'android' ? '🤖' : app.platform === 'ios' ? '🍎' : app.platform === 'smart-tv' ? '📺' : app.platform === 'tv-box' ? '📦' : app.platform === 'windows' ? '🖥️' : '🌐'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate">{app.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{app.subtitle}</p>
                      </div>
                      <button onClick={() => onDeleteApp(app.id)} className="p-1.5 text-red-400 hover:text-white hover:bg-red-950/60 rounded-lg transition-colors flex-shrink-0" title="Remover do catálogo">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        app.platform === 'android' ? 'bg-green-950 text-green-300 border border-green-800' :
                        app.platform === 'ios' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                        app.platform === 'smart-tv' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        app.platform === 'tv-box' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                        app.platform === 'windows' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                        'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {app.platform === 'android' ? 'Android' : app.platform === 'ios' ? 'iOS' : app.platform === 'smart-tv' ? 'Smart TV' : app.platform === 'tv-box' ? 'TV Box' : app.platform === 'windows' ? 'Windows' : 'Web'}
                      </span>
                      {app.downloadUrl && (
                        <a href={app.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-[#00F59B] transition-colors">
                          <ExternalLink className="w-3 h-3" />
                          Loja
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================== */}
        {/* TAB 4: GRADE DE PROGRAMAÇÃO                                            */}
        {/* ====================================================================== */}
        {activeAdminTab === 'guide' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Grade de Programação do Dia
                </h3>
                <p className="text-xs text-slate-400">
                  Jogos e programas exibidos na tela dos clientes
                </p>
              </div>

              <button
                onClick={() => setIsProgFormOpen(true)}
                className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-[#00F59B] text-slate-950 font-bold text-xs uppercase rounded-xl"
              >
                + Adicionar Programa
              </button>
            </div>

            {isProgFormOpen && (
              <form onSubmit={(e) => {
                e.preventDefault();
                onAddProgram({
                  channelName: progChannel,
                  channelLogo: progLogo,
                  category: progCategory,
                  time: progTime,
                  title: progTitle,
                  description: progDesc || 'Transmissão em alta definição',
                  badge: progBadge || undefined,
                  isLive: progIsLive,
                  progress: progIsLive ? 50 : undefined,
                });
                setIsProgFormOpen(false);
                setProgTitle('');
                showNotification('Evento adicionado à grade!');
              }} className="bg-[#091d15] border border-emerald-600/50 p-6 rounded-3xl space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Canal:</label>
                    <input
                      type="text"
                      required
                      value={progChannel}
                      onChange={(e) => setProgChannel(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Horário:</label>
                    <input
                      type="text"
                      required
                      value={progTime}
                      onChange={(e) => setProgTime(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Título do Evento:</label>
                    <input
                      type="text"
                      required
                      value={progTitle}
                      onChange={(e) => setProgTitle(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-900 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsProgFormOpen(false)} className="px-4 py-2 bg-slate-800 rounded-xl">Cancelar</button>
                  <button type="submit" className="px-5 py-2 bg-[#00F59B] text-slate-950 font-bold rounded-xl">Salvar</button>
                </div>
              </form>
            )}

            <div className="bg-[#0a1e16] border border-emerald-950 rounded-3xl divide-y divide-emerald-950/70">
              {programs.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#00F59B] w-12">{p.time}</span>
                    <span className="text-lg">{p.channelLogo}</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">{p.title}</h4>
                      <p className="text-xs text-slate-400">{p.channelName}</p>
                    </div>
                  </div>
                  <button onClick={() => onDeleteProgram(p.id)} className="p-2 text-red-400 hover:text-white">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: GATEWAY EFÍ BANK PIX (STATUS, SECRETS & TESTES) */}
        {activeAdminTab === 'gateway' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#061e14] via-[#04150e] to-[#020b07] border border-emerald-500/40 rounded-3xl shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Zap className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white font-display">
                      Gateway Oficial PIX - Efí Bank
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-[#00F59B] border border-emerald-800">
                      Operacional
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Integração com Efí Bank (ex-Gerencianet) configurada com as Secrets oficiais e geração dinâmica de QR Code Banco Central.
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  soundEffects.playClick();
                  setIsCheckingEfiConfig(true);
                  try {
                    const cfg = await getEfiGatewayConfig();
                    setEfiGatewayInfo(cfg);
                    setNotification('Configuração do Efí Bank validada com sucesso!');
                    setTimeout(() => setNotification(null), 3000);
                  } finally {
                    setIsCheckingEfiConfig(false);
                  }
                }}
                disabled={isCheckingEfiConfig}
                className="px-4 py-2.5 bg-[#0a2016] hover:bg-[#0f2e21] border border-emerald-600/50 text-[#00F59B] text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingEfiConfig ? 'animate-spin' : ''}`} />
                {isCheckingEfiConfig ? 'Verificando...' : 'Revalidar Credenciais'}
              </button>
            </div>

            {/* STATUS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CHAVE PIX */}
              <div className="p-5 bg-[#0a1e16] border border-emerald-950 rounded-3xl space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold flex items-center gap-1.5 text-slate-300">
                    <Key className="w-4 h-4 text-[#00F59B]" /> Chave PIX Efí
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                    EVP Oficial
                  </span>
                </div>
                <div className="p-3 bg-[#05130d] border border-emerald-900/60 rounded-2xl font-mono text-xs text-emerald-300 break-all select-all">
                  {efiGatewayInfo?.pixKey || EFIBANK_OFFICIAL_PIX_KEY}
                </div>
                <p className="text-[11px] text-slate-400">
                  Vinculada à conta titular do Efí Bank (Lucas Sousa / Zuxo). Recebe pagamentos imediatos.
                </p>
              </div>

              {/* CLIENT ID */}
              <div className="p-5 bg-[#0a1e16] border border-emerald-950 rounded-3xl space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold flex items-center gap-1.5 text-slate-300">
                    <Lock className="w-4 h-4 text-amber-400" /> Autenticação Efí
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
                    OAuth2
                  </span>
                </div>
                <div className="p-3 bg-[#05130d] border border-emerald-900/60 rounded-2xl font-mono text-xs text-slate-300 truncate">
                  {efiGatewayInfo?.clientIdMasked || 'Client_Id_62a2...4df4'}
                </div>
                <p className="text-[11px] text-slate-400">
                  Client ID e Client Secret carregados nas variáveis de ambiente seguras do servidor.
                </p>
              </div>

              {/* AMBIENTE */}
              <div className="p-5 bg-[#0a1e16] border border-emerald-950 rounded-3xl space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold flex items-center gap-1.5 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-[#00F59B]" /> Modo de Execução
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-[#00F59B] border border-emerald-800/60">
                    {efiGatewayInfo?.sandbox ? 'Sandbox (Homologação)' : 'Produção'}
                  </span>
                </div>
                <div className="p-3 bg-[#05130d] border border-emerald-900/60 rounded-2xl text-xs text-slate-300 flex items-center justify-between">
                  <span>Webhook Endpoint:</span>
                  <span className="font-mono text-[11px] text-emerald-400">/api/pix/webhook</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Conciliação automática ativa: faturas são quitadas instantaneamente ao receber o push.
                </p>
              </div>
            </div>

            {/* TESTER INTERATIVO DE COBRANÇA PIX */}
            <div className="p-6 bg-[#0a1e16] border border-emerald-900/70 rounded-3xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-emerald-950">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Simulador & Testador de Cobrança PIX Efí Bank
                  </h4>
                  <p className="text-xs text-slate-400">
                    Gere uma cobrança PIX imediata de teste para inspecionar o payload EMV, o QR Code e simular o webhook.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Valor da Cobrança de Teste (R$):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={testPixAmount}
                      onChange={(e) => setTestPixAmount(e.target.value)}
                      className="w-full bg-[#05130d] border border-emerald-800/80 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:border-[#00F59B] outline-none"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      soundEffects.playSelect();
                      setEfiTestStatus('Gerando cobrança no gateway Efí Bank...');
                      try {
                        const res = await fetch('/api/pix/create-charge', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            amount: parseFloat(testPixAmount) || 35.0,
                            clientName: 'Teste Administrador',
                            description: 'Teste Efí Bank Admin Panel'
                          })
                        });
                        const data = await res.json();
                        setGeneratedTestCharge(data);
                        setEfiTestStatus(`Cobrança criada com sucesso! TXID: ${data.txid}`);
                        if (onAddSystemLog) {
                          onAddSystemLog({
                            action: 'price_change',
                            severity: 'info',
                            title: 'Cobrança Efí Bank Gerada',
                            adminUser: 'Admin Master',
                            description: `Cobrança de teste Efí Bank gerada: R$ ${testPixAmount} (TXID ${data.txid})`
                          });
                        }
                      } catch (err: any) {
                        setEfiTestStatus(`Erro: ${err.message}`);
                      }
                    }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-[#00F59B] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Gerar Cobrança PIX de Teste
                  </button>

                  {generatedTestCharge && (
                    <button
                      onClick={async () => {
                        soundEffects.playSelect();
                        setEfiTestStatus('Simulando pagamento no Sandbox Efí Bank...');
                        try {
                          const res = await fetch('/api/pix/simulate-pay', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ txid: generatedTestCharge.txid })
                          });
                          const data = await res.json();
                          setEfiTestStatus(`Pagamento CONFIRMADO no Sandbox Efí Bank às ${new Date().toLocaleTimeString('pt-BR')}!`);
                          if (onAddSystemLog) {
                            onAddSystemLog({
                              action: 'subscription_renewal',
                              severity: 'info',
                              title: 'Pagamento Efí Bank Confirmado',
                              adminUser: 'Admin Master (Sandbox)',
                              description: `Pagamento simulado no Efí Bank com sucesso (TXID: ${generatedTestCharge.txid})`
                            });
                          }
                        } catch (err: any) {
                          setEfiTestStatus(`Erro ao simular: ${err.message}`);
                        }
                      }}
                      className="w-full py-2.5 bg-[#1c1808] hover:bg-[#28220c] border border-amber-600/60 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" /> Simular Baixa Automática no Sandbox
                    </button>
                  )}

                  {efiTestStatus && (
                    <div className="p-3 bg-[#05130d] border border-emerald-900/60 rounded-xl text-xs text-emerald-300 font-mono">
                      {efiTestStatus}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-7 bg-[#05130d] border border-emerald-950 p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[220px]">
                  {generatedTestCharge?.qrCodeDataUrl ? (
                    <div className="space-y-3 w-full flex flex-col items-center">
                      <div className="bg-white p-3 rounded-2xl shadow-lg border-2 border-emerald-500 inline-block">
                        <img
                          src={generatedTestCharge.qrCodeDataUrl}
                          alt="QR Code Teste Efí Bank"
                          className="w-44 h-44 object-contain"
                        />
                      </div>
                      <div className="w-full text-left space-y-1">
                        <span className="text-[11px] text-slate-400 font-bold">PIX Copia e Cola EMV:</span>
                        <input
                          type="text"
                          readOnly
                          value={generatedTestCharge.pixCopiaECola}
                          className="w-full bg-[#030907] border border-emerald-900/60 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-emerald-300 truncate"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs py-8 space-y-2">
                      <Zap className="w-8 h-8 mx-auto text-slate-600" />
                      <p>Clique em "Gerar Cobrança PIX de Teste" para visualizar o QR Code dinâmico e o código EMV gerado pelo gateway.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: WHATSAPP BOT — ALERTAS DE COMPROVANTE */}
        {activeAdminTab === 'whatsapp' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#061e14] via-[#04150e] to-[#020b07] border border-emerald-500/40 rounded-3xl shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 flex-shrink-0">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white font-display">WhatsApp Bot — Atendimento IA</h3>
                  <p className="text-slate-400 text-sm mt-0.5">Instância <span className="text-[#00F59B] font-bold">zuxo-atendimento</span> • DeepSeek AI ativo</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-950/60 border border-green-700/40 text-green-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Conectado
                </span>
                <a
                  href="http://evo-l9pie3sleu8t5tachkm22fq1.169.58.45.200.sslip.io/manager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a1e16] border border-emerald-800/40 text-slate-400 hover:text-white text-xs font-bold transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Manager
                </a>
              </div>
            </div>

            {/* Alertas de Comprovante */}
            <div className="bg-[#040f0a] border border-emerald-900/40 rounded-3xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-900/40 bg-[#061008]/60">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#00F59B]" />
                  <span className="text-sm font-black text-white uppercase tracking-wider">Comprovantes Recebidos</span>
                  {waAlerts.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                      {waAlerts.length} novo{waAlerts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {waAlerts.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-slate-600">
                  <MessageSquare className="w-10 h-10" />
                  <p className="text-sm font-medium">Nenhum comprovante pendente</p>
                  <p className="text-xs">Quando um cliente enviar um comprovante pelo WhatsApp, aparecerá aqui</p>
                </div>
              ) : (
                <div className="divide-y divide-emerald-900/30">
                  {waAlerts.map((alert) => (
                    <div key={alert.id} className="p-5 flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-emerald-950/20 transition-colors">
                      {/* Avatar / ícone */}
                      <div className="w-11 h-11 rounded-2xl bg-green-900/30 border border-green-800/40 flex items-center justify-center text-green-400 flex-shrink-0">
                        <MessageSquare className="w-5 h-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-white font-black text-sm">{alert.clientName}</span>
                          <span className="text-slate-500 text-xs font-mono">{alert.clientPhone.replace('@s.whatsapp.net', '')}</span>
                          <span className="text-slate-600 text-[10px]">{new Date(alert.createdAt).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed bg-slate-900/40 rounded-xl px-3 py-2 border border-slate-800/40">
                          🤖 <span className="text-slate-300">{alert.aiAnalysis}</span>
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={`/api/whatsapp/alerts/${alert.id}/image`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:text-white text-xs font-bold transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver
                        </a>
                        <button
                          onClick={() => dismissWaAlert(alert.id)}
                          disabled={waDismissing.has(alert.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-[#00F59B] hover:bg-emerald-900/40 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Verificado
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Instruções */}
            <div className="p-5 bg-[#040f0a] border border-emerald-900/30 rounded-2xl text-xs text-slate-500 space-y-1">
              <p className="font-bold text-slate-400 mb-2">ℹ️ Como funciona</p>
              <p>• Clientes enviam mensagens no WhatsApp do número conectado</p>
              <p>• <span className="text-slate-400">Texto</span>: DeepSeek responde automaticamente sobre planos, instalação de apps, dúvidas gerais</p>
              <p>• <span className="text-slate-400">Imagem</span>: IA analisa se é comprovante de pagamento — se for, aparece aqui e o cliente recebe confirmação</p>
              <p>• Clique em <span className="text-[#00F59B]">Verificado</span> após confirmar o pagamento no sistema</p>
            </div>
          </div>
        )}

        {/* TAB 10: SERVIDOR IPTV — WMANAGE */}
        {activeAdminTab === 'wmanage' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#061e14] via-[#04150e] to-[#020b07] border border-cyan-500/40 rounded-3xl shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                  <Server className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white font-display">Servidor IPTV — WManage</h3>
                  <p className="text-slate-400 text-sm mt-0.5">Gerencie clientes, renovações e ativações diretamente do servidor</p>
                </div>
              </div>
              <button
                onClick={() => fetchWzClients(wzPage, wzSearch, wzFilter)}
                disabled={wzLoading}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-300 text-sm font-bold hover:bg-cyan-500/30 transition disabled:opacity-50"
              >
                <RefreshCcw className={`w-4 h-4 ${wzLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {/* Filtros e busca */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Buscar por usuário, WhatsApp ou notas..."
                value={wzSearch}
                onChange={(e) => setWzSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchWzClients(1, wzSearch, wzFilter)}
                className="flex-1 bg-[#05130d] border border-emerald-800/80 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-[#00F59B] outline-none"
              />
              <div className="flex gap-2 flex-wrap">
                {(['all', 'expiring', 'expired', 'blocked'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setWzFilter(f); setWzPage(1); fetchWzClients(1, wzSearch, f); }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition ${wzFilter === f ? 'bg-cyan-500 text-slate-950' : 'bg-[#0a1e16] text-slate-400 hover:text-white'}`}
                  >
                    {f === 'all' ? 'Todos' : f === 'expiring' ? '⚠ Vencendo em 7d' : f === 'expired' ? '✗ Expirados' : '🔒 Bloqueados'}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de clientes */}
            {wzLoading ? (
              <div className="text-center py-16 text-slate-500">
                <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-500" />
                <p>Carregando clientes do servidor...</p>
              </div>
            ) : wzClients === null ? (
              <div className="text-center py-16 text-slate-500">
                <Server className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Clique em <strong>Atualizar</strong> para carregar os clientes</p>
              </div>
            ) : wzClients.total === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p>Nenhum cliente encontrado com os filtros atuais.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  {wzClients.total} clientes • Página {wzClients.actualPage}/{wzClients.pagesQuantity}
                </p>
                {wzClients.items.map((c) => {
                  const expDate = new Date(c.exp_date);
                  const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / 86400000);
                  const isExpired = daysLeft < 0;
                  const isClose = daysLeft >= 0 && daysLeft <= 7;
                  const isBlocked = c.status === 0;
                  return (
                    <div key={c.id} className="p-4 bg-[#040f0a] border border-emerald-900/40 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{c.username}</span>
                            {isBlocked && <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">Bloqueado</span>}
                            {isExpired && !isBlocked && <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">Expirado</span>}
                            {isClose && !isExpired && !isBlocked && <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">Vence em {daysLeft}d</span>}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 space-x-3">
                            {c.whatsapp && <span>📱 {c.whatsapp}</span>}
                            <span>📅 {expDate.toLocaleDateString('pt-BR')}</span>
                            {c.plan?.name && <span>📦 {c.plan.name}</span>}
                            {c.notes && <span>📝 {c.notes}</span>}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">ID: {c.id}</div>
                      </div>

                      {/* Ações */}
                      <div className="flex flex-wrap gap-2 items-center">
                        {/* Renovar */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            placeholder="dias"
                            value={wzExtendDays[c.id] || ''}
                            onChange={(e) => setWzExtendDays((p) => ({ ...p, [c.id]: e.target.value }))}
                            className="w-16 bg-[#05130d] border border-emerald-800/60 rounded-lg px-2 py-1.5 text-white text-xs focus:border-[#00F59B] outline-none"
                          />
                          <button
                            onClick={() => wzAction(c.id, 'Renovando...', `/api/wmanage/clients/${c.id}/extend`, { days: parseInt(wzExtendDays[c.id] || '30') })}
                            disabled={!!wzActionStatus[c.id]}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition disabled:opacity-50"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Renovar
                          </button>
                        </div>

                        {/* +48h */}
                        <button
                          onClick={() => wzAction(c.id, '+48h...', `/api/wmanage/clients/${c.id}/add48h`)}
                          disabled={!!wzActionStatus[c.id]}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 border border-blue-500/40 rounded-lg text-blue-300 text-xs font-bold hover:bg-blue-500/30 transition disabled:opacity-50"
                        >
                          <Timer className="w-3.5 h-3.5" />
                          +48h
                        </button>

                        {/* Bloquear / Desbloquear */}
                        {isBlocked ? (
                          <button
                            onClick={() => wzAction(c.id, 'Desbloqueando...', `/api/wmanage/clients/${c.id}/unblock`)}
                            disabled={!!wzActionStatus[c.id]}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 border border-green-500/40 rounded-lg text-green-300 text-xs font-bold hover:bg-green-500/30 transition disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Desbloquear
                          </button>
                        ) : (
                          <button
                            onClick={() => wzAction(c.id, 'Bloqueando...', `/api/wmanage/clients/${c.id}/block`)}
                            disabled={!!wzActionStatus[c.id]}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-xs font-bold hover:bg-red-500/30 transition disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Bloquear
                          </button>
                        )}

                        {/* Status feedback */}
                        {wzActionStatus[c.id] && (
                          <span className="text-xs text-cyan-400 font-mono animate-pulse">{wzActionStatus[c.id]}</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Paginação */}
                {wzClients.pagesQuantity > 1 && (
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      disabled={wzPage <= 1}
                      onClick={() => { const p = wzPage - 1; setWzPage(p); fetchWzClients(p); }}
                      className="px-4 py-2 bg-[#0a1e16] text-slate-400 rounded-xl text-xs disabled:opacity-30 hover:text-white transition"
                    >← Anterior</button>
                    <span className="px-4 py-2 text-xs text-slate-500">{wzPage} / {wzClients.pagesQuantity}</span>
                    <button
                      disabled={wzPage >= wzClients.pagesQuantity}
                      onClick={() => { const p = wzPage + 1; setWzPage(p); fetchWzClients(p); }}
                      className="px-4 py-2 bg-[#0a1e16] text-slate-400 rounded-xl text-xs disabled:opacity-30 hover:text-white transition"
                    >Próxima →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
