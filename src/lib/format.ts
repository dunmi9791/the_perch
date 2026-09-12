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
