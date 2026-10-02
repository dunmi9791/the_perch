import type { Apartment, GuestDetails, PaymentMethod, PriceBreakdown, PricingSettings } from './types.ts';
import { findApartment } from './apartments.ts';
import { daysBetween, isIsoDate } from './dates.ts';
import { MIN_ROOMS, priceBreakdown } from './pricing.ts';
import { fitsCapacity, guestError, roomCapacity, stayError } from './validation.ts';

/** What the website sends to create a booking. Money is never part of it: the server prices the stay. */
export interface BookingInput {
  /** At least MIN_ROOMS distinct rooms, all for the same dates. */
  apartmentIds: number[];
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guest: GuestDetails;
  payment: PaymentMethod;
}

/** Methods a guest may pick online. */
const ONLINE_METHODS: ReadonlySet<string> = new Set<PaymentMethod>(['paystack', 'transfer', 'arrival']);

/** Pay on Arrival is only offered when there is time to chase a no-show. */
export const ARRIVAL_MIN_DAYS_AHEAD = 2;

export function arrivalPaymentAllowed(checkIn: string, today: string): boolean {
  return daysBetween(today, checkIn) >= ARRIVAL_MIN_DAYS_AHEAD;
}

const LIMITS = { name: 120, email: 254, phone: 40, text: 600 } as const;

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function int(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
}

export type ParsedBooking =
  | { ok: true; input: BookingInput; apartments: Apartment[]; price: Extract<PriceBreakdown, { valid: true }> }
  | { ok: false; status: 400 | 422; error: string; field?: 'stay' | 'apartment' | 'guest' | 'payment' };

/**
 * Turns an untrusted request body into a booking we are willing to store,
 * running the same rules the website runs before it lets a guest reach step 4.
 * `rooms` and `pricing` carry the live rates, tax and deposit, so the stay is
 * priced at today's rate card.
 * Availability is checked separately, against the database.
 */
export function parseBookingInput(
  raw: unknown,
  today: string,
  rooms: Apartment[],
  pricing: PricingSettings,
): ParsedBooking {
  if (!raw || typeof raw !== 'object') return { ok: false, status: 400, error: 'Expected a JSON body.' };
  const body = raw as Record<string, unknown>;

  const rawIds = Array.isArray(body.apartmentIds) ? body.apartmentIds : [];
  const ids = [...new Set(rawIds.map(int))];
  const picked = ids.map((id) => (id === null ? undefined : findApartment(id, rooms)));
  if (picked.some((a) => !a)) return { ok: false, status: 422, error: 'Unknown apartment.', field: 'apartment' };
  const chosen = picked as Apartment[];
  if (chosen.length < MIN_ROOMS) {
    return { ok: false, status: 422, error: `Please choose at least ${MIN_ROOMS} rooms.`, field: 'apartment' };
  }

  const checkIn = isIsoDate(body.checkIn) ? body.checkIn : '';
  const checkOut = isIsoDate(body.checkOut) ? body.checkOut : '';
  const stayProblem = stayError(checkIn, checkOut, today);
  if (stayProblem) return { ok: false, status: 422, error: stayProblem, field: 'stay' };

  const adults = int(body.adults) ?? 1;
  const children = int(body.children) ?? 0;
  if (adults < 1 || children < 0 || !fitsCapacity(chosen, adults, children)) {
    return {
      ok: false,
      status: 422,
      error: `The rooms you chose sleep up to ${roomCapacity(chosen)} guests. Add another room.`,
      field: 'apartment',
    };
  }

  const price = priceBreakdown(chosen, checkIn, checkOut, pricing);
  if (!price.valid) {
    const minStay = Math.max(...chosen.map((a) => a.minStay));
    return {
      ok: false,
      status: 422,
      error: price.tooShort ? `These rooms have a ${minStay}-night minimum stay.` : 'Those dates cannot be priced.',
      field: 'stay',
    };
  }

  const g = (body.guest && typeof body.guest === 'object' ? body.guest : {}) as Record<string, unknown>;
  const guest: GuestDetails = {
    name: str(g.name, LIMITS.name),
    email: str(g.email, LIMITS.email),
    phone: str(g.phone, LIMITS.phone),
    whatsapp: str(g.whatsapp, LIMITS.phone),
    arrival: str(g.arrival, LIMITS.phone),
    purpose: str(g.purpose, LIMITS.text),
    requests: str(g.requests, LIMITS.text),
  };
  const guestProblem = guestError(guest);
  if (guestProblem) return { ok: false, status: 422, error: guestProblem, field: 'guest' };

  const payment = typeof body.payment === 'string' ? body.payment : '';
  if (!ONLINE_METHODS.has(payment)) {
    return { ok: false, status: 422, error: 'Choose a payment method.', field: 'payment' };
  }
  if (payment === 'arrival' && !arrivalPaymentAllowed(checkIn, today)) {
    return {
      ok: false,
      status: 422,
      error: 'Pay on Arrival is only available for stays booked at least 48 hours ahead. Please choose another payment method.',
      field: 'payment',
    };
  }

  return {
    ok: true,
    apartments: chosen,
    price,
    input: {
      apartmentIds: chosen.map((a) => a.id),
      checkIn,
      checkOut,
      adults,
      children,
      guest,
      payment: payment as PaymentMethod,
    },
  };
}
