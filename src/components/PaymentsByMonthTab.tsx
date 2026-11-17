import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Users, Wallet, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';
import { getRecentEfiPayments } from '../services/efiBankService';

interface PaymentEntry {
  id: string;
  clientId: string;
  clientName: string;
  description: string;
  amount: number;
  day: string; // YYYY-MM-DD, Brazil time
  method: string;
}

const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const name = MONTH_NAMES[month - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} de ${year}`;
}

function brazilDay(iso: string): string | null {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);
}

function dayFromBrDate(text: string): string | null {
  const [d, m, y] = String(text || '').split('/').map(Number);
  if (!d || !m || !y) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const formatDay = (day: string) => day.split('-').reverse().join('/');

interface Props {
  clients: UserProfile[];
}

/** Payments received, grouped by month, with the name of each paying client. */
export const PaymentsByMonthTab: React.FC<Props> = ({ clients }) => {
  const [serverCharges, setServerCharges] = useState<any[]>([]);
  const [serverFailed, setServerFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const todayKey = useMemo(() => brazilDay(new Date().toISOString())!.slice(0, 7), []);
  const [monthKey, setMonthKey] = useState<string>(todayKey);

  useEffect(() => {
    let alive = true;
    getRecentEfiPayments()
      .then((res) => {
        if (!alive) return;
        setServerCharges(res.completed || []);
        setServerFailed(false);
      })
      .catch(() => alive && setServerFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const payments = useMemo(() => {
    const nameOf = new Map(clients.map((c) => [c.id, c.name]));
    const byId = new Map<string, PaymentEntry>();

    // 1. Payments saved in each client's record (the durable history).
    for (const client of clients) {
      for (const p of client.payments || []) {
        const day = dayFromBrDate(p.date);
        if (!day) continue;
        byId.set(p.id, {
          id: p.id,
          clientId: client.id,
          clientName: client.name,
          description: p.description,
          amount: Number(p.amount) || 0,
          day,
          method: p.paymentMethod || 'PIX',
        });
      }
    }

    // 2. Charges the bank confirmed that are not in a client's record yet. Only charges created on the Efí API count.
    for (const charge of serverCharges) {
      if (!charge.efi || charge.status !== 'CONCLUIDA' || !charge.paidAt || byId.has(charge.txid)) continue;
      const day = brazilDay(charge.paidAt);
      if (!day) continue;
      byId.set(charge.txid, {
        id: charge.txid,
        clientId: charge.clientId || '',
        clientName: nameOf.get(charge.clientId) || 'Cliente não identificado',
        description: charge.description || 'Pagamento PIX',
        amount: Number(charge.amount) || 0,
        day,
        method: 'PIX Efí Bank',
      });
    }
    return [...byId.values()];
  }, [clients, serverCharges]);

  const totalsByMonth = useMemo(() => {
    const totals = new Map<string, { total: number; count: number }>();
    for (const p of payments) {
      const key = p.day.slice(0, 7);
      const entry = totals.get(key) || { total: 0, count: 0 };
      entry.total += p.amount;
      entry.count += 1;
      totals.set(key, entry);
    }
    return totals;
  }, [payments]);

  const monthKeys = useMemo(() => [...new Set([todayKey, ...totalsByMonth.keys()])].sort().reverse(), [todayKey, totalsByMonth]);

  const monthPayments = useMemo(
    () => payments.filter((p) => p.day.startsWith(monthKey)).sort((a, b) => b.day.localeCompare(a.day) || b.amount - a.amount),
    [payments, monthKey]
  );
  const monthTotal = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const payingClients = new Set(monthPayments.map((p) => p.clientId || p.clientName)).size;

  const index = monthKeys.indexOf(monthKey);
  const goOlder = () => index < monthKeys.length - 1 && setMonthKey(monthKeys[index + 1]);
  const goNewer = () => index > 0 && setMonthKey(monthKeys[index - 1]);

  const navButton = 'w-11 h-11 rounded-xl bg-[#0a1e16] border border-emerald-900/60 text-slate-200 flex items-center justify-center disabled:opacity-30 enabled:hover:bg-[#0f2e21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F59B]';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#00F59B]" /> Pagamentos por mês
          </h3>
          <p className="text-xs text-slate-400">Pagamentos PIX confirmados pela Efí, com o nome de quem pagou.</p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={goOlder} disabled={index >= monthKeys.length - 1} aria-label="Mês anterior" className={navButton}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <label className="sr-only" htmlFor="payments-month">Mês</label>
          <select
            id="payments-month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            className="h-11 min-w-[11rem] px-3 rounded-xl bg-[#05130d] border border-emerald-900/60 text-white text-sm font-semibold outline-none focus:border-[#00F59B]"
          >
            {monthKeys.map((key) => (
              <option key={key} value={key}>{monthLabel(key)}</option>
            ))}
          </select>
          <button type="button" onClick={goNewer} disabled={index <= 0} aria-label="Próximo mês" className={navButton}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {serverFailed && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          Não foi possível consultar a lista de cobranças do servidor agora. Mostrando os pagamentos gravados nos cadastros dos clientes.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0a1e16] border border-emerald-900/60 rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Recebido no mês</p>
          <p className="mt-1 text-2xl font-black text-[#00F59B] font-mono">{brl(monthTotal)}</p>
        </div>
        <div className="bg-[#0a1e16] border border-emerald-900/60 rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Pagamentos</p>
          <p className="mt-1 text-2xl font-black text-white font-mono">{monthPayments.length}</p>
        </div>
        <div className="bg-[#0a1e16] border border-emerald-900/60 rounded-2xl p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Clientes pagantes</p>
          <p className="mt-1 text-2xl font-black text-white font-mono">{payingClients}</p>
        </div>
      </div>

      <div className="bg-[#0a1e16] border border-emerald-950 rounded-3xl overflow-hidden">
        <div className="px-4 py-3 border-b border-emerald-950 text-sm font-bold text-white">{monthLabel(monthKey)}</div>
        {loading && monthPayments.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Carregando…</p>
        ) : monthPayments.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Nenhum pagamento confirmado neste mês.</p>
        ) : (
          <ul className="divide-y divide-emerald-950/70">
            {monthPayments.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{p.clientName}</p>
                  <p className="text-xs text-slate-400 truncate">{formatDay(p.day)} · {p.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-[#00F59B] font-mono">{brl(p.amount)}</p>
                  <p className="text-[11px] text-slate-500">{p.method}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {monthKeys.length > 1 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Mês a mês</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {monthKeys.map((key) => {
              const t = totalsByMonth.get(key) || { total: 0, count: 0 };
              const active = key === monthKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMonthKey(key)}
                  aria-pressed={active}
                  className={`px-4 py-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F59B] ${
                    active ? 'bg-[#00F59B]/10 border-[#00F59B]/60' : 'bg-[#0a1e16] border-emerald-950 hover:border-emerald-700/60'
                  }`}
                >
                  <span className="text-sm font-semibold text-white">{monthLabel(key)}</span>
                  <span className="text-right">
                    <span className="block text-sm font-black text-[#00F59B] font-mono">{brl(t.total)}</span>
                    <span className="block text-[11px] text-slate-500">{t.count} {t.count === 1 ? 'pagamento' : 'pagamentos'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
