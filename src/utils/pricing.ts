import type { PaymentPlan, PlanDiscount } from '../types';

// Price rules shared by the client area (what is shown) and the server (what is charged).

export interface PriceResult {
  /** what the client pays */
  price: number;
  /** price before the attendant's discount */
  original: number;
  discount: PlanDiscount | null;
  saving: number;
}

/** The attendant's discount on a plan, when it exists, is valid and this client is among those who get it. */
export function discountFor(plan: Pick<PaymentPlan, 'price' | 'discount'>, clientId?: string | null): PlanDiscount | null {
  const d = plan.discount;
  if (!d || !(d.price > 0) || !(d.price < plan.price) || !d.attendant) return null;
  if (d.clientIds && d.clientIds.length > 0 && (!clientId || !d.clientIds.includes(clientId))) return null;
  return d;
}

export function planPriceFor(plan: Pick<PaymentPlan, 'price' | 'discount'>, clientId?: string | null): PriceResult {
  const discount = discountFor(plan, clientId);
  const price = discount ? discount.price : plan.price;
  return { price, original: plan.price, discount, saving: plan.price - price };
}

export const discountLabel = (d: PlanDiscount) => `Super desconto do atendente ${d.attendant}`;

/**
 * The monthly price the client pays to renew: the price set for them by the admin (or the 1-month plan for their
 * screens), lowered by the attendant's discount on that plan when they get one.
 */
export function renewalPriceFor(
  client: { id: string; screens?: number; customPrice?: number },
  plans: PaymentPlan[]
): PriceResult {
  const monthlyPlans = plans.filter((p) => p.active && p.months === 1);
  const sameScreens = monthlyPlans.find((p) => p.screens === client.screens);
  const base = client.customPrice && client.customPrice > 0 ? client.customPrice : (sameScreens ?? monthlyPlans[0])?.price ?? 35;
  const discount = sameScreens ? discountFor(sameScreens, client.id) : null;
  if (discount && discount.price < base) return { price: discount.price, original: base, discount, saving: base - discount.price };
  return { price: base, original: base, discount: null, saving: 0 };
}
