import { useEffect, useState } from 'react';
import { PaymentPlan } from '../types';
import { INITIAL_PAYMENT_PLANS } from '../data/appData';

export type PlanInput = Omit<PaymentPlan, 'id' | 'updatedAt'>;

export function formatBRL(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export function planPeriodLabel(months: number) {
  return months === 1 ? '1 mês' : `${months} meses`;
}

export function screensLabel(screens: number) {
  return `${screens} ${screens === 1 ? 'tela' : 'telas'}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data as T;
}

// Área do cliente: só planos ativos
export async function fetchActivePlans(): Promise<PaymentPlan[]> {
  const { plans } = await request<{ plans: PaymentPlan[] }>('/api/plans');
  return plans;
}

// Painel admin: todos os planos
export async function fetchAllPlans(): Promise<PaymentPlan[]> {
  const { plans } = await request<{ plans: PaymentPlan[] }>('/api/admin/plans');
  return plans;
}

export async function createPlan(input: PlanInput): Promise<PaymentPlan> {
  const { plan } = await request<{ plan: PaymentPlan }>('/api/admin/plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return plan;
}

export async function updatePlan(id: string, changes: Partial<PlanInput>): Promise<PaymentPlan> {
  const { plan } = await request<{ plan: PaymentPlan }>(`/api/admin/plans/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(changes),
  });
  return plan;
}

export async function deletePlan(id: string): Promise<void> {
  await request(`/api/admin/plans/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// Planos ativos para a área do cliente; usa a tabela padrão se o servidor não responder
export function useActivePlans() {
  const [plans, setPlans] = useState<PaymentPlan[]>(INITIAL_PAYMENT_PLANS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchActivePlans()
      .then((list) => { if (alive) setPlans(list); })
      .catch(() => { /* mantém a tabela padrão */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { plans, loading };
}
