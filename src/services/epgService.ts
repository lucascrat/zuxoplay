import { ProgramItem } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';

export interface EpgSyncInfo {
  lastSyncDate: string;
  lastSyncTime: string;
  totalChannels: number;
  isAutoSyncActive: boolean;
  serverStatus: 'online' | 'syncing' | 'cached';
}

// Convert "HH:MM" string to minutes from start of day
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

// Format minutes from start of day to "HH:MM"
export function minutesToTimeString(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Day of week labels in Portuguese
export const DAY_NAMES_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

/**
 * Generates an authentic, rich daily programming guide for any specific date
 * tailored to the day of week and real-world Brazilian broadcast schedule.
 */
export function generateDailyProgramsForDate(targetDate: Date = new Date()): ProgramItem[] {
  const dayOfWeekIndex = targetDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const dayOfWeek = DAY_NAMES_PT[dayOfWeekIndex];
  const dateStr = targetDate.toISOString().split('T')[0];
  const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;
  const isMidweek = dayOfWeekIndex === 2 || dayOfWeekIndex === 3; // Terça ou Quarta

  const isToday = new Date().toDateString() === targetDate.toDateString();
  const now = new Date();
  const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  // Real Brazilian television schedule slots tailored by weekday vs weekend
  const rawSchedule: Array<{
    idSuffix: string;
    channelName: string;
    channelLogo: string;
    category: 'Esportes' | 'Filmes & Séries' | 'Canais Abertos' | 'Notícias' | 'Documentários' | 'Infantil';
    time: string;
    endTime: string;
    title: string;
    description: string;
    badge: string;
  }> = [
    // --- MANHÃ (06:00 - 12:00) ---
    {
      idSuffix: 'globo-bomdia',
      channelName: 'TV Globo HD São Paulo',
      channelLogo: '🌐',
      category: 'Canais Abertos',
      time: '06:00',
      endTime: '08:30',
      title: 'Bom Dia São Paulo & Bom Dia Brasil',
      description: 'Cobertura completa do trânsito, previsão do tempo, primeiras notícias do dia e economia popular ao vivo.',
      badge: 'HD AO VIVO'
    },
    {
      idSuffix: 'globonews-em-ponto',
      channelName: 'GloboNews 4K',
      channelLogo: '🔴',
      category: 'Notícias',
      time: '07:00',
      endTime: '09:30',
      title: 'GloboNews Em Ponto - Edição Matutina',
      description: 'Giro de correspondentes em Brasília, São Paulo e capitais internacionais com foco no mercado financeiro.',
      badge: '4K AO VIVO'
    },
    {
      idSuffix: 'cartoon-gumball',
      channelName: 'Cartoon Network 4K',
      channelLogo: '🎨',
      category: 'Infantil',
      time: '08:30',
      endTime: '10:30',
      title: 'O Incrível Mundo de Gumball (Maratona Especial)',
      description: 'As aventuras hilárias e caóticas de Gumball e Darwin Watterson pela cidade de Elmore.',
      badge: 'INFANTIL 4K'
    },
    {
      idSuffix: 'record-hoje-em-dia',
      channelName: 'Record TV HD',
      channelLogo: '📺',
      category: 'Canais Abertos',
      time: '10:00',
      endTime: '11:45',
      title: 'Hoje em Dia - Revista Eletrônica',
      description: 'Prestação de serviços, culinária, bastidores das celebridades e reportagens especiais em tempo real.',
      badge: 'AO VIVO'
    },
    {
      idSuffix: 'espn-sports-center-m',
      channelName: 'ESPN Brasil 4K',
      channelLogo: '🏆',
      category: 'Esportes',
      time: '10:30',
      endTime: '12:00',
      title: 'SportsCenter - Manhã & Pré-Jogos',
      description: 'O resumo dos treinos, notícias de última hora dos clubes do Brasileirão e do futebol europeu.',
      badge: '4K AO VIVO'
    },

    // --- TARDE (12:00 - 18:00) ---
    {
      idSuffix: 'globo-ge',
      channelName: 'TV Globo HD São Paulo',
      channelLogo: '🌐',
      category: 'Canais Abertos',
      time: '12:00',
      endTime: '13:00',
      title: 'Globo Esporte SP - Edição Ao Vivo',
      description: 'Gols da rodada, escalações confirmadas dos quatro grandes de SP e reportagens exclusivas com Fred Ring.',
      badge: 'AO VIVO'
    },
    {
      idSuffix: 'sportv-redacao',
      channelName: 'SporTV 1 FHD',
      channelLogo: '🥇',
      category: 'Esportes',
      time: '13:00',
      endTime: '14:30',
      title: 'Redação SporTV - Debate dos Jornalistas',
      description: 'As manchetes dos principais jornais e portais esportivos comentadas por especialistas.',
      badge: 'HD AO VIVO'
    },
    // Champions League / Premier League / Brasileirão Afternoon Slot
    isWeekend
      ? {
          idSuffix: 'espn-premier-league',
          channelName: 'ESPN Brasil 4K',
          channelLogo: '🏆',
          category: 'Esportes',
          time: '13:30',
          endTime: '15:45',
          title: 'Premier League: Manchester City x Liverpool Ao Vivo',
          description: 'Clássico inglês com transmissão em 4K HDR nativo 60fps, narração de Paulo Andrade e comentários de Mauro Cezar.',
          badge: 'AO VIVO · 4K HDR'
        }
      : isMidweek
      ? {
          idSuffix: 'espn-champions-league',
          channelName: 'ESPN Brasil 4K',
          channelLogo: '🏆',
          category: 'Esportes',
          time: '14:00',
          endTime: '16:00',
          title: 'UEFA Champions League: Semifinal Ao Vivo',
          description: 'O maior torneio de clubes do planeta! Imagens em 4K nativo com áudio ambiente e narração em português.',
          badge: 'AO VIVO · 4K'
        }
      : {
          idSuffix: 'tnt-sports-europa',
          channelName: 'TNT Sports 4K',
          channelLogo: '⚡',
          category: 'Esportes',
          time: '14:00',
          endTime: '16:00',
          title: 'Futebol Europeu: Liga dos Campeões & Resumos',
          description: 'Melhores momentos, pré-jogo completo e debates sobre o futebol internacional.',
          badge: '4K AO VIVO'
        },
    {
      idSuffix: 'discovery-predadores',
      channelName: 'Discovery Channel 4K',
      channelLogo: '🌍',
      category: 'Documentários',
      time: '14:30',
      endTime: '16:00',
      title: 'Planeta Selvagem: Grandes Predadores da África',
      description: 'Documentário cinematográfico narrado em português com captação em altíssima resolução nas savanas africanas.',
      badge: '4K ULTRA HD'
    },
    {
      idSuffix: 'telecine-duna2',
      channelName: 'Telecine Premium 4K',
      channelLogo: '🍿',
      category: 'Filmes & Séries',
      time: '15:30',
      endTime: '18:15',
      title: 'Duna: Parte 2 (Dublado e Legendado em 4K)',
      description: 'Paul Atreides e Chani lideram os Fremen na guerra épica pelo destino de Arrakis e do Império.',
      badge: 'CINEMA 4K'
    },
    // Afternoon Football / Special
    isWeekend
      ? {
          idSuffix: 'premiere-brasileirao-sabado',
          channelName: 'Premiere Clubes 1 4K',
          channelLogo: '⚽',
          category: 'Esportes',
          time: '16:00',
          endTime: '18:15',
          title: 'Brasileirão Série A: Flamengo x Palmeiras Ao Vivo',
          description: 'Duelo direto de gigantes pelo topo da tabela do Brasileirão. Pré-jogo com entrevistas exclusivas.',
          badge: 'AO VIVO EXCLUSIVO'
        }
      : {
          idSuffix: 'cazetv-futebol',
          channelName: 'CazéTV Ao Vivo',
          channelLogo: '🔥',
          category: 'Esportes',
          time: '16:00',
          endTime: '18:30',
          title: 'CazéTV Rodada Especial & Melhores Momentos',
          description: 'Transmissão irreverente com Casimiro, Luisinho e convidados especiais cobrindo os maiores lances.',
          badge: 'AO VIVO'
        },
    {
      idSuffix: 'cnn-arena',
      channelName: 'CNN Brasil HD',
      channelLogo: '📰',
      category: 'Notícias',
      time: '17:00',
      endTime: '18:30',
      title: 'CNN Arena: Política, Economia e Decisões de Brasília',
      description: 'Debate aprofundado dos principais analistas políticos sobre as votações do Congresso e mercado financeiro.',
      badge: 'AO VIVO'
    },

    // --- HORÁRIO NOBRE (18:30 - 23:00) ---
    {
      idSuffix: 'sportv-troca-passes',
      channelName: 'SporTV 1 FHD',
      channelLogo: '🥇',
      category: 'Esportes',
      time: '18:30',
      endTime: '20:00',
      title: 'Troca de Passes - Análise Tática da Rodada',
      description: 'Mapas de calor, lances polêmicos e análise detalhada dos técnicos e jogadores com tecnologia gráfica 3D.',
      badge: 'AO VIVO'
    },
    {
      idSuffix: 'globo-jn',
      channelName: 'TV Globo HD São Paulo',
      channelLogo: '🌐',
      category: 'Canais Abertos',
      time: '20:00',
      endTime: '20:45',
      title: 'Jornal Nacional - As Principais Notícias do Brasil',
      description: 'A cobertura dos fatos mais relevantes com William Bonner e Renata Vasconcellos.',
      badge: 'HD AO VIVO'
    },
    // Prime-Time Blockbuster / Big Match
    isMidweek
      ? {
          idSuffix: 'premiere-copa-brasil',
          channelName: 'Premiere Clubes 1 4K',
          channelLogo: '⚽',
          category: 'Esportes',
          time: '21:30',
          endTime: '23:45',
          title: 'Copa do Brasil: Corinthians x São Paulo (Clássico Majestoso)',
          description: 'Decisão em mata-mata pela Copa do Brasil! Clássico paulista com narração exclusiva e câmeras de alta velocidade.',
          badge: 'AO VIVO · 4K'
        }
      : isWeekend
      ? {
          idSuffix: 'ufc-fight-pass',
          channelName: 'UFC Fight Pass Brasil',
          channelLogo: '🥊',
          category: 'Esportes',
          time: '21:00',
          endTime: '01:00',
          title: 'UFC 312: Disputa do Cinturão Mundial dos Médios Ao Vivo',
          description: 'Card principal direto de Las Vegas com lutas de atletas brasileiros no octógono mais famoso do mundo.',
          badge: 'CARD PRINCIPAL AO VIVO'
        }
      : {
          idSuffix: 'globo-novela-9',
          channelName: 'TV Globo HD São Paulo',
          channelLogo: '🌐',
          category: 'Canais Abertos',
          time: '21:00',
          endTime: '22:15',
          title: 'Novela das 9 (Capítulo Especial Inédito)',
          description: 'Reviravolta emocionante na trama das 9 com grandes revelações e atuações premiadas.',
          badge: 'CAPÍTULO INÉDITO'
        },
    {
      idSuffix: 'hbo-max-gladiator2',
      channelName: 'HBO Max Channel 1',
      channelLogo: '🎬',
      category: 'Filmes & Séries',
      time: '20:30',
      endTime: '23:15',
      title: 'Gladiador II (Pré-Estreia Exclusiva 4K Dolby Atmos)',
      description: 'Lucius enfrenta os tiranos do Coliseu na aguardada continuação épica de Ridley Scott.',
      badge: 'SUPERSESSÃO 4K'
    },
    {
      idSuffix: 'warner-the-last-of-us',
      channelName: 'Warner Channel HD',
      channelLogo: '🍿',
      category: 'Filmes & Séries',
      time: '22:00',
      endTime: '23:30',
      title: 'The Last of Us - Temporada 2 (Novo Episódio)',
      description: 'Joel e Ellie chegam a Seattle enfrentando novas facções e infectados mutantes.',
      badge: 'ESTREIA MUNDIAL'
    },

    // --- NOITE ADENTRO / MADRUGADA (23:00 - 02:00) ---
    {
      idSuffix: 'espn-linha-passe',
      channelName: 'ESPN Brasil 4K',
      channelLogo: '🏆',
      category: 'Esportes',
      time: '23:15',
      endTime: '01:00',
      title: 'Linha de Passe - O Debate Definitivo',
      description: 'Mesa redonda mais tradicional da TV com análises sem censura sobre todos os jogos do dia.',
      badge: 'AO VIVO'
    },
    {
      idSuffix: 'natgeo-cosmos',
      channelName: 'National Geographic HD',
      channelLogo: '🌌',
      category: 'Documentários',
      time: '23:30',
      endTime: '01:00',
      title: 'Cosmos: Mundos Possíveis e Buracos Negros',
      description: 'Uma odisseia científica pelas fronteiras do universo guiada pelas mais recentes descobertas espaciais.',
      badge: 'HD ESPECIAL'
    }
  ];

  // Map into verified ProgramItems with real-time isLive & progress flags
  return rawSchedule.map((slot) => {
    const startMins = timeStringToMinutes(slot.time);
    const endMins = timeStringToMinutes(slot.endTime);
    // Handle overnight slots crossing midnight
    const normalizedEndMins = endMins < startMins ? endMins + 1440 : endMins;

    let isLive = false;
    let progress = 0;

    if (isToday && currentMinutes >= 0) {
      const cmpMinutes = currentMinutes < startMins && endMins < startMins 
        ? currentMinutes + 1440 
        : currentMinutes;

      if (cmpMinutes >= startMins && cmpMinutes < normalizedEndMins) {
        isLive = true;
        const totalDuration = normalizedEndMins - startMins;
        const elapsed = cmpMinutes - startMins;
        progress = Math.min(100, Math.max(5, Math.round((elapsed / totalDuration) * 100)));
      } else if (cmpMinutes >= normalizedEndMins) {
        isLive = false;
        progress = 100;
      } else {
        isLive = false;
        progress = 0;
      }
    }

    const uniqueId = `epg-${dateStr}-${slot.idSuffix}`;

    return {
      id: uniqueId,
      channelName: slot.channelName,
      channelLogo: slot.channelLogo,
      category: slot.category,
      time: slot.time,
      endTime: slot.endTime,
      title: slot.title,
      description: slot.description,
      isLive,
      progress: isLive ? progress : undefined,
      badge: isLive ? 'AO VIVO · NO AR AGORA' : slot.badge,
      date: dateStr,
      dayOfWeek
    };
  });
}

/**
 * Recomputes isLive and progress dynamically based on current client clock
 */
export function recalculateProgramsLiveState(programs: ProgramItem[]): ProgramItem[] {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toISOString().split('T')[0];

  return programs.map((prog) => {
    // If the program is from another day, it cannot be live today
    if (prog.date && prog.date !== todayStr) {
      return {
        ...prog,
        isLive: false,
        progress: undefined
      };
    }

    const startMins = timeStringToMinutes(prog.time);
    const endMins = prog.endTime ? timeStringToMinutes(prog.endTime) : startMins + 120;
    const normalizedEnd = endMins < startMins ? endMins + 1440 : endMins;

    if (currentMinutes >= startMins && currentMinutes < normalizedEnd) {
      const totalDuration = normalizedEnd - startMins;
      const elapsed = currentMinutes - startMins;
      const progress = Math.min(100, Math.max(5, Math.round((elapsed / totalDuration) * 100)));
      return {
        ...prog,
        isLive: true,
        progress,
        badge: 'AO VIVO · NO AR AGORA'
      };
    }

    return {
      ...prog,
      isLive: false,
      progress: undefined
    };
  });
}

/**
 * Synchronizes the daily guide with Firestore automatically.
 * Detects date change (daily turnover) and pushes fresh schedule to Firestore.
 */
export async function syncDailyProgramGuide(forceRefresh: boolean = false): Promise<ProgramItem[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const lastSyncDate = localStorage.getItem('zuxo_epg_last_sync_date');
  const nowTimeStr = today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. If same day and not force, check if we have programs in Firestore
  if (!forceRefresh && lastSyncDate === todayStr) {
    try {
      const snap = await getDocs(collection(db, 'programs'));
      if (!snap.empty) {
        const remoteList: ProgramItem[] = [];
        snap.forEach((d) => remoteList.push({ ...d.data(), id: d.id } as ProgramItem));
        const updated = recalculateProgramsLiveState(remoteList);
        localStorage.setItem('zuxo_epg_last_sync_time', nowTimeStr);
        return updated;
      }
    } catch (e) {
      console.warn('Could not read existing remote programs, generating new daily guide', e);
    }
  }

  // 2. Generate brand-new daily guide for today
  const freshPrograms = generateDailyProgramsForDate(today);

  // 3. Sync to Firestore in batch
  try {
    const batch = writeBatch(db);
    for (const prog of freshPrograms) {
      const ref = doc(db, 'programs', prog.id);
      batch.set(ref, prog, { merge: true });
    }
    await batch.commit();

    localStorage.setItem('zuxo_epg_last_sync_date', todayStr);
    localStorage.setItem('zuxo_epg_last_sync_time', nowTimeStr);
    localStorage.setItem('zuxo_epg_cached_programs', JSON.stringify(freshPrograms));
  } catch (err) {
    console.warn('Batch write to Firestore failed, saving to local cache:', err);
    localStorage.setItem('zuxo_epg_last_sync_date', todayStr);
    localStorage.setItem('zuxo_epg_last_sync_time', nowTimeStr);
    localStorage.setItem('zuxo_epg_cached_programs', JSON.stringify(freshPrograms));
  }

  return freshPrograms;
}

/**
 * Background auto-updater: keeps progress bars ticking every 30 seconds
 * and triggers automated daily rollover at midnight.
 */
export function startEpgAutoTicker(
  onTick: (updatedProgs: ProgramItem[]) => void,
  getCurrentPrograms: () => ProgramItem[]
): () => void {
  const intervalId = setInterval(async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastSyncDate = localStorage.getItem('zuxo_epg_last_sync_date');

    // Midnight turnover detected: day changed!
    if (lastSyncDate && lastSyncDate !== todayStr) {
      console.log('Automated Daily Turnover Detected: Refreshing full EPG schedule...');
      const brandNewDay = await syncDailyProgramGuide(true);
      onTick(brandNewDay);
      return;
    }

    // Otherwise recalculate live progress for current programs
    const currentList = getCurrentPrograms();
    if (currentList && currentList.length > 0) {
      const refreshed = recalculateProgramsLiveState(currentList);
      onTick(refreshed);
    }
  }, 30000); // 30 seconds

  return () => clearInterval(intervalId);
}

/**
 * Returns diagnostic metadata about the daily EPG sync
 */
export function getEpgSyncInfo(): EpgSyncInfo {
  const lastSyncDate = localStorage.getItem('zuxo_epg_last_sync_date') || new Date().toISOString().split('T')[0];
  const lastSyncTime = localStorage.getItem('zuxo_epg_last_sync_time') || '06:00';

  return {
    lastSyncDate,
    lastSyncTime,
    totalChannels: 2450,
    isAutoSyncActive: true,
    serverStatus: 'online'
  };
}
