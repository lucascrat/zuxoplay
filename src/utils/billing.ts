import { Invoice, UserProfile } from '../types';
import { calculateDaysRemaining } from '../services/notificationService';

// A renewal is shown as due from this many days before the expiration date.
const RENEWAL_WINDOW_DAYS = 5;

/**
 * Invoices of one client: the payments recorded in their profile plus, when the plan is
 * about to expire or has expired, one pending renewal. Nothing here depends on the device.
 */
export function buildClientInvoices(user: UserProfile | null): Invoice[] {
  if (!user) return [];
  const paid = (user.payments || []).map((p) => ({ ...p, status: 'pago' as const }));
  const daysLeft = calculateDaysRemaining(user.expirationDate);
  const needsRenewal = user.status !== 'ativo' || daysLeft <= RENEWAL_WINDOW_DAYS;
  if (!needsRenewal) return paid;

  const pending: Invoice = {
    id: `renew-${user.id}-${user.expirationDate}`,
    description: `Renovação da assinatura (${user.screens} ${user.screens === 1 ? 'tela' : 'telas'})`,
    date: new Date().toLocaleDateString('pt-BR'),
    dueDate: user.expirationDate,
    amount: user.customPrice > 0 ? user.customPrice : 35,
    status: 'pendente',
    paymentMethod: 'PIX Efí Bank',
    clientId: user.id,
  };
  return [pending, ...paid];
}
