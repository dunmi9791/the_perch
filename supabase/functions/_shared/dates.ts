/** Date helpers on yyyy-mm-dd strings. Shared by the site and the edge functions. */

const DAY_MS = 86400000;

/** Whole nights between two yyyy-mm-dd strings. Zero when unset or reversed. */
export function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const diff = Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);
  return diff > 0 ? diff : 0;
}

/** Every night actually slept in — check-in inclusive, check-out exclusive. */
export function dateList(checkIn: string, checkOut: string): Date[] {
  const out: Date[] = [];
  if (!checkIn || !checkOut) return out;
  let d = new Date(checkIn);
  const end = new Date(checkOut);
  while (d < end) {
    out.push(new Date(d));
    d = new Date(d.getTime() + DAY_MS);
  }
  return out;
}

/** yyyy-mm-dd for a Date in local time (toISOString would shift the day near midnight). */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Today as yyyy-mm-dd. In the browser this is the visitor's local day; the
 * server passes the property's zone so "not in the past" means the same thing
 * regardless of where the function happens to run.
 */
export function todayIso(timeZone?: string): string {
  if (!timeZone) return isoDate(new Date());
  // en-CA formats as yyyy-mm-dd.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export const PROPERTY_TIME_ZONE = 'Africa/Lagos';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a well-formed yyyy-mm-dd that names a real calendar day. */
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !ISO_DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
