import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Users, 
  Tv, 
  BarChart3, 
  ArrowUpRight,
  Filter,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ChevronRight,
  Send
} from 'lucide-react';
import { UserProfile } from '../types';
import { soundEffects } from '../utils/audio';
import { parseDateString, calculateDaysRemaining } from '../services/notificationService';

interface RevenueBarChartProps {
  clients: UserProfile[];
}

export type ChartViewMode = 
  | 'projecao_mensal'       // Faturamento mensal projetado (base clientes ativos + datas)
  | 'ciclo_renovacoes'      // Distribuição diária das renovações no mês
  | 'receita_acumulada'     // Receita acumulada progressiva
  | 'por_cliente';          // Mensalidades individuais por cliente

export type ProjectionScenario = 'base' | 'realista' | 'conservador' | 'crescimento';

export const RevenueBarChart: React.FC<RevenueBarChartProps> = ({ clients }) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('projecao_mensal');
  const [timeRange, setTimeRange] = useState<'6m' | '12m'>('6m');
  const [scenario, setScenario] = useState<ProjectionScenario>('base');
  const [includePending, setIncludePending] = useState<boolean>(true);

  // Active clients
  const activeClients = useMemo(() => {
    return clients.filter((c) => c.status === 'ativo');
  }, [clients]);

  // Pending clients
  const pendingClients = useMemo(() => {
    return clients.filter((c) => c.status === 'pendente');
  }, [clients]);

  // Current base monthly recurring revenue (MRR) strictly from active clients
  const activeMonthlyRevenue = useMemo(() => {
    return activeClients.reduce((sum, c) => sum + (c.customPrice || 0), 0);
  }, [activeClients]);

  // Pending monthly revenue that can be recovered
  const pendingMonthlyRevenue = useMemo(() => {
    return pendingClients.reduce((sum, c) => sum + (c.customPrice || 0), 0);
  }, [pendingClients]);

  // Total active screens
  const totalActiveScreens = useMemo(() => {
    return activeClients.reduce((sum, c) => sum + (c.screens || 1), 0);
  }, [activeClients]);

  // Average ticket among active subscribers
  const ticketMedioAtivo = useMemo(() => {
    return activeClients.length > 0 ? activeMonthlyRevenue / activeClients.length : 0;
  }, [activeClients, activeMonthlyRevenue]);

  // Group active clients by day of renewal in the month (e.g. 5, 10, 15, 20, 28)
  const renewalsByDay = useMemo(() => {
    const dayMap = new Map<number, { day: number; label: string; clients: UserProfile[]; revenue: number; screens: number }>();

    activeClients.forEach((client) => {
      const parsed = parseDateString(client.expirationDate);
      const day = parsed ? parsed.getDate() : 15; // default to 15 if missing

      if (!dayMap.has(day)) {
        dayMap.set(day, {
          day,
          label: `Dia ${day.toString().padStart(2, '0')}`,
          clients: [],
          revenue: 0,
          screens: 0
        });
      }

      const entry = dayMap.get(day)!;
      entry.clients.push(client);
      entry.revenue += client.customPrice || 0;
      entry.screens += client.screens || 1;
    });

    // Also include pending clients if toggled
    if (includePending) {
      pendingClients.forEach((client) => {
        const parsed = parseDateString(client.expirationDate);
        const day = parsed ? parsed.getDate() : 10;
        if (!dayMap.has(day)) {
          dayMap.set(day, {
            day,
            label: `Dia ${day.toString().padStart(2, '0')}`,
            clients: [],
            revenue: 0,
            screens: 0
          });
        }
      });
    }

    return Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
  }, [activeClients, pendingClients, includePending]);

  // Daily cycle data for Recharts
  const dailyCycleChartData = useMemo(() => {
    return renewalsByDay.map((entry) => ({
      dia: entry.label,
      diaNumero: entry.day,
      faturamentoProjetado: Math.round(entry.revenue * 100) / 100,
      qtdClientes: entry.clients.length,
      qtdTelas: entry.screens,
      nomesClientes: entry.clients.map((c) => c.name.split(' ')[0]).join(', ')
    }));
  }, [renewalsByDay]);

  // Scenario multipliers
  const scenarioRate = useMemo(() => {
    switch (scenario) {
      case 'conservador': return 0.88; // 88% renewal rate
      case 'realista': return 0.95;    // 95% renewal rate
      case 'crescimento': return 1.10; // 110% (growth with new clients)
      case 'base':
      default:
        return 1.00; // 100% retention
    }
  }, [scenario]);

  // Projected Monthly Revenue across future months (combines active clients + renewal dates)
  const monthlyProjectionData = useMemo(() => {
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    const fullMonthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const today = new Date();
    const currentMonthIdx = today.getMonth();
    const currentYear = today.getFullYear();
    const totalPeriods = timeRange === '6m' ? 6 : 12;

    const data = [];
    let acumulado = 0;

    for (let i = 0; i < totalPeriods; i++) {
      const monthDate = new Date(currentYear, currentMonthIdx + i, 1);
      const mIdx = monthDate.getMonth();
      const yr = monthDate.getFullYear();
      const isCurrentMonth = i === 0;

      // Base active revenue multiplied by scenario factor compounding gently
      const growthFactor = scenario === 'crescimento' ? Math.pow(1.04, i) : 1;
      const decayFactor = scenario === 'conservador' ? Math.pow(0.98, i) : 1;
      const multiplier = scenarioRate * growthFactor * decayFactor;

      const faturamentoAtivos = Math.round(activeMonthlyRevenue * multiplier * 100) / 100;
      const receitaPendente = isCurrentMonth && includePending 
        ? Math.round(pendingMonthlyRevenue * 100) / 100 
        : 0;

      const totalProjetado = faturamentoAtivos + receitaPendente;
      acumulado += totalProjetado;

      const clientesProjetados = Math.max(1, Math.round(activeClients.length * multiplier));
      const telasProjetadas = Math.max(1, Math.round(totalActiveScreens * multiplier));

      data.push({
        mes: `${monthNames[mIdx]}/${yr.toString().slice(2)}`,
        mesCompleto: `${fullMonthNames[mIdx]} de ${yr}${isCurrentMonth ? ' (Mês Atual)' : ' (Projetado)'}`,
        faturamentoAtivos,
        receitaPendente,
        totalProjetado,
        faturamentoAcumulado: Math.round(acumulado * 100) / 100,
        clientesAtivos: clientesProjetados,
        telasAtivas: telasProjetadas,
        isCurrentMonth
      });
    }

    return data;
  }, [timeRange, scenario, scenarioRate, activeMonthlyRevenue, pendingMonthlyRevenue, includePending, activeClients.length, totalActiveScreens]);

  // Clients sorted by next renewal date
  const upcomingRenewalsList = useMemo(() => {
    return [...clients]
      .map((client) => {
        const daysLeft = calculateDaysRemaining(client.expirationDate);
        return {
          ...client,
          daysLeft,
          renewalDay: parseDateString(client.expirationDate)?.getDate() || 15
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [clients]);

  // Next renewal wave
  const nextRenewalWave = useMemo(() => {
    const upcomingActive = upcomingRenewalsList.filter((c) => c.status === 'ativo' && c.daysLeft >= 0);
    if (upcomingActive.length === 0) return null;
    const firstDay = upcomingActive[0].renewalDay;
    const group = upcomingActive.filter((c) => c.renewalDay === firstDay);
    const sum = group.reduce((acc, c) => acc + (c.customPrice || 0), 0);
    return {
      day: firstDay,
      count: group.length,
      revenue: sum,
      daysLeft: upcomingActive[0].daysLeft
    };
  }, [upcomingRenewalsList]);

  return (
    <div className="bg-[#05170f] border border-emerald-900/70 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(0,245,155,0.08)] relative overflow-hidden space-y-6">
      {/* GLOW ACCENT */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-emerald-950">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-emerald-950 border border-emerald-800 text-[#00F59B] inline-flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
              Projeção Financeira Inteligente
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-[#00F59B] border border-emerald-700/60">
              Recharts
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white font-display">
            Faturamento Mensal Projetado & Ciclo de Renovações
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cálculo dinâmico baseado nos <strong>{activeClients.length} clientes ativos</strong>, seus valores individuais e suas datas de renovação programadas.
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* VIEW MODE TABS */}
          <div className="inline-flex p-1 bg-[#0a2016] border border-emerald-900/60 rounded-xl text-xs">
            <button
              onClick={() => {
                soundEffects.playClick();
                setViewMode('projecao_mensal');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'projecao_mensal'
                  ? 'bg-[#00F59B] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Projeção Mensal
            </button>
            <button
              onClick={() => {
                soundEffects.playClick();
                setViewMode('ciclo_renovacoes');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'ciclo_renovacoes'
                  ? 'bg-[#00F59B] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Onda Diária de Renovações
            </button>
            <button
              onClick={() => {
                soundEffects.playClick();
                setViewMode('receita_acumulada');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'receita_acumulada'
                  ? 'bg-[#00F59B] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Acumulada
            </button>
          </div>

          {/* TIME RANGE SELECTOR */}
          {viewMode !== 'ciclo_renovacoes' && (
            <div className="inline-flex p-1 bg-[#0a2016] border border-emerald-900/60 rounded-xl text-xs">
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setTimeRange('6m');
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                  timeRange === '6m'
                    ? 'bg-emerald-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                6 Meses
              </button>
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setTimeRange('12m');
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                  timeRange === '12m'
                    ? 'bg-emerald-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                12 Meses
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI HIGHLIGHT CARDS - FOCUSED ON ACTIVE CLIENTS & RENEWAL DATES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-[#081f15] border border-emerald-900/60 rounded-2xl relative overflow-hidden">
          <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-[#00F59B]" /> Faturamento MRR Ativo
          </span>
          <div className="text-lg sm:text-2xl font-black text-[#00F59B] font-mono mt-0.5">
            R$ {activeMonthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-400/90 font-medium flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> {activeClients.length} clientes ativos renovando
          </span>
        </div>

        <div className="p-3.5 bg-[#081f15] border border-emerald-900/60 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-emerald-400" /> Clientes Ativos
          </span>
          <div className="text-lg sm:text-2xl font-black text-white font-mono mt-0.5">
            {activeClients.length} <span className="text-xs text-slate-400 font-normal">de {clients.length}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
            {totalActiveScreens} telas liberadas no total
          </span>
        </div>

        <div className="p-3.5 bg-[#081f15] border border-emerald-900/60 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Próxima Onda de Renovação
          </span>
          {nextRenewalWave ? (
            <div>
              <div className="text-lg sm:text-2xl font-black text-amber-300 font-mono mt-0.5">
                Dia {nextRenewalWave.day.toString().padStart(2, '0')}
              </div>
              <span className="text-[10px] text-slate-300 font-medium block mt-0.5 truncate">
                R$ {nextRenewalWave.revenue.toFixed(2).replace('.', ',')} ({nextRenewalWave.count} {nextRenewalWave.count === 1 ? 'cliente' : 'clientes'})
              </span>
            </div>
          ) : (
            <div className="text-sm font-bold text-slate-400 mt-2">Sem vencimentos</div>
          )}
        </div>

        <div className="p-3.5 bg-[#081f15] border border-emerald-900/60 rounded-2xl">
          <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Ticket Médio Ativo
          </span>
          <div className="text-lg sm:text-2xl font-black text-cyan-300 font-mono mt-0.5">
            R$ {ticketMedioAtivo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
            Por assinante ativo / mês
          </span>
        </div>
      </div>

      {/* SCENARIO SELECTOR BAR (FOR PROJECTION MODE) */}
      {viewMode === 'projecao_mensal' && (
        <div className="p-3 bg-[#03150d] rounded-2xl border border-emerald-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00F59B]" />
            <span className="font-bold text-white">Simulador de Retenção & Renovação:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setScenario('base')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  scenario === 'base'
                    ? 'bg-[#00F59B] text-slate-950'
                    : 'bg-[#0a2016] text-slate-400 hover:text-white'
                }`}
              >
                100% Retenção (Base)
              </button>
              <button
                onClick={() => setScenario('realista')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  scenario === 'realista'
                    ? 'bg-[#00F59B] text-slate-950'
                    : 'bg-[#0a2016] text-slate-400 hover:text-white'
                }`}
              >
                95% (Realista)
              </button>
              <button
                onClick={() => setScenario('conservador')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  scenario === 'conservador'
                    ? 'bg-[#00F59B] text-slate-950'
                    : 'bg-[#0a2016] text-slate-400 hover:text-white'
                }`}
              >
                88% (Conservador)
              </button>
              <button
                onClick={() => setScenario('crescimento')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  scenario === 'crescimento'
                    ? 'bg-[#00F59B] text-slate-950'
                    : 'bg-[#0a2016] text-slate-400 hover:text-white'
                }`}
              >
                +10% Novos/mês (Expansão)
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={includePending}
              onChange={(e) => setIncludePending(e.target.checked)}
              className="accent-[#00F59B] rounded"
            />
            <span>Incluir faturas pendentes recuperáveis (+R$ {pendingMonthlyRevenue.toFixed(2).replace('.', ',')})</span>
          </label>
        </div>
      )}

      {/* ====================================================================== */}
      {/* RECHARTS VISUALIZATION AREA                                            */}
      {/* ====================================================================== */}
      <div className="h-72 sm:h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'projecao_mensal' ? (
            /* COMPOSED CHART: BAR (FATURAMENTO PROJETADO) + LINE (CLIENTES ATIVOS) */
            <ComposedChart
              data={monthlyProjectionData}
              margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="projActiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00F59B" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="projPendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#b45309" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e3324" vertical={false} />
              <XAxis
                dataKey="mes"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#0e3324' }}
              />
              {/* Left Y Axis for Revenue */}
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#0e3324' }}
                tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
              />
              {/* Right Y Axis for Active Client count */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#0e3324' }}
                tickFormatter={(val) => `${val} ass.`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#05170f] border border-[#00F59B] p-3.5 rounded-2xl shadow-2xl text-xs space-y-1.5 font-sans min-w-[240px]">
                        <div className="font-bold text-white border-b border-emerald-950 pb-1.5 flex items-center justify-between">
                          <span>{data.mesCompleto}</span>
                          {data.isCurrentMonth && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-[#00F59B] text-[10px]">Atual</span>
                          )}
                        </div>
                        <div className="flex justify-between gap-4 text-emerald-400">
                          <span>Faturamento Projetado:</span>
                          <span className="font-mono font-bold text-white">
                            R$ {data.totalProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-300 text-[11px]">
                          <span>Renovações de Clientes Ativos:</span>
                          <span className="font-mono text-[#00F59B]">
                            R$ {data.faturamentoAtivos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {data.receitaPendente > 0 && (
                          <div className="flex justify-between gap-4 text-amber-300 text-[11px]">
                            <span>Pendente Recuperável:</span>
                            <span className="font-mono">
                              R$ {data.receitaPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between gap-4 text-slate-400 text-[11px] pt-1 border-t border-emerald-950">
                          <span>Clientes Ativos Projetados:</span>
                          <span className="text-emerald-300 font-bold">{data.clientesAtivos} assinantes</span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-400 text-[11px]">
                          <span>Telas Projetadas:</span>
                          <span className="text-white">{data.telasAtivas} telas</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 10 }}
                formatter={(value) => <span className="text-slate-300 font-semibold">{value}</span>}
              />
              <ReferenceLine 
                yAxisId="left" 
                y={activeMonthlyRevenue} 
                stroke="#00F59B" 
                strokeDasharray="3 3" 
                label={{ value: 'MRR Base Atual', position: 'insideTopLeft', fill: '#00F59B', fontSize: 10 }} 
              />
              <Bar
                yAxisId="left"
                dataKey="faturamentoAtivos"
                name="Faturamento Ativos (R$)"
                fill="url(#projActiveGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={42}
              />
              {includePending && (
                <Bar
                  yAxisId="left"
                  dataKey="receitaPendente"
                  name="Pendente a Quitar (R$)"
                  fill="url(#projPendingGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
              )}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="clientesAtivos"
                name="Qtd Clientes Ativos"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#38bdf8' }}
              />
            </ComposedChart>
          ) : viewMode === 'ciclo_renovacoes' ? (
            /* BAR CHART: DAILY RENEWAL CASH FLOW WAVE (RENOVACÕES POR DIA DO MÊS) */
            <BarChart
              data={dailyCycleChartData}
              margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="dailyWaveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00F59B" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e3324" vertical={false} />
              <XAxis
                dataKey="dia"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#0e3324' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#0e3324' }}
                tickFormatter={(val) => `R$${val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#05170f] border border-[#00F59B] p-3 rounded-2xl shadow-xl text-xs space-y-1 font-sans">
                        <div className="font-bold text-white border-b border-emerald-950 pb-1">
                          Vencimentos Agendados para {data.dia}
                        </div>
                        <div className="flex justify-between gap-4 text-emerald-400">
                          <span>Faturamento do Dia:</span>
                          <span className="font-mono font-bold text-white">
                            R$ {data.faturamentoProjetado.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-300">
                          <span>Clientes a Renovar:</span>
                          <span className="font-bold text-[#00F59B]">{data.qtdClientes} assinantes</span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-400 text-[11px]">
                          <span>Telas neste dia:</span>
                          <span className="text-white">{data.qtdTelas} telas</span>
                        </div>
                        {data.nomesClientes && (
                          <div className="pt-1 border-t border-emerald-950 text-[10px] text-slate-400">
                            <span>Clientes: <strong className="text-slate-200">{data.nomesClientes}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 10 }}
                formatter={(value) => <span className="text-slate-300 font-semibold">{value}</span>}
              />
              <Bar
                dataKey="faturamentoProjetado"
                name="Receita Projetada neste Dia (R$)"
                fill="url(#dailyWaveGradient)"
                radius={[8, 8, 0, 0]}
                maxBarSize={55}
              >
                {dailyCycleChartData.map((entry, index) => (
                  <Cell
                    key={`cell-day-${index}`}
                    fill={entry.faturamentoProjetado > 50 ? '#00F59B' : '#10b981'}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            /* ACCUMULATED REVENUE PROGRESSION */
            <ComposedChart
              data={monthlyProjectionData}
              margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="areaAccumGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00F59B" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#00F59B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#0e3324" vertical={false} />
              <XAxis
                dataKey="mes"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#0e3324' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#0e3324' }}
                tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#05170f] border border-[#00F59B] p-3 rounded-2xl shadow-xl text-xs space-y-1 font-sans">
                        <div className="font-bold text-white border-b border-emerald-950 pb-1">
                          {data.mesCompleto}
                        </div>
                        <div className="flex justify-between gap-4 text-slate-300">
                          <span>Receita Acumulada:</span>
                          <span className="font-mono font-bold text-[#00F59B]">
                            R$ {data.faturamentoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-400">
                          <span>Faturamento do Mês:</span>
                          <span className="font-mono text-white">
                            R$ {data.totalProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 10 }}
                formatter={(value) => <span className="text-slate-300 font-semibold">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="faturamentoAcumulado"
                name="Receita Acumulada Projetada (R$)"
                stroke="#00F59B"
                strokeWidth={2.5}
                fill="url(#areaAccumGradient)"
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* DETAILED RENEWAL SCHEDULE TABLE */}
      <div className="pt-3 border-t border-emerald-950/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#00F59B]" /> Cronograma Individual de Renovações dos Clientes
            </h4>
            <p className="text-[11px] text-slate-400">
              Datas de vencimento de cada cliente que compõem o faturamento mensal projetado
            </p>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">
            {activeClients.length} ativos · R$ {activeMonthlyRevenue.toFixed(2).replace('.', ',')} / mês
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {upcomingRenewalsList.map((client) => {
            const isDueSoon = client.daysLeft <= 5 && client.daysLeft >= 0;
            const isOverdue = client.daysLeft < 0;

            return (
              <div
                key={client.id}
                className={`p-3 rounded-2xl border transition-all ${
                  client.status === 'ativo'
                    ? isDueSoon
                      ? 'bg-[#1a1c0d] border-amber-500/50'
                      : 'bg-[#081a13] border-emerald-900/50'
                    : 'bg-[#1a0f0f] border-red-900/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={client.avatar}
                      alt={client.name}
                      className="w-7 h-7 rounded-full object-cover border border-emerald-600/40"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block leading-tight">{client.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{client.screens} telas liberadas</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    client.status === 'ativo'
                      ? 'bg-emerald-950 text-[#00F59B] border border-emerald-700/60'
                      : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                  }`}>
                    {client.status}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-emerald-950/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Vencimento:</span>
                    <strong className="text-white font-mono text-xs">{client.expirationDate}</strong>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Mensalidade:</span>
                    <strong className="text-[#00F59B] font-mono font-bold text-xs">
                      R$ {(client.customPrice || 0).toFixed(2).replace('.', ',')}
                    </strong>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Renovação:</span>
                    <span className={`font-bold text-[11px] ${
                      isOverdue 
                        ? 'text-red-400' 
                        : isDueSoon 
                        ? 'text-amber-400' 
                        : 'text-emerald-400'
                    }`}>
                      {isOverdue 
                        ? `Venceu há ${Math.abs(client.daysLeft)}d` 
                        : client.daysLeft === 0 
                        ? 'Vence Hoje!' 
                        : `Em ${client.daysLeft} dias`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
