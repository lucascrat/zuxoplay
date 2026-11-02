import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { PushNotification, UserProfile, Invoice, NotificationType } from '../types';
import { displaySystemPushNotification } from './fcmService';

const NOTIFICATIONS_COLLECTION = 'notifications';

// Initial sample notifications for demonstration and history
export const INITIAL_NOTIFICATIONS: PushNotification[] = [
  {
    id: 'notif-1',
    clientId: 'usr-4',
    clientName: 'Juliana Costa',
    title: '📄 Nova Fatura Gerada (4 Telas)',
    body: 'Fatura de R$ 75,00 disponível para pagamento via PIX referente ao Plano Ultra 4 Telas.',
    type: 'new_invoice',
    status: 'delivered',
    read: false,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    invoiceAmount: 75.00,
    dueDate: '10/04/2026',
    deliveryChannel: 'fcm',
    isAutomated: true,
  },
  {
    id: 'notif-2',
    clientId: 'usr-3',
    clientName: 'Carlos Mendes',
    title: '⚠️ Aviso de Vencimento Próximo',
    body: 'Seu plano básico vence em breve. Renove agora para evitar a interrupção do seu sinal.',
    type: 'expiration_warning',
    status: 'delivered',
    read: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    invoiceAmount: 30.00,
    dueDate: '05/05/2026',
    deliveryChannel: 'fcm',
    isAutomated: true,
  },
  {
    id: 'notif-3',
    clientId: 'usr-1',
    clientName: 'Lucas Sousa',
    title: '🚀 Notificações Push FCM Conectadas',
    body: 'Seu dispositivo agora recebe alertas instantâneos de novas faturas e renovações do Zuxo Player.',
    type: 'custom',
    status: 'delivered',
    read: true,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    deliveryChannel: 'fcm',
    isAutomated: false,
  }
];

/**
 * Real-time listener for all push notifications in Firestore
 */
export function subscribeNotifications(
  onData: (notifications: PushNotification[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, NOTIFICATIONS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onData(INITIAL_NOTIFICATIONS);
        return;
      }
      const list: PushNotification[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as PushNotification);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, NOTIFICATIONS_COLLECTION);
    }
  );
}

/**
 * Seeds initial notifications if empty
 */
export async function seedInitialNotifications(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, NOTIFICATIONS_COLLECTION));
    if (snap.empty) {
      for (const notif of INITIAL_NOTIFICATIONS) {
        await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notif.id), notif);
      }
    }
  } catch (err) {
    console.warn('Initial notifications seed note:', err);
  }
}

/**
 * Dispatches a push notification via FCM and persists in Firestore
 */
export async function sendPushNotification(
  notificationData: Omit<PushNotification, 'id'>,
  currentUserId?: string
): Promise<PushNotification> {
  const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const notification: PushNotification = {
    ...notificationData,
    id,
    fcmMessageId: `fcm-msg-${Date.now()}`,
    status: 'delivered',
  };

  const path = `${NOTIFICATIONS_COLLECTION}/${id}`;
  try {
    await setDoc(doc(db, NOTIFICATIONS_COLLECTION, id), notification);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  // Trigger browser push and sound if message targets all clients or the active user
  const shouldNotifyLocally = 
    notification.clientId === 'all' || 
    (currentUserId && notification.clientId === currentUserId);

  if (shouldNotifyLocally) {
    displaySystemPushNotification(notification.title, notification.body, {
      tag: notification.type,
      data: {
        notificationId: notification.id,
        clientId: notification.clientId,
        type: notification.type,
        dueDate: notification.dueDate,
        invoiceAmount: notification.invoiceAmount,
      }
    });
  }

  return notification;
}

/**
 * Marks a notification as read
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  const path = `${NOTIFICATIONS_COLLECTION}/${id}`;
  try {
    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, id), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Deletes a notification from Firestore
 */
export async function deleteNotification(id: string): Promise<void> {
  const path = `${NOTIFICATIONS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Helper to parse dates like "15/05/2026" or "2026-05-15"
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;

  // DD/MM/YYYY
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }

  // YYYY-MM-DD
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Calculates days remaining until expiration date
 */
export function calculateDaysRemaining(expirationDateStr: string): number {
  const expDate = parseDateString(expirationDateStr);
  if (!expDate) return 999;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates new expiration date string advancing by N days
 */
export function addDaysToDateString(dateStr: string, daysToAdd: number = 30): string {
  const current = parseDateString(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const baseDate = current && !isNaN(current.getTime()) ? current : today;
  // If the date is already expired in the past, renew from today
  const startingDate = baseDate.getTime() < today.getTime() ? today : baseDate;

  const result = new Date(startingDate);
  result.setDate(result.getDate() + daysToAdd);

  const dd = String(result.getDate()).padStart(2, '0');
  const mm = String(result.getMonth() + 1).padStart(2, '0');
  const yyyy = result.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export interface AutomatedAlertResult {
  totalClientsChecked: number;
  alertsSent: number;
  details: {
    clientName: string;
    type: NotificationType;
    message: string;
  }[];
}

/**
 * AUTOMATED NOTIFICATION ENGINE:
 * Scans all clients for upcoming expirations (within 3 days) or pending invoices,
 * and automatically dispatches FCM push alerts.
 */
export async function checkAndSendAutomatedAlerts(
  clients: UserProfile[],
  existingNotifications: PushNotification[] = [],
  currentUserId?: string
): Promise<AutomatedAlertResult> {
  const result: AutomatedAlertResult = {
    totalClientsChecked: clients.length,
    alertsSent: 0,
    details: []
  };

  const now = new Date();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const client of clients) {
    const daysRemaining = calculateDaysRemaining(client.expirationDate);

    // Check if client already received an automated alert within the last 24h for the same category
    const hasRecentAlert = (type: NotificationType) => {
      return existingNotifications.some((n) => {
        if (n.clientId !== client.id || n.type !== type) return false;
        const alertTime = new Date(n.createdAt).getTime();
        return (now.getTime() - alertTime) < ONE_DAY_MS;
      });
    };

    // 1. ALERT: Plan Expired or Due Today
    if (daysRemaining <= 0 || client.status === 'expirado') {
      if (!hasRecentAlert('plan_expired')) {
        const title = `🚨 Seu Plano Zuxo Venceu - Renove seu Acesso`;
        const body = `Olá ${client.name}, seu plano de ${client.screens} tela(s) venceu em ${client.expirationDate}. Renove agora via PIX por R$ ${client.customPrice.toFixed(2).replace('.', ',')} para restabelecer seu sinal.`;

        await sendPushNotification({
          clientId: client.id,
          clientName: client.name,
          title,
          body,
          type: 'plan_expired',
          status: 'delivered',
          read: false,
          createdAt: now.toISOString(),
          dueDate: client.expirationDate,
          invoiceAmount: client.customPrice,
          deliveryChannel: 'fcm',
          isAutomated: true,
        }, currentUserId);

        result.alertsSent++;
        result.details.push({
          clientName: client.name,
          type: 'plan_expired',
          message: 'Alerta de plano vencido disparado.'
        });
      }
    }
    // 2. ALERT: Plan Expiring Soon (Within 1 to 5 days)
    else if (daysRemaining <= 5) {
      if (!hasRecentAlert('expiration_warning')) {
        const title = `⚠️ Vencimento Próximo: Vence em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`;
        const body = `Olá ${client.name}! Sua assinatura vence dia ${client.expirationDate}. Evite bloqueios renovando antecipadamente via PIX (R$ ${client.customPrice.toFixed(2).replace('.', ',')}).`;

        await sendPushNotification({
          clientId: client.id,
          clientName: client.name,
          title,
          body,
          type: 'expiration_warning',
          status: 'delivered',
          read: false,
          createdAt: now.toISOString(),
          dueDate: client.expirationDate,
          invoiceAmount: client.customPrice,
          deliveryChannel: 'fcm',
          isAutomated: true,
        }, currentUserId);

        result.alertsSent++;
        result.details.push({
          clientName: client.name,
          type: 'expiration_warning',
          message: `Alerta de vencimento em ${daysRemaining} dias enviado.`
        });
      }
    }

    // 3. ALERT: Pending Invoice Alert
    if (client.status === 'pendente') {
      if (!hasRecentAlert('new_invoice')) {
        const title = `📄 Nova Fatura Pendente - Zuxo Player`;
        const body = `Fatura no valor de R$ ${client.customPrice.toFixed(2).replace('.', ',')} gerada para ${client.screens} tela(s). Clique para ver a chave PIX e efetuar o pagamento.`;

        await sendPushNotification({
          clientId: client.id,
          clientName: client.name,
          title,
          body,
          type: 'new_invoice',
          status: 'delivered',
          read: false,
          createdAt: now.toISOString(),
          dueDate: client.expirationDate,
          invoiceAmount: client.customPrice,
          deliveryChannel: 'fcm',
          isAutomated: true,
        }, currentUserId);

        result.alertsSent++;
        result.details.push({
          clientName: client.name,
          type: 'new_invoice',
          message: 'Alerta de nova fatura pendente enviado.'
        });
      }
    }
  }

  return result;
}
