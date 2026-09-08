import type { BookingRecord, DateBlock } from '../types';

export type DayStatus = 'available' | 'pending' | 'confirmed' | 'blocked';

/** Half-open ranges [aStart, aEnd) and [bStart, bEnd) overlap. Works on yyyy-mm-dd strings. */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** yyyy-mm-dd for a Date in local time (toISOString would shift the day near midnight). */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayIso(): string {
  return isoDate(new Date());
}

/** Bookings that still hold their dates — cancelled ones release them. */
export function activeBookings(bookings: BookingRecord[]): BookingRecord[] {
  return bookings.filter((b) => b.status !== 'cancelled');
}

/** Whether an apartment can be sold for [checkIn, checkOut). Pending bookings hold dates too. */
export function isAvailable(
  apartmentId: number,
  checkIn: string,
  checkOut: string,
  bookings: BookingRecord[],
  blocks: DateBlock[],
): boolean {
  if (!checkIn || !checkOut || checkIn >= checkOut) return true;
  const clash =
    activeBookings(bookings).some(
      (b) => b.apartmentId === apartmentId && rangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut),
    ) ||
    blocks.some(
      (bl) => bl.apartmentId === apartmentId && rangesOverlap(checkIn, checkOut, bl.start, bl.end),
    );
  return !clash;
}

/** What holds a given night for an apartment. Blocks win over bookings so maintenance shows clearly. */
export function dayStatus(
  apartmentId: number,
  date: string,
  bookings: BookingRecord[],
  blocks: DateBlock[],
): DayStatus {
  if (blocks.some((bl) => bl.apartmentId === apartmentId && bl.start <= date && date < bl.end)) {
    return 'blocked';
  }
  const hit = activeBookings(bookings).find(
    (b) => b.apartmentId === apartmentId && b.checkIn <= date && date < b.checkOut,
  );
  if (!hit) return 'available';
  return hit.status === 'confirmed' ? 'confirmed' : 'pending';
}

/** Nights an apartment is held (confirmed or pending) within a month, for occupancy stats. */
export function nightsHeldInRange(
  apartmentId: number,
  rangeStart: string,
  rangeEnd: string,
  bookings: BookingRecord[],
  blocks: DateBlock[],
): number {
  let count = 0;
  let d = new Date(rangeStart);
  const end = new Date(rangeEnd);
  while (d < end) {
    if (dayStatus(apartmentId, isoDate(d), bookings, blocks) !== 'available') count++;
    d = new Date(d.getTime() + 86400000);
  }
  return count;
}
