// Occupancy rules are shared with the edge functions; the implementation lives in the shared layer.
export type { DayStatus } from '@shared/occupancy.ts';
export { activeBookings, dayStatus, isAvailable, nightsHeldInRange, rangesOverlap } from '@shared/occupancy.ts';
export { isoDate, todayIso } from '@shared/dates.ts';
