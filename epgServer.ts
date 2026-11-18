import zlib from 'zlib';

// ---------------------------------------------------------------------------
// TV guide (EPG) for Brazil.
// The programme data comes from a public XMLTV file. It is downloaded here, cleaned up and served
// per day, so every visitor sees the real schedule instead of a fixed list.
// ---------------------------------------------------------------------------

const EPG_URL = process.env.EPG_URL || 'https://epg.pw/xmltv/epg_BR.xml.gz';
const REFRESH_EVERY_MS = 3 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 45_000;
const TIME_ZONE = 'America/Sao_Paulo';

type Category = 'Esportes' | 'Filmes & Séries' | 'Canais Abertos' | 'Notícias' | 'Documentários' | 'Infantil';

export interface GuideProgram {
  id: string;
  channelName: string;
  channelLogo: string;
  category: Category;
  time: string;
  endTime: string;
  title: string;
  description: string;
  badge?: string;
  date: string;
  dayOfWeek: string;
}

interface WantedChannel {
  name: string;
  category: Category;
  /** Names the channel goes by in the XMLTV file, after normalizing (see normalizeName). */
  names: string[];
}

const LOGO: Record<Category, string> = {
  Esportes: '⚽',
  'Filmes & Séries': '🎬',
  'Canais Abertos': '📺',
  Notícias: '📰',
  Documentários: '🌍',
  Infantil: '🎨',
};

// The channels shown in the guide. Names are compared after normalizeName().
const WANTED: WantedChannel[] = [
  { name: 'TV Globo', category: 'Canais Abertos', names: ['globo'] },
  { name: 'SBT', category: 'Canais Abertos', names: ['sbt'] },
  { name: 'Record TV', category: 'Canais Abertos', names: ['record', 'record tv'] },
  { name: 'Band', category: 'Canais Abertos', names: ['band'] },
  { name: 'RedeTV!', category: 'Canais Abertos', names: ['rede tv'] },
  { name: 'TV Cultura', category: 'Canais Abertos', names: ['cultura', 'tv cultura'] },

  { name: 'GloboNews', category: 'Notícias', names: ['globonews', 'globo news'] },
  { name: 'CNN Brasil', category: 'Notícias', names: ['cnn brasil'] },
  { name: 'Record News', category: 'Notícias', names: ['record news'] },
  { name: 'Band News', category: 'Notícias', names: ['band news'] },
  { name: 'Jovem Pan News', category: 'Notícias', names: ['jovem pan news'] },

  { name: 'SporTV', category: 'Esportes', names: ['sportv'] },
  { name: 'SporTV 2', category: 'Esportes', names: ['sportv 2'] },
  { name: 'SporTV 3', category: 'Esportes', names: ['sportv 3'] },
  { name: 'ESPN', category: 'Esportes', names: ['espn'] },
  { name: 'ESPN 2', category: 'Esportes', names: ['espn 2'] },
  { name: 'ESPN 3', category: 'Esportes', names: ['espn 3'] },
  { name: 'ESPN 4', category: 'Esportes', names: ['espn 4'] },
  { name: 'ESPN 5', category: 'Esportes', names: ['espn 5'] },
  { name: 'ESPN 6', category: 'Esportes', names: ['espn 6'] },
  { name: 'Premiere', category: 'Esportes', names: ['premiere clubes'] },
  { name: 'Premiere 2', category: 'Esportes', names: ['premiere 2'] },
  { name: 'Premiere 3', category: 'Esportes', names: ['premiere 3'] },
  { name: 'Band Sports', category: 'Esportes', names: ['band sports'] },
  { name: 'Combate', category: 'Esportes', names: ['combate'] },
  { name: 'CONMEBOL TV', category: 'Esportes', names: ['conmebol tv 4'] },

  { name: 'Telecine Premium', category: 'Filmes & Séries', names: ['telecine premium'] },
  { name: 'Telecine Action', category: 'Filmes & Séries', names: ['telecine action'] },
  { name: 'Telecine Pipoca', category: 'Filmes & Séries', names: ['telecine pipoca'] },
  { name: 'Telecine Cult', category: 'Filmes & Séries', names: ['telecine cult'] },
  { name: 'Telecine Fun', category: 'Filmes & Séries', names: ['telecine fun'] },
  { name: 'Telecine Touch', category: 'Filmes & Séries', names: ['telecine touch'] },
  { name: 'HBO', category: 'Filmes & Séries', names: ['hbo'] },
  { name: 'HBO 2', category: 'Filmes & Séries', names: ['hbo 2'] },
  { name: 'HBO Family', category: 'Filmes & Séries', names: ['hbo family'] },
  { name: 'HBO Signature', category: 'Filmes & Séries', names: ['hbo signature'] },
  { name: 'HBO Xtreme', category: 'Filmes & Séries', names: ['hbo xtreme'] },
  { name: 'HBO Pop', category: 'Filmes & Séries', names: ['hbo pop'] },
  { name: 'HBO Plus', category: 'Filmes & Séries', names: ['hbo plus', 'hbo+'] },
  { name: 'HBO Mundi', category: 'Filmes & Séries', names: ['hbo mundi'] },
  { name: 'TNT', category: 'Filmes & Séries', names: ['tnt'] },
  { name: 'TNT Séries', category: 'Filmes & Séries', names: ['tnt séries'] },
  { name: 'Warner Channel', category: 'Filmes & Séries', names: ['warner channel'] },
  { name: 'Cinemax', category: 'Filmes & Séries', names: ['cinemax'] },
  { name: 'Megapix', category: 'Filmes & Séries', names: ['megapix'] },
  { name: 'AXN', category: 'Filmes & Séries', names: ['axn'] },
  { name: 'Universal TV', category: 'Filmes & Séries', names: ['universal channel'] },
  { name: 'Studio Universal', category: 'Filmes & Séries', names: ['studio universal'] },
  { name: 'Sony Channel', category: 'Filmes & Séries', names: ['sony'] },
  { name: 'Canal Brasil', category: 'Filmes & Séries', names: ['canal brasil'] },

  { name: 'Discovery Channel', category: 'Documentários', names: ['discovery', 'discovery channel'] },
  { name: 'Discovery World', category: 'Documentários', names: ['discovery world'] },
  { name: 'Discovery Science', category: 'Documentários', names: ['discovery science'] },
  { name: 'Discovery Turbo', category: 'Documentários', names: ['discovery turbo'] },
  { name: 'Discovery Theater', category: 'Documentários', names: ['discovery theater'] },
  { name: 'Discovery H&H', category: 'Documentários', names: ['discovery home & health', 'discovery home and health'] },
  { name: 'History', category: 'Documentários', names: ['history', 'history channel', 'the history channel'] },
  { name: 'History 2', category: 'Documentários', names: ['history 2'] },
  { name: 'Animal Planet', category: 'Documentários', names: ['animal planet'] },
  { name: 'TLC', category: 'Documentários', names: ['tlc'] },
  { name: 'National Geographic', category: 'Documentários', names: ['national geographic'] },

  { name: 'Discovery Kids', category: 'Infantil', names: ['discovery kids'] },
  { name: 'Cartoon Network', category: 'Infantil', names: ['cartoon network'] },
  { name: 'Cartoonito', category: 'Infantil', names: ['cartoonito'] },
  { name: 'Gloob', category: 'Infantil', names: ['gloob'] },
  { name: 'Tooncast', category: 'Infantil', names: ['tooncast'] },
  { name: 'Disney Channel', category: 'Infantil', names: ['disney channel'] },
];

interface RawProgram {
  channel: string; // name in WANTED
  startMs: number;
  endMs: number;
  title: string;
  description: string;
}

export interface GuideDay {
  date: string;
  coverage: 'full' | 'partial';
  programs: GuideProgram[];
}

interface GuideCache {
  updatedAt: number;
  days: Map<string, GuideDay>;
  channels: number;
  timeZoneShiftHours: number;
}

let cache: GuideCache | null = null;
let loading: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** "São Paulo/SP  Globo HD ³" -> "globo". Region prefixes, quality marks and extra spaces are dropped. */
export function normalizeName(raw: string): string {
  return decodeEntities(raw)
    .toLowerCase()
    .replace(/(são paulo\/sp|belo horizonte\/mg|rio de janeiro\/rj|campinas\/sp)/g, '')
    .replace(/[³]/g, '')
    .replace(/\bhd\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ParsedFile {
  channelNames: Map<string, string>;
  programs: Map<string, Array<{ startLabel: string; stopLabel: string; title: string; description: string }>>;
}

function parseXmltv(xml: string): ParsedFile {
  const channelNames = new Map<string, string>();
  for (const m of xml.matchAll(/<channel id="([^"]+)">\s*<display-name[^>]*>([^<]*)<\/display-name>/g)) {
    channelNames.set(m[1], m[2]);
  }
  const programs: ParsedFile['programs'] = new Map();
  const pattern = /<programme channel="([^"]+)" start="(\d{14})[^"]*" stop="(\d{14})[^"]*">([\s\S]*?)<\/programme>/g;
  for (const m of xml.matchAll(pattern)) {
    const title = m[4].match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? '';
    const description = m[4].match(/<desc[^>]*>([^<]*)<\/desc>/)?.[1] ?? '';
    const list = programs.get(m[1]) || [];
    list.push({ startLabel: m[2], stopLabel: m[3], title: decodeEntities(title).trim(), description: decodeEntities(description).trim() });
    programs.set(m[1], list);
  }
  return { channelNames, programs };
}

/** "20261118073000" read as a clock time at UTC+shift, converted to a real instant. */
function labelToMs(label: string, shiftHours: number): number {
  const ms = Date.UTC(
    Number(label.slice(0, 4)),
    Number(label.slice(4, 6)) - 1,
    Number(label.slice(6, 8)),
    Number(label.slice(8, 10)),
    Number(label.slice(10, 12)),
    Number(label.slice(12, 14))
  );
  return ms - shiftHours * 3_600_000;
}

const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });
const clockFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false });
const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE, weekday: 'long' });

export const brazilDate = (ms: number) => dateFormatter.format(ms);
const brazilClock = (ms: number) => clockFormatter.format(ms).replace(/^24:/, '00:');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const weekdayName = (date: string) => capitalize(weekdayFormatter.format(Date.parse(`${date}T12:00:00-03:00`)));

/**
 * The file labels its times as UTC, but they are really another time zone (so "Jornal Nacional" shows up
 * at 07:30). The shift is found by checking which one puts Jornal Nacional at its real time, 20:00-21:15 in Brasília.
 */
function detectShiftHours(globoPrograms: Array<{ startLabel: string; title: string }>): number {
  let best = 8;
  let bestScore = -1;
  for (const shift of [8, 0, 9, 7, 10, 6, 5, 4, 3, 2, 1, -1, -2, -3, -4, -5, -6, -7, -8, 11, 12]) {
    let score = 0;
    for (const p of globoPrograms) {
      if (!/^jornal nacional/i.test(p.title)) continue;
      const clock = brazilClock(labelToMs(p.startLabel, shift));
      if (clock >= '20:00' && clock <= '21:15') score += 1;
    }
    if (score > bestScore) {
      best = shift;
      bestScore = score;
    }
  }
  if (bestScore <= 0) console.warn('[EPG] Não foi possível confirmar o fuso dos horários; usando UTC+8.');
  return bestScore > 0 ? best : 8;
}

const minutesLabel = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? (m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`) : `${m} min`;
};

function buildDays(parsed: ParsedFile, previous: Map<string, GuideDay> | undefined): { days: Map<string, GuideDay>; shift: number; channels: number } {
  const idsByName = new Map<string, string[]>();
  for (const [id, name] of parsed.channelNames) {
    const key = normalizeName(name);
    idsByName.set(key, [...(idsByName.get(key) || []), id]);
  }
  const candidatesOf = (wanted: WantedChannel) =>
    [...new Set(wanted.names.flatMap((name) => idsByName.get(name) || []))].filter((id) => (parsed.programs.get(id)?.length || 0) > 0);

  // The file's clock is shifted (see detectShiftHours); it is the same for every channel.
  const globo = WANTED.find((w) => w.name === 'TV Globo')!;
  const globoSource = candidatesOf(globo).sort((x, y) => (parsed.programs.get(y)?.length || 0) - (parsed.programs.get(x)?.length || 0))[0];
  const shift = detectShiftHours(globoSource ? parsed.programs.get(globoSource) || [] : []);

  // For each channel the file often carries several sources. Some have more entries but cut the titles
  // short (no "- Ao Vivo", no teams). For each channel and day, among the sources with a similar amount of
  // data, the one with the most descriptive titles wins.
  const grouped = new Map<string, GuideProgram[]>();
  const seen = new Set<string>();
  let channels = 0;
  for (const wanted of WANTED) {
    const sources = candidatesOf(wanted);
    if (sources.length === 0) continue;
    channels += 1;

    const bySourceAndDate = new Map<string, Map<string, RawProgram[]>>();
    for (const id of sources) {
      const perDate = new Map<string, RawProgram[]>();
      for (const p of parsed.programs.get(id) || []) {
        const startMs = labelToMs(p.startLabel, shift);
        const endMs = labelToMs(p.stopLabel, shift);
        const minutes = Math.round((endMs - startMs) / 60_000);
        if (!p.title || minutes <= 0 || /^(fora do ar|sem programa)/i.test(p.title)) continue;
        // Very short slots (promos, vignettes) only add noise, except in sports.
        if (minutes < 10 && wanted.category !== 'Esportes') continue;
        const date = brazilDate(startMs);
        perDate.set(date, [...(perDate.get(date) || []), { channel: wanted.name, startMs, endMs, title: p.title, description: p.description }]);
      }
      bySourceAndDate.set(id, perDate);
    }

    const dates = new Set<string>();
    for (const perDate of bySourceAndDate.values()) for (const date of perDate.keys()) dates.add(date);
    for (const date of dates) {
      const options = sources.map((id) => bySourceAndDate.get(id)?.get(date) || []).filter((list) => list.length > 0);
      const mostEntries = Math.max(...options.map((list) => list.length));
      const avgTitle = (list: RawProgram[]) => list.reduce((sum, p) => sum + p.title.length, 0) / list.length;
      const best = options
        .filter((list) => list.length >= mostEntries * 0.5)
        .sort((x, y) => avgTitle(y) - avgTitle(x) || y.length - x.length)[0];
      for (const p of best) {
        const time = brazilClock(p.startMs);
        const key = `${wanted.name}|${date}|${time}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const minutes = Math.round((p.endMs - p.startMs) / 60_000);
        const list = grouped.get(date) || [];
        list.push({
          id: `epg-${date}-${wanted.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${time.replace(':', '')}`,
          channelName: wanted.name,
          channelLogo: LOGO[wanted.category],
          category: wanted.category,
          time,
          endTime: brazilClock(p.endMs),
          title: p.title,
          description: p.description || `${wanted.name} · duração ${minutesLabel(minutes)}`,
          badge: /ao vivo/i.test(p.title) ? 'AO VIVO' : undefined,
          date,
          dayOfWeek: weekdayName(date),
        });
        grouped.set(date, list);
      }
    }
  }

  // 3. A day is "full" when the main channel has its whole day; the file only covers about four days
  //    and starts in the middle of an afternoon, so the first and last days are partial.
  const days = new Map<string, GuideDay>();
  for (const [date, programs] of grouped) {
    programs.sort((a, b) => a.time.localeCompare(b.time) || a.channelName.localeCompare(b.channelName));
    const globoCount = programs.filter((p) => p.channelName === 'TV Globo').length;
    const firstGlobo = programs.find((p) => p.channelName === 'TV Globo')?.time ?? '99:99';
    days.set(date, { date, coverage: globoCount >= 15 && firstGlobo <= '03:00' ? 'full' : 'partial', programs });
  }

  // 4. Keep what an earlier download already had for a day when the new file has less of it
  //    (the file's window moves forward, so the morning of "today" drops out during the day).
  if (previous) {
    for (const [date, old] of previous) {
      const fresh = days.get(date);
      if (!fresh || old.programs.length > fresh.programs.length) days.set(date, old);
    }
    // Forget days that are more than two days in the past.
    const limit = brazilDate(Date.now() - 2 * 86_400_000);
    for (const date of [...days.keys()]) if (date < limit) days.delete(date);
  }
  return { days, shift, channels };
}

// ---------------------------------------------------------------------------
// Download and cache
// ---------------------------------------------------------------------------

async function download(): Promise<string> {
  const res = await fetch(EPG_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZuxoGuide/1.0)' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = Buffer.from(await res.arrayBuffer());
  const xml = raw[0] === 0x1f && raw[1] === 0x8b ? zlib.gunzipSync(raw) : raw;
  return xml.toString('utf-8');
}

export async function refreshGuide(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const parsed = parseXmltv(await download());
      const { days, shift, channels } = buildDays(parsed, cache?.days);
      if (days.size === 0) throw new Error('arquivo sem programação');
      cache = { updatedAt: Date.now(), days, channels, timeZoneShiftHours: shift };
      const total = [...days.values()].reduce((sum, d) => sum + d.programs.length, 0);
      console.log(`[EPG] Grade atualizada: ${channels} canais, ${days.size} dias, ${total} programas (fuso do arquivo: UTC+${shift}).`);
    } catch (err) {
      console.warn('[EPG] Falha ao atualizar a grade:', (err as Error).message);
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export function startGuideRefresh() {
  void refreshGuide();
  setInterval(() => void refreshGuide(), REFRESH_EVERY_MS).unref();
}

export interface GuideResponse {
  date: string;
  dayOfWeek: string;
  available: boolean;
  coverage: 'full' | 'partial' | 'none';
  updatedAt: string | null;
  source: string;
  timeZone: string;
  channels: number;
  /** Dates that have at least part of their schedule. */
  dates: Array<{ date: string; coverage: 'full' | 'partial' }>;
  programs: GuideProgram[];
}

export async function getGuide(date: string): Promise<GuideResponse | null> {
  if (!cache) await Promise.race([refreshGuide(), new Promise((r) => setTimeout(r, 25_000))]);
  if (!cache) return null;
  const day = cache.days.get(date);
  return {
    date,
    dayOfWeek: weekdayName(date),
    available: !!day,
    coverage: day?.coverage ?? 'none',
    updatedAt: new Date(cache.updatedAt).toISOString(),
    source: 'epg.pw',
    timeZone: TIME_ZONE,
    channels: cache.channels,
    dates: [...cache.days.values()].map((d) => ({ date: d.date, coverage: d.coverage })).sort((a, b) => a.date.localeCompare(b.date)),
    programs: day?.programs ?? [],
  };
}
