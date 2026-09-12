import type { Apartment, GuestDetails } from './types.ts';
import { daysBetween, todayIso } from './dates.ts';

/** Why a check-in/check-out pair cannot be booked, or null when it can. */
export function stayError(checkIn: string, checkOut: string, today: string = todayIso()): string | null {
  if (!checkIn || !checkOut) return 'Please select both a check-in and a check-out date.';
  if (checkIn < today) return 'Check-in date cannot be in the past.';
  if (daysBetween(checkIn, checkOut) <= 0) return 'Check-out date must be after check-in date.';
  return null;
}

export function totalGuests(adults: string | number, children: string | number): number {
  return Math.max(1, Number(adults) || 0) + Math.max(0, Number(children) || 0);
}

export function fitsCapacity(apt: Apartment, adults: string | number, children: string | number): boolean {
  return totalGuests(adults, children) <= apt.maxGuests;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Why the guest form cannot advance, or null when it can. Whitespace does not count as input. */
export function guestError(guest: GuestDetails): string | null {
  if (!guest.name.trim()) return 'Please enter your full name.';
  if (!EMAIL_RE.test(guest.email.trim())) return 'Please enter a valid email address.';
  const digits = guest.phone.replace(/\D/g, '');
  if (digits.length < 7) return 'Please enter a valid phone number.';
  return null;
}
