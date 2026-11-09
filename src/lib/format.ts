export { dateList, daysBetween } from '@shared/dates.ts';

const NAIRA = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

/** Intl renders NGN as "NGN 1,234" in some runtimes; the design wants the ₦ sign. */
export function fmt(n: number): string {
  return NAIRA.format(n).replace('NGN', '₦');
}

export function bedroomsLabel(bedrooms: number): string {
  return bedrooms === 0 ? 'Studio' : `${bedrooms} Bedroom${bedrooms > 1 ? 's' : ''}`;
}

export function nightsLabel(nights: number): string {
  return `${nights} night${nights > 1 ? 's' : ''}`;
}

const LONG_DAY = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const SHORT_DAY = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * A stay as one readable line — "10 – 12 Nov 2026" — dropping the month and
 * year from the first date when both dates share them.
 */
export function dateRangeLabel(checkIn: string, checkOut: string): string {
  if (!checkIn || !checkOut) return '';
  const from = new Date(`${checkIn}T00:00:00Z`);
  const to = new Date(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return '';
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
  const sameMonth = sameYear && from.getUTCMonth() === to.getUTCMonth();
  const first = sameMonth ? String(from.getUTCDate()) : sameYear ? SHORT_DAY.format(from) : LONG_DAY.format(from);
  return `${first} – ${LONG_DAY.format(to)}`;
}
