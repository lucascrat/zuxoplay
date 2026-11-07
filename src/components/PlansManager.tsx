import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Edit3, Check, X, RefreshCw, Star, Eye, EyeOff, Layers, AlertTriangle } from 'lucide-react';
import { PaymentPlan } from '../types';
import {
  fetchAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  formatBRL,
  planPeriodLabel,
  screensLabel,
  PlanInput,
} from '../services/planService';
import { soundEffects } from '../utils/audio';

const PERIOD_CHIPS = [1, 3, 6, 12];

// Aceita "35", "35,90" ou "35.90"
function parsePrice(text: string): number {
  return Number(text.replace(/\s/g, '').replace('R$', '').replace(',', '.'));
}

interface PlanFormState {
  name: string;
  screens: string;
  months: string;
  price: string;
  features: string;
  active: boolean;
  recommended: boolean;
}

function emptyForm(): PlanFormState {
  return { name: '', screens: '1', months: '1', price: '', features: '', active: true, recommended: false };
}

function formFromPlan(plan: PaymentPlan): PlanFormState {
  return {
    name: plan.name,
    screens: String(plan.screens),
    months: String(plan.months),
    price: plan.price.toFixed(2).replace('.', ','),
    features: plan.features.join('\n'),
    active: plan.active,
    recommended: Boolean(plan.recommended),
  };
}

function formToInput(form: PlanFormState): PlanInput | string {
  const screens = Number(form.screens);
  const months = Number(form.months);
  const price = parsePrice(form.price);
  if (!Number.isInteger(screens) || screens < 1 || screens > 10) return 'Telas deve ser de 1 a 10.';
  if (!Number.isInteger(months) || months < 1 || months > 36) return 'Meses deve ser de 1 a 36.';
  if (!Number.isFinite(price) || price <= 0) return 'Informe um preço válido.';
  return {
    name: form.name.trim(),
    screens,
    months,
    price,
    active: form.active,
    recommended: form.recommended,
    features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
  };
}

export function PlansManager() {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm());
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setPlans(await fetchAllPlans());
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar os planos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const replacePlan = (updated: PaymentPlan) =>
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

  // Preço de 1 mês com o mesmo número de telas, para mostrar a economia dos planos longos
  const monthlyBase = useMemo(() => {
    const map: Record<number, number> = {};
    plans.forEach((p) => { if (p.months === 1) map[p.screens] = p.price; });
    return map;
  }, [plans]);

  const groups = useMemo(() => {
    const byScreens = new Map<number, PaymentPlan[]>();
    plans.forEach((p) => byScreens.set(p.screens, [...(byScreens.get(p.screens) || []), p]));
    return [...byScreens.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([screens, list]) => ({ screens, list: list.sort((a, b) => a.months - b.months || a.price - b.price) }));
  }, [plans]);

  const runUpdate = async (id: string, changes: Partial<PlanInput>) => {
    setBusyId(id);
    setError('');
    try {
      replacePlan(await updatePlan(id, changes));
      return true;
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar o plano.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const savePrice = async (plan: PaymentPlan) => {
    const price = parsePrice(priceDrafts[plan.id] ?? '');
    if (!Number.isFinite(price) || price <= 0) {
      setError(`Preço inválido para "${plan.name}".`);
      return;
    }
    soundEffects.playClick();
    if (await runUpdate(plan.id, { price })) {
      setPriceDrafts((prev) => { const n = { ...prev }; delete n[plan.id]; return n; });
    }
  };

  const openNew = () => {
    soundEffects.playClick();
    setForm(emptyForm());
    setFormError('');
    setEditingId('new');
  };

  const openEdit = (plan: PaymentPlan) => {
    soundEffects.playClick();
    setForm(formFromPlan(plan));
    setFormError('');
    setEditingId(plan.id);
  };

  const submitForm = async () => {
    const input = formToInput(form);
    if (typeof input === 'string') { setFormError(input); return; }
    setBusyId(editingId);
    setFormError('');
    try {
      if (editingId === 'new') {
        const created = await createPlan(input);
        setPlans((prev) => [...prev, created]);
      } else if (editingId) {
        replacePlan(await updatePlan(editingId, input));
      }
      soundEffects.playSelect();
      setEditingId(null);
    } catch (e: any) {
      setFormError(e?.message || 'Não foi possível salvar o plano.');
    } finally {
      setBusyId(null);
    }
  };

  const removePlan = async (id: string) => {
    setBusyId(id);
    setError('');
    try {
      await deletePlan(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível excluir o plano.');
    } finally {
      setBusyId(null);
    }
  };

  const inputCls = 'w-full bg-[#020b07] border border-emerald-900/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00F59B]';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#061e14] via-[#04150e] to-[#020b07] border border-emerald-500/40 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#00F59B]/10 border border-[#00F59B]/30 flex items-center justify-center text-[#00F59B] flex-shrink-0">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white font-display">Gestão de Planos</h3>
            <p className="text-slate-400 text-sm mt-0.5">
              Preços, telas e duração que o cliente vê na aba <span className="text-[#00F59B] font-bold">Planos</span>. O PIX sempre cobra o preço salvo aqui.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0a1e16] border border-emerald-800/40 text-slate-300 hover:text-white text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00F59B] text-black hover:bg-[#00d987] text-xs font-black"
          >
            <Plus className="w-4 h-4" />
            Novo plano
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-950/40 border border-red-700/40 text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-300 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Formulário de criar/editar */}
      {editingId && (
        <div className="p-5 rounded-3xl bg-[#040f0a] border border-[#00F59B]/40 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              {editingId === 'new' ? 'Novo plano' : 'Editar plano'}
            </h4>
            <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-bold text-slate-400">Nome (opcional)</span>
              <input
                className={inputCls}
                value={form.name}
                placeholder={`${form.screens || '?'} ${form.screens === '1' ? 'Tela' : 'Telas'} • ${form.months === '1' ? '1 mês' : `${form.months || '?'} meses`}`}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-400">Telas liberadas</span>
              <input type="number" min={1} max={10} className={inputCls} value={form.screens} onChange={(e) => setForm({ ...form, screens: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-400">Preço total (R$)</span>
              <input inputMode="decimal" className={inputCls} value={form.price} placeholder="35,00" onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </label>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400">Duração</span>
            <div className="flex flex-wrap items-center gap-2">
              {PERIOD_CHIPS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm({ ...form, months: String(m) })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    form.months === String(m) ? 'bg-[#00F59B] text-black border-[#00F59B]' : 'bg-[#0a1e16] text-slate-300 border-emerald-900/60 hover:text-white'
                  }`}
                >
                  {planPeriodLabel(m)}
                </button>
              ))}
              <span className="text-xs text-slate-500">ou</span>
              <input type="number" min={1} max={36} className={`${inputCls} w-24`} value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })} />
              <span className="text-xs text-slate-500">meses</span>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-400">Benefícios (um por linha; em branco usa o padrão)</span>
            <textarea rows={4} className={inputCls} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
          </label>

          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-[#00F59B] w-4 h-4" />
              Visível para os clientes
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.recommended} onChange={(e) => setForm({ ...form, recommended: e.target.checked })} className="accent-[#00F59B] w-4 h-4" />
              Destacar como "Mais escolhido"
            </label>
          </div>

          {formError && <p className="text-sm text-red-400">{formError}</p>}

          <div className="flex gap-2">
            <button
              onClick={submitForm}
              disabled={busyId === editingId}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00F59B] text-black hover:bg-[#00d987] text-sm font-black disabled:opacity-50"
            >
              {busyId === editingId ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingId === 'new' ? 'Criar plano' : 'Salvar alterações'}
            </button>
            <button onClick={() => setEditingId(null)} className="px-5 py-2.5 rounded-xl bg-[#0a1e16] border border-emerald-900/60 text-slate-300 hover:text-white text-sm font-bold">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista agrupada por telas */}
      {loading && plans.length === 0 ? (
        <div className="py-16 flex justify-center text-slate-500"><RefreshCw className="w-6 h-6 animate-spin" /></div>
      ) : plans.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">Nenhum plano cadastrado. Clique em "Novo plano".</div>
      ) : (
        groups.map(({ screens, list }) => (
          <div key={screens} className="bg-[#040f0a] border border-emerald-900/40 rounded-3xl overflow-hidden">
            <div className="px-5 py-3 border-b border-emerald-900/40 bg-[#061008]/60 flex items-center justify-between">
              <span className="text-sm font-black text-white uppercase tracking-wider">
                Planos de {screensLabel(screens)} {screens === 1 ? 'liberada' : 'liberadas'}
              </span>
              <span className="text-xs text-slate-500">{list.filter((p) => p.active).length} de {list.length} visíveis</span>
            </div>

            <div className="divide-y divide-emerald-900/30">
              {list.map((plan) => {
                const draft = priceDrafts[plan.id];
                const draftChanged = draft !== undefined && parsePrice(draft) !== plan.price;
                const perMonth = plan.price / plan.months;
                const base = monthlyBase[plan.screens];
                const saving = plan.months > 1 && base ? base * plan.months - plan.price : 0;
                const busy = busyId === plan.id;

                return (
                  <div key={plan.id} className={`p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center gap-4 ${plan.active ? '' : 'opacity-60'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">{plan.name}</span>
                        {plan.recommended && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#00F59B]/15 text-[#00F59B] border border-[#00F59B]/30">Mais escolhido</span>
                        )}
                        {!plan.active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-400">Oculto</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {screensLabel(plan.screens)} • {planPeriodLabel(plan.months)} • {formatBRL(perMonth)}/mês
                        {saving > 0.009 && <span className="text-[#00F59B]"> • economia de {formatBRL(saving)}</span>}
                      </p>
                    </div>

                    {/* Edição rápida do preço */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">R$</span>
                      <input
                        inputMode="decimal"
                        aria-label={`Preço de ${plan.name}`}
                        className="w-28 bg-[#020b07] border border-emerald-900/60 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#00F59B]"
                        value={draft ?? plan.price.toFixed(2).replace('.', ',')}
                        onChange={(e) => setPriceDrafts((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && draftChanged) savePrice(plan); }}
                      />
                      {draftChanged && (
                        <button
                          onClick={() => savePrice(plan)}
                          disabled={busy}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#00F59B] text-black text-xs font-black disabled:opacity-50"
                        >
                          {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Salvar
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        title={plan.active ? 'Ocultar dos clientes' : 'Mostrar aos clientes'}
                        onClick={() => runUpdate(plan.id, { active: !plan.active })}
                        disabled={busy}
                        className="p-2 rounded-xl bg-[#0a1e16] border border-emerald-900/60 text-slate-300 hover:text-white disabled:opacity-50"
                      >
                        {plan.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        title={plan.recommended ? 'Tirar destaque' : 'Destacar como "Mais escolhido"'}
                        onClick={() => runUpdate(plan.id, { recommended: !plan.recommended })}
                        disabled={busy}
                        className={`p-2 rounded-xl border disabled:opacity-50 ${
                          plan.recommended ? 'bg-[#00F59B]/15 border-[#00F59B]/40 text-[#00F59B]' : 'bg-[#0a1e16] border-emerald-900/60 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        title="Editar plano"
                        onClick={() => openEdit(plan)}
                        className="p-2 rounded-xl bg-[#0a1e16] border border-emerald-900/60 text-slate-300 hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === plan.id ? (
                        <>
                          <button
                            onClick={() => removePlan(plan.id)}
                            disabled={busy}
                            className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-black disabled:opacity-50"
                          >
                            Excluir
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-2 rounded-xl bg-[#0a1e16] text-slate-300 text-xs font-bold">
                            Não
                          </button>
                        </>
                      ) : (
                        <button
                          title="Excluir plano"
                          onClick={() => setConfirmDeleteId(plan.id)}
                          className="p-2 rounded-xl bg-[#0a1e16] border border-emerald-900/60 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
