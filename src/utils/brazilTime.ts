// Every schedule in the app is shown in Brasília time, whatever the device's own clock says.

const TIME_ZONE = 'America/Sao_Paulo';
const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });
const partsFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const longDateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** "2026-11-18" for the given moment, in Brasília. */
export function brazilDateString(date: Date = new Date()): string {
  return dateFormatter.format(date);
}

/** Minutes since midnight in Brasília. */
export function brazilMinutes(date: Date = new Date()): number {
  const [h, m] = partsFormatter.format(date).split(':').map(Number);
  return (h % 24) * 60 + m;
}

/** "14:32:05" in Brasília. */
export function brazilClock(date: Date = new Date()): string {
  return partsFormatter.format(date).replace(/^24:/, '00:');
}

/** Moves a "YYYY-MM-DD" date by a number of days. */
export function addDays(dateString: string, days: number): string {
  const d = new Date(`${dateString}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return brazilDateString(d);
}

/** "Quarta-feira, 18 de novembro de 2026" */
export function formatLongDate(dateString: string): string {
  const text = longDateFormatter.format(new Date(`${dateString}T12:00:00-03:00`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
