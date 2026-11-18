import { ProgramItem } from '../types';
import { brazilDateString, brazilMinutes } from '../utils/brazilTime';

// "HH:MM" -> minutes since midnight
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

export interface GuideData {
  date: string;
  dayOfWeek: string;
  /** false when the schedule file does not reach this day yet */
  available: boolean;
  coverage: 'full' | 'partial' | 'none';
  updatedAt: string | null;
  source: string;
  channels: number;
  dates: Array<{ date: string; coverage: 'full' | 'partial' }>;
  programs: ProgramItem[];
}

const cacheKey = (date: string) => `zuxo_guide_${date}`;

/**
 * The real schedule for one day (Brasília time), from the server.
 * If the server cannot be reached, the last copy saved on this device for that day is used.
 */
export async function fetchGuide(date: string): Promise<{ guide: GuideData; fromCache: boolean }> {
  try {
    const res = await fetch(`/api/epg?date=${encodeURIComponent(date)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const guide = (await res.json()) as GuideData;
    try {
      localStorage.setItem(cacheKey(date), JSON.stringify(guide));
    } catch {}
    return { guide, fromCache: false };
  } catch (err) {
    try {
      const saved = localStorage.getItem(cacheKey(date));
      if (saved) return { guide: JSON.parse(saved) as GuideData, fromCache: true };
    } catch {}
    throw err;
  }
}

/** Events added by hand in the admin panel carry a date; the sample entries of older versions do not. */
export function isManualProgram(p: ProgramItem): boolean {
  return p.id.startsWith('prog-') && !!p.date && !!p.time;
}

export interface ProgramTiming {
  startMins: number;
  /** end in minutes since the start of the program's own day; above 1440 when it runs past midnight */
  endMins: number;
}

export function programTiming(p: ProgramItem): ProgramTiming {
  const startMins = timeStringToMinutes(p.time);
  const rawEnd = p.endTime ? timeStringToMinutes(p.endTime) : startMins + 120;
  return { startMins, endMins: rawEnd <= startMins ? rawEnd + 1440 : rawEnd };
}

/**
 * Marks what is on air right now and how far along it is, using Brasília time.
 * Programs of other days are never live.
 */
export function recalculateProgramsLiveState(programs: ProgramItem[], now: Date = new Date()): ProgramItem[] {
  const today = brazilDateString(now);
  const nowMins = brazilMinutes(now);
  return programs.map((p) => {
    if (p.date !== today) return { ...p, isLive: false, progress: undefined };
    const { startMins, endMins } = programTiming(p);
    if (nowMins >= startMins && nowMins < endMins) {
      const progress = Math.min(100, Math.max(1, Math.round(((nowMins - startMins) / (endMins - startMins)) * 100)));
      return { ...p, isLive: true, progress };
    }
    return { ...p, isLive: false, progress: undefined };
  });
}

/** True when a program of today has already finished. */
export function hasEnded(p: ProgramItem, now: Date = new Date()): boolean {
  const today = brazilDateString(now);
  if (!p.date || p.date > today) return false;
  if (p.date < today) return true;
  return brazilMinutes(now) >= programTiming(p).endMins;
}
