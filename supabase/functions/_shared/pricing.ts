import type { Apartment, PriceBreakdown } from './types.ts';
import { dateList, daysBetween } from './dates.ts';

/** Friday and Saturday nights bill at the weekend rate. */
const WEEKEND_DAYS = new Set([5, 6]);

export function priceBreakdown(
  apt: Apartment | undefined,
  checkIn: string,
  checkOut: string,
): PriceBreakdown {
  if (!apt) return { valid: false, tooShort: false };

  const nights = daysBetween(checkIn, checkOut);
  if (nights <= 0) return { valid: false, tooShort: false };
  if (nights < apt.minStay) return { valid: false, tooShort: true };

  let weekendNights = 0;
  let standardNights = 0;
  for (const d of dateList(checkIn, checkOut)) {
    if (WEEKEND_DAYS.has(d.getDay())) weekendNights++;
    else standardNights++;
  }

  const standardTotal = standardNights * apt.nightly;
  const weekendTotal = weekendNights * apt.weekend;
  const stayOnlyTotal = standardTotal + weekendTotal;

  return {
    valid: true,
    tooShort: false,
    nights,
    standardNights,
    weekendNights,
    hasWeekend: weekendNights > 0,
    standardTotal,
    weekendTotal,
    stayOnlyTotal,
    cleaning: apt.cleaning,
    deposit: apt.deposit,
    dueOnline: stayOnlyTotal + apt.cleaning,
    total: stayOnlyTotal + apt.cleaning + apt.deposit,
  };
}
