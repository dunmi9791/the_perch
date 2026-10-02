import type { BookingStatus, DateBlock, StayHold } from './types.ts';
import { isoDate } from './dates.ts';

export type DayStatus = 'available' | 'pending' | 'confirmed' | 'blocked';

/** Half-open ranges [aStart, aEnd) and [bStart, bEnd) overlap. Works on yyyy-mm-dd strings. */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Bookings that still hold their dates — cancelled ones release them. */
export function activeBookings<T extends { status: BookingStatus }>(bookings: T[]): T[] {
  return bookings.filter((b) => b.status !== 'cancelled');
}

/** Whether an apartment can be sold for [checkIn, checkOut). Pending bookings hold dates too. */
export function isAvailable(
  apartmentId: number,
  checkIn: string,
  checkOut: string,
  bookings: StayHold[],
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
  bookings: StayHold[],
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
  bookings: StayHold[],
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
