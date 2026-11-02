import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Trash2, 
  DollarSign, 
  RefreshCw, 
  Search, 
  Filter, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  UserX, 
  UserCheck, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Tv, 
  Sparkles,
  ArrowRight,
  Database,
  FileSpreadsheet
} from 'lucide-react';
import { SystemLog, SystemLogAction, SystemLogSeverity } from '../types';
import { soundEffects } from '../utils/audio';

interface SystemLogsTabProps {
  logs: SystemLog[];
  onAddLog: (log: Omit<SystemLog, 'id' | 'timestamp'>) => void;
  onDeleteLog?: (id: string) => void;
  onClearLogs?: () => void;
}

export const SystemLogsTab: React.FC<SystemLogsTabProps> = ({
  logs,
  onAddLog,
  onDeleteLog,
  onClearLogs
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | SystemLogAction>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | SystemLogSeverity>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const deletes = logs.filter(l => l.action === 'client_delete').length;
    const priceChanges = logs.filter(l => l.action === 'price_change').length;
    const renewals = logs.filter(l => l.action === 'subscription_renewal').length;
    const criticals = logs.filter(l => l.severity === 'critical').length;
    return { total, deletes, priceChanges, renewals, criticals };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Action filter
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }
      // Severity filter
      if (severityFilter !== 'all' && log.severity !== severityFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const inTitle = log.title.toLowerCase().includes(query);
        const inDesc = log.description.toLowerCase().includes(query);
        const inClient = log.targetClientName?.toLowerCase().includes(query) || false;
        const inEmail = log.details?.email?.toLowerCase().includes(query) || false;
        if (!inTitle && !inDesc && !inClient && !inEmail) {
          return false;
        }
      }
      return true;
    });
  }, [logs, actionFilter, severityFilter, searchTerm]);

  // Format timestamp helper
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return {
        date: date.toLocaleDateString('pt-BR'),
        time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        relative: getRelativeTimeString(date)
      };
    } catch {
      return { date: isoString, time: '', relative: '' };
    }
  };

  const getRelativeTimeString = (date: Date) => {
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Agora há pouco';
    if (diffSec < 3600) return `Há ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `Há ${Math.floor(diffSec / 3600)}h`;
    const diffDays = Math.floor(diffSec / 86400);
    if (diffDays === 1) return 'Ontem';
    return `Há ${diffDays} dias`;
  };

  // Export to CSV
  const handleExportCSV = () => {
    soundEffects.playClick();
    const headers = ['ID', 'Data/Hora', 'Ação', 'Severidade', 'Título', 'Descrição', 'Cliente', 'Detalhes'];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString('pt-BR'),
      l.action,
      l.severity,
      `"${l.title.replace(/"/g, '""')}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${(l.targetClientName || 'N/A').replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zuxo_system_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for action badges & styling
  const getActionConfig = (action: SystemLogAction) => {
    switch (action) {
      case 'client_delete':
        return {
          label: 'Exclusão de Cliente',
          color: 'text-red-400 bg-red-950/80 border-red-800/80',
          icon: UserX,
          iconColor: 'text-red-400',
          badgeBg: 'bg-red-500/10 text-red-300 border-red-500/30'
        };
      case 'price_change':
        return {
          label: 'Alteração de Preço',
          color: 'text-amber-400 bg-amber-950/80 border-amber-800/80',
          icon: DollarSign,
          iconColor: 'text-amber-400',
          badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        };
      case 'subscription_renewal':
        return {
          label: 'Renovação Manual',
          color: 'text-[#00F59B] bg-emerald-950/80 border-emerald-800/80',
          icon: RefreshCw,
          iconColor: 'text-[#00F59B]',
          badgeBg: 'bg-emerald-500/10 text-[#00F59B] border-emerald-500/30'
        };
      case 'client_create':
        return {
          label: 'Novo Cliente',
          color: 'text-sky-400 bg-sky-950/80 border-sky-800/80',
          icon: UserCheck,
          iconColor: 'text-sky-400',
          badgeBg: 'bg-sky-500/10 text-sky-300 border-sky-500/30'
        };
      default:
        return {
          label: 'Ação do Sistema',
          color: 'text-slate-300 bg-slate-900 border-slate-700',
          icon: Info,
          iconColor: 'text-slate-400',
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700'
        };
    }
  };

  const getSeverityBadge = (severity: SystemLogSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-950 text-red-400 border border-red-600/60 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-400" /> Crítico
          </span>
        );
      case 'warning':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-950 text-amber-400 border border-amber-600/60 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Alerta
          </span>
        );
      case 'info':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-700/60 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#00F59B]" /> Info
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="p-6 bg-gradient-to-r from-[#061811] via-[#09241a] to-[#04130d] border border-emerald-900/60 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F59B]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-xs font-bold text-[#00F59B] uppercase tracking-wider mb-2">
              <ShieldAlert className="w-3.5 h-3.5" /> Auditoria & Segurança Operacional
            </div>
            <h3 className="text-2xl font-black text-white font-display flex items-center gap-2">
              Logs de Sistema & Ações Críticas
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Registro auditável em tempo real de todas as operações sensíveis: 
              <strong className="text-red-400 font-semibold"> exclusões permanentes de clientes</strong>, 
              <strong className="text-amber-400 font-semibold"> alterações de valores de mensalidade</strong> e 
              <strong className="text-[#00F59B] font-semibold"> renovações manuais de assinaturas</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-[#081f16] hover:bg-[#0e2e21] border border-emerald-700/60 text-[#00F59B] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Baixar todos os registros em arquivo CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* STATS TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-emerald-950/80">
          <div className="p-3 bg-[#05140e]/90 border border-emerald-950 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total de Registros</span>
              <Database className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white font-mono">{stats.total}</p>
            <span className="text-[10px] text-slate-400">Armazenados no Firestore</span>
          </div>

          <div className="p-3 bg-[#160a0a]/90 border border-red-950/80 rounded-2xl">
            <div className="flex items-center justify-between text-red-300 text-xs mb-1">
              <span>Exclusões Críticas</span>
              <UserX className="w-3.5 h-3.5 text-red-400" />
            </div>
            <p className="text-2xl font-black text-red-400 font-mono">{stats.deletes}</p>
            <span className="text-[10px] text-red-400/80">Clientes removidos</span>
          </div>

          <div className="p-3 bg-[#161208]/90 border border-amber-950/80 rounded-2xl">
            <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
              <span>Alterações de Preço</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 font-mono">{stats.priceChanges}</p>
            <span className="text-[10px] text-amber-400/80">Reajustes e descontos</span>
          </div>

          <div className="p-3 bg-[#061811]/90 border border-emerald-950/80 rounded-2xl">
            <div className="flex items-center justify-between text-emerald-300 text-xs mb-1">
              <span>Renovações Manuais</span>
              <RefreshCw className="w-3.5 h-3.5 text-[#00F59B]" />
            </div>
            <p className="text-2xl font-black text-[#00F59B] font-mono">{stats.renewals}</p>
            <span className="text-[10px] text-emerald-400/80">Ciclos estendidos</span>
          </div>
        </div>
      </div>

      {/* CONTROLS: SEARCH & FILTERS */}
      <div className="bg-[#0a1e16] border border-emerald-950 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, e-mail, ação ou descrição..."
            className="w-full pl-10 pr-4 py-2 bg-[#05140e] border border-emerald-900/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F59B]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Action Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          <button
            onClick={() => {
              soundEffects.playClick();
              setActionFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors ${
              actionFilter === 'all'
                ? 'bg-[#00F59B] text-slate-950'
                : 'bg-[#05140e] text-slate-400 hover:text-white border border-emerald-950'
            }`}
          >
            Todos ({logs.length})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActionFilter('client_delete');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              actionFilter === 'client_delete'
                ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-[#05140e] text-red-400 hover:text-white border border-red-950'
            }`}
          >
            <UserX className="w-3 h-3" /> Exclusões ({stats.deletes})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActionFilter('price_change');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              actionFilter === 'price_change'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-[#05140e] text-amber-400 hover:text-white border border-amber-950'
            }`}
          >
            <DollarSign className="w-3 h-3" /> Preços ({stats.priceChanges})
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActionFilter('subscription_renewal');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              actionFilter === 'subscription_renewal'
                ? 'bg-[#00F59B] text-slate-950 shadow-[0_0_12px_rgba(0,245,155,0.4)]'
                : 'bg-[#05140e] text-[#00F59B] hover:text-white border border-emerald-950'
            }`}
          >
            <RefreshCw className="w-3 h-3" /> Renovações ({stats.renewals})
          </button>
        </div>

        {/* Severity filter select */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="bg-[#05140e] border border-emerald-900/60 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00F59B]"
          >
            <option value="all">Todas as Severidades</option>
            <option value="critical">🚨 Apenas Críticos</option>
            <option value="warning">⚠️ Alertas & Reajustes</option>
            <option value="info">ℹ️ Informativos</option>
          </select>
        </div>
      </div>

      {/* LOGS LIST */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center bg-[#071912] border border-emerald-950 rounded-3xl text-slate-400">
            <ShieldAlert className="w-12 h-12 text-emerald-600/50 mx-auto mb-3" />
            <h4 className="text-base font-bold text-white mb-1">Nenhum log encontrado</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || actionFilter !== 'all' || severityFilter !== 'all'
                ? 'Nenhum registro corresponde aos filtros selecionados. Limpe os filtros para visualizar os dados.'
                : 'Nenhum log foi registrado até o momento. Operações de exclusão, alteração de preço e renovação aparecerão aqui.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const config = getActionConfig(log.action);
            const ActionIcon = config.icon;
            const timeData = formatDateTime(log.timestamp);
            const isExpanded = expandedLogId === log.id;

            return (
              <div
                key={log.id}
                className={`bg-[#0a1e16] border transition-all rounded-2xl overflow-hidden ${
                  log.severity === 'critical'
                    ? 'border-red-900/60 hover:border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
                    : log.severity === 'warning'
                    ? 'border-amber-900/60 hover:border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                    : 'border-emerald-950 hover:border-emerald-700/60'
                }`}
              >
                {/* Main Card Row */}
                <div 
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="p-4.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  {/* Left: Icon & Title & Description */}
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${config.badgeBg}`}>
                      <ActionIcon className={`w-5 h-5 ${config.iconColor}`} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${config.badgeBg}`}>
                          {config.label}
                        </span>
                        {getSeverityBadge(log.severity)}
                        <h4 className="text-sm font-bold text-white font-display">
                          {log.title}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {log.description}
                      </p>

                      {/* Metadata Chips */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 flex-wrap">
                        {log.targetClientName && (
                          <span className="flex items-center gap-1 text-emerald-300 font-semibold bg-[#05140e] px-2 py-0.5 rounded-md border border-emerald-900/50">
                            <User className="w-3 h-3 text-[#00F59B]" /> {log.targetClientName}
                          </span>
                        )}

                        <span className="flex items-center gap-1 text-slate-400 font-mono">
                          <Clock className="w-3 h-3 text-slate-500" /> {timeData.relative} · {timeData.date} {timeData.time}
                        </span>

                        <span className="text-slate-500 font-mono text-[10px]">
                          Admin: <strong className="text-slate-300">{log.adminUser || 'Admin (Mestre)'}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action / Expand Button */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {log.details && (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        {isExpanded ? (
                          <>Recolher Detalhes <ChevronUp className="w-4 h-4" /></>
                        ) : (
                          <>Ver Detalhes <ChevronDown className="w-4 h-4" /></>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* EXPANDED DETAILS ACCORDION */}
                {isExpanded && log.details && (
                  <div className="px-5 pb-5 pt-3 border-t border-emerald-950/80 bg-[#06140e]/90 text-xs text-slate-300 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>ID da Transação: <strong className="text-slate-200">{log.id}</strong></span>
                      <span>Horário ISO: <strong className="text-slate-200">{log.timestamp}</strong></span>
                    </div>

                    {/* Specific Action Breakdown */}
                    {log.action === 'price_change' && (
                      <div className="p-3 bg-[#0a1e16] border border-amber-900/40 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Comparativo de Valor:</span>
                          <div className="flex items-center gap-2 font-mono font-bold text-sm">
                            <span className="text-slate-400 line-through">
                              R$ {(log.details.previousPrice || 0).toFixed(2).replace('.', ',')}
                            </span>
                            <ArrowRight className="w-4 h-4 text-amber-400" />
                            <span className="text-[#00F59B] text-base">
                              R$ {(log.details.newPrice || 0).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>

                        {log.details.previousPrice !== undefined && log.details.newPrice !== undefined && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Diferença / Variação:</span>
                            {log.details.newPrice >= log.details.previousPrice ? (
                              <span className="text-amber-400 font-mono font-bold flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5" /> 
                                +R$ {(log.details.newPrice - log.details.previousPrice).toFixed(2).replace('.', ',')} 
                                ({(((log.details.newPrice - log.details.previousPrice) / (log.details.previousPrice || 1)) * 100).toFixed(1)}%)
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                                <TrendingDown className="w-3.5 h-3.5" /> 
                                -R$ {(log.details.previousPrice - log.details.newPrice).toFixed(2).replace('.', ',')} 
                                (Desconto aplicado)
                              </span>
                            )}
                          </div>
                        )}

                        {log.details.screens && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Telas Simultâneas:</span>
                            <span className="text-white font-bold">{log.details.screens} telas</span>
                          </div>
                        )}

                        {log.details.reason && (
                          <div className="pt-2 border-t border-emerald-950 text-[11px]">
                            <span className="text-slate-400">Motivo / Observação:</span>
                            <p className="text-amber-300/90 font-medium mt-0.5">{log.details.reason}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {log.action === 'client_delete' && (
                      <div className="p-3 bg-[#180d0d] border border-red-900/50 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Cliente Removido:</span>
                          <span className="text-red-400 font-bold">{log.targetClientName} ({log.targetClientId})</span>
                        </div>
                        {log.details.email && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">E-mail:</span>
                            <span className="text-white font-mono">{log.details.email}</span>
                          </div>
                        )}
                        {log.details.previousPrice && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Mensalidade Cancelada:</span>
                            <span className="text-red-300 font-mono font-bold">
                              R$ {log.details.previousPrice.toFixed(2).replace('.', ',')} / mês
                            </span>
                          </div>
                        )}
                        {log.details.previousExpiration && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Data de Vencimento que Estava Vigente:</span>
                            <span className="text-white font-mono">{log.details.previousExpiration}</span>
                          </div>
                        )}
                        {log.details.reason && (
                          <div className="pt-2 border-t border-red-950 text-[11px]">
                            <span className="text-slate-400">Motivo registrado:</span>
                            <p className="text-red-300/90 font-medium mt-0.5">{log.details.reason}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {log.action === 'subscription_renewal' && (
                      <div className="p-3 bg-[#081f16] border border-emerald-800/50 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Ciclo de Vencimento Estendido:</span>
                          <div className="flex items-center gap-2 font-mono font-bold">
                            <span className="text-slate-400 line-through">{log.details.previousExpiration || 'Anterior'}</span>
                            <ArrowRight className="w-4 h-4 text-[#00F59B]" />
                            <span className="text-[#00F59B] text-sm">{log.details.newExpiration || 'Novo'}</span>
                          </div>
                        </div>

                        {log.details.daysAdded && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Período Adicionado:</span>
                            <span className="text-emerald-400 font-mono font-bold">+{log.details.daysAdded} dias de acesso VIP</span>
                          </div>
                        )}

                        {log.details.newPrice && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Valor da Mensalidade Renovada:</span>
                            <span className="text-[#00F59B] font-mono font-bold">
                              R$ {log.details.newPrice.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        )}

                        {log.details.reason && (
                          <div className="pt-2 border-t border-emerald-950 text-[11px]">
                            <span className="text-slate-400">Justificativa / Comprovante:</span>
                            <p className="text-emerald-300/90 font-medium mt-0.5">{log.details.reason}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {log.action === 'client_create' && (
                      <div className="p-3 bg-[#081820] border border-sky-900/50 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Cliente Criado:</span>
                          <span className="text-sky-400 font-bold">{log.targetClientName}</span>
                        </div>
                        {log.details.email && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">E-mail:</span>
                            <span className="text-white font-mono">{log.details.email}</span>
                          </div>
                        )}
                        {log.details.newPrice && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Valor Mensal Definido:</span>
                            <span className="text-[#00F59B] font-mono font-bold">
                              R$ {log.details.newPrice.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        )}
                        {log.details.provider && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Servidor / DNS Zuxo:</span>
                            <span className="text-slate-300 font-mono">{log.details.provider}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer Quick Action */}
                    {onDeleteLog && (
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundEffects.playClick();
                            onDeleteLog(log.id);
                          }}
                          className="text-[11px] text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir este registro de log
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
