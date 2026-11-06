export interface Channel {
  id: string;
  name: string;
  category: string;
  logo: string;
  streamUrl: string;
  currentProgram: string;
  nextProgram: string;
  programProgress: number;
  resolution: '4K' | 'FHD' | 'HD';
  isFavorite?: boolean;
}

export interface MediaItem {
  id: string;
  title: string;
  type: 'movie' | 'series';
  year: number;
  duration?: string;
  seasons?: number;
  rating: number;
  category: string;
  poster: string;
  backdrop: string;
  synopsis: string;
  streamUrl: string;
  isFavorite?: boolean;
  addedRecently?: boolean;
}

export interface ServerOption {
  id: string;
  name: string;
  location: string;
  ping: number;
  status: 'online' | 'busy';
}

export interface TrailerItem {
  id: string;
  title: string;
  category: string;
  year: number;
  videoUrl: string;
  poster: string;
  synopsis: string;
  likes: number;
  shares: number;
  views: number;
  isLiked?: boolean;
  featuredTag?: string;
  createdAt?: string;
  type?: 'filme' | 'serie' | 'lancamento' | 'aguardado';
  streamingPlatform?: 'Netflix' | 'Max' | 'Prime Video' | 'Disney+' | 'Cinema 4K' | 'Apple TV+' | 'Paramount+' | 'Zuxo VIP';
}

export interface ClientApp {
  id: string;
  name: string;
  platform: 'ios' | 'android' | 'smart-tv' | 'tv-box' | 'windows' | 'web';
  subtitle: string;
  version: string;
  status: 'ativo' | 'disponivel' | 'em_breve' | 'atualizacao';
  downloadUrl?: string;
  iconUrl?: string;
  pairingCode?: string;
  instructions: string[];
}

export interface ProgramItem {
  id: string;
  channelName: string;
  channelLogo: string;
  category: 'Esportes' | 'Filmes & Séries' | 'Canais Abertos' | 'Notícias' | 'Documentários' | 'Infantil';
  time: string;
  endTime?: string;
  title: string;
  description: string;
  isLive?: boolean;
  progress?: number;
  badge?: string;
  date?: string;
  dayOfWeek?: string;
}

export interface PaymentPlan {
  id: string;
  name: string;
  period: string;
  price: number;
  screens: number;
  features: string[];
  recommended?: boolean;
}

export interface Invoice {
  id: string;
  description: string;
  date: string;
  amount: number;
  status: 'pago' | 'pendente';
  paymentMethod: string;
  dueDate?: string;
  pixKey?: string;
  pixCode?: string;
  clientId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  avatar: string;
  plan: string;
  expirationDate: string;
  screens: number; // quantidade de telas liberadas pelo admin
  customPrice: number; // valor individual a pagar definido pelo admin
  customApps: ClientApp[]; // apps personalizados liberados para cada cliente
  username?: string;
  password?: string;
  provider?: string; // Provedor / Servidor DNS do Zuxo Player
  status: 'ativo' | 'pendente' | 'expirado';
  notes?: string;
  createdAt: string;
  fcmToken?: string;
  fcmEnabled?: boolean;
  lastNotificationSentAt?: string;
}

export type NotificationType = 'expiration_warning' | 'new_invoice' | 'plan_expired' | 'custom';

export interface PushNotification {
  id: string;
  clientId: string; // Target client ID or 'all'
  clientName: string;
  title: string;
  body: string;
  type: NotificationType;
  status: 'sent' | 'delivered' | 'failed';
  read: boolean;
  createdAt: string;
  dueDate?: string;
  invoiceAmount?: number;
  fcmMessageId?: string;
  deliveryChannel: 'fcm' | 'in_app' | 'browser_push';
  isAutomated?: boolean;
}

export type ViewScreen = 
  | 'trailer-feed'
  | 'customer-portal'
  | 'daily-guide'
  | 'admin-panel'
  | 'auth-screen';

export type SystemLogAction = 
  | 'client_delete'
  | 'price_change'
  | 'subscription_renewal'
  | 'client_create'
  | 'client_update'
  | 'notification_sent'
  | 'system_reset';

export type SystemLogSeverity = 'critical' | 'warning' | 'info';

export interface SystemLog {
  id: string;
  action: SystemLogAction;
  severity: SystemLogSeverity;
  title: string;
  description: string;
  timestamp: string; // ISO string
  adminUser?: string; // e.g. 'Administrador (Mestre)'
  targetClientId?: string;
  targetClientName?: string;
  details?: {
    previousPrice?: number;
    newPrice?: number;
    previousExpiration?: string;
    newExpiration?: string;
    screens?: number;
    email?: string;
    provider?: string;
    username?: string;
    reason?: string;
    daysAdded?: number;
    meta?: Record<string, any>;
  };
}
