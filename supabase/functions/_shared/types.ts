/**
 * Domain types shared by the website and the Supabase edge functions.
 * Keep this file free of browser or Deno specifics — it is imported by both.
 */

export interface Apartment {
  id: number;
  name: string;
  type: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: string;
  beds: string;
  size: string;
  unitCount: number;
  photo?: string;
  bedroomPhoto?: string;
  bathroomPhoto?: string;
  shortDesc: string;
  longDesc: string;
  amenities: string[];
  nightly: number;
  weekend: number;
  weekly: number;
  monthly: number;
  cleaning: number;
  deposit: number;
  minStay: number;
  checkinTime: string;
  checkoutTime: string;
}

/** Result of pricing a stay. `valid` gates every money field below it. */
export type PriceBreakdown =
  | { valid: false; tooShort: boolean }
  | {
      valid: true;
      tooShort: false;
      nights: number;
      standardNights: number;
      weekendNights: number;
      hasWeekend: boolean;
      standardTotal: number;
      weekendTotal: number;
      /** Nightly charges only, before cleaning and deposit. */
      stayOnlyTotal: number;
      cleaning: number;
      deposit: number;
      /** Stay plus cleaning: what is paid before arrival. The deposit is collected at check-in. */
      dueOnline: number;
      /** Everything, deposit included. */
      total: number;
    };

export interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  arrival: string;
  purpose: string;
  requests: string;
}

export type PaymentMethod = 'paystack' | 'flutterwave' | 'transfer' | 'arrival';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type BookingSource = 'website' | 'offline';
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';

/** A reservation as stored in the database — website submissions and offline entries alike. */
export interface BookingRecord {
  ref: string;
  apartmentId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  payment: PaymentMethod | 'cash' | 'other';
  /** Stay total including fees and deposit, in naira. */
  total: number;
  /** Refundable deposit in naira, collected at check-in. Part of `total`. */
  deposit: number;
  /** Naira due before arrival (total minus deposit). What Paystack charges. */
  amountDue: number;
  status: BookingStatus;
  source: BookingSource;
  note: string;
  createdAt: string;
  paymentStatus: PaymentStatus;
  /** Processor reference for the successful attempt (Paystack, phase 1). */
  paymentRef?: string;
  paymentChannel?: string;
  /** Naira, as verified with the processor. */
  paidAmount?: number;
  paidAt?: string;
  /** While unpaid, the moment the held nights go back on sale. */
  holdExpiresAt?: string;
}

/**
 * The slice of a booking the public site needs to know a room is taken.
 * Guest details never leave the database for anonymous visitors.
 */
export interface StayHold {
  apartmentId: number;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
}

/** A date range an admin has taken off sale for one apartment (maintenance, owner use, etc). */
export interface DateBlock {
  id: string;
  apartmentId: number;
  /** Inclusive yyyy-mm-dd. */
  start: string;
  /** Exclusive yyyy-mm-dd, like a check-out date. */
  end: string;
  reason: string;
}
