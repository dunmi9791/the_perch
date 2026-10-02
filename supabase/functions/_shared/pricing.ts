import type { Apartment, PriceBreakdown, PricingSettings } from './types.ts';
import { dateList, daysBetween } from './dates.ts';

/** Friday and Saturday nights bill at the weekend rate. */
const WEEKEND_DAYS = new Set([5, 6]);

/**
 * Tax and deposit as of October 2026. Like the room rates in apartments.ts,
 * these are only a fallback for the site until the live values load from
 * `pricing_settings`; staff edit those, and the server never prices from
 * these.
 */
export const DEFAULT_PRICING: PricingSettings = { taxRate: 7.5, cautionDeposit: 100000 };

/** A website booking takes at least this many rooms. */
export const MIN_ROOMS = 2;

/** Nightly charges for one room over [checkIn, checkOut), before tax. */
export function roomStayTotal(apt: Apartment, checkIn: string, checkOut: string): number {
  let total = 0;
  for (const d of dateList(checkIn, checkOut)) {
    total += WEEKEND_DAYS.has(d.getDay()) ? apt.weekend : apt.nightly;
  }
  return total;
}

/**
 * Prices a stay across one or more rooms for the same dates. Tax is charged
 * on the room subtotal; the caution deposit is added once and is due with
 * everything else at payment.
 */
export function priceBreakdown(
  apts: (Apartment | undefined)[],
  checkIn: string,
  checkOut: string,
  pricing: PricingSettings,
): PriceBreakdown {
  const rooms = apts.filter((a): a is Apartment => Boolean(a));
  if (rooms.length === 0 || rooms.length !== apts.length) return { valid: false, tooShort: false };

  const nights = daysBetween(checkIn, checkOut);
  if (nights <= 0) return { valid: false, tooShort: false };
  const minStay = Math.max(...rooms.map((a) => a.minStay));
  if (nights < minStay) return { valid: false, tooShort: true };

  const lines = rooms.map((apartment) => ({ apartment, total: roomStayTotal(apartment, checkIn, checkOut) }));
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const tax = Math.round((subtotal * pricing.taxRate) / 100);
  const deposit = pricing.cautionDeposit;
  const total = subtotal + tax + deposit;

  return {
    valid: true,
    tooShort: false,
    nights,
    lines,
    subtotal,
    taxRate: pricing.taxRate,
    tax,
    deposit,
    dueOnline: total,
    total,
  };
}
