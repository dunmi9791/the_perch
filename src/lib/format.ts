const NAIRA = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

/** Intl renders NGN as "NGN 1,234" in some runtimes; the design wants the ₦ sign. */
export function fmt(n: number): string {
  return NAIRA.format(n).replace('NGN', '₦');
}

/** Whole nights between two yyyy-mm-dd strings. Zero when unset or reversed. */
export function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const diff = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
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
    d = new Date(d.getTime() + 86400000);
  }
  return out;
}

export function bedroomsLabel(bedrooms: number): string {
  return bedrooms === 0 ? 'Studio' : `${bedrooms} Bedroom${bedrooms > 1 ? 's' : ''}`;
}

export function nightsLabel(nights: number): string {
  return `${nights} night${nights > 1 ? 's' : ''}`;
}
