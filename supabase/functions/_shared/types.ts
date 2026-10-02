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
  minStay: number;
  checkinTime: string;
  checkoutTime: string;
}

/** The editable part of a room's listing, as stored in `room_rates`. Naira. */
export interface RoomRate {
  apartmentId: number;
  nightly: number;
  weekend: number;
  weekly: number;
  monthly: number;
  minStay: number;
  updatedAt?: string;
  updatedBy?: string;
}

/** Charges added to every booking, as stored in `pricing_settings`. */
export interface PricingSettings {
  /** Percent of the room subtotal, e.g. 7.5. */
  taxRate: number;
  /** Refundable caution deposit in naira, once per booking. */
  cautionDeposit: number;
  updatedAt?: string;
  updatedBy?: string;
}

export type LoggedRateField = 'nightly' | 'weekend' | 'weekly' | 'monthly' | 'min_stay' | 'tax_rate' | 'caution_deposit';

/** One logged change to a room's rates or to the booking-wide charges. Only the fields that changed are present. */
export interface RateChange {
  id: number;
  /** Null for a change to tax or deposit, which apply to every booking. */
  apartmentId: number | null;
  changes: Partial<Record<LoggedRateField, { from: number | null; to: number }>>;
  note: string;
  changedBy: string;
  changedAt: string;
}

/** Result of pricing a stay. `valid` gates every money field below it. */
export type PriceBreakdown =
  | { valid: false; tooShort: boolean }
  | {
      valid: true;
      tooShort: false;
      nights: number;
      /** Nightly charges for each room, before tax. */
      lines: { apartment: Apartment; total: number }[];
      /** All rooms' nightly charges, before tax. */
      subtotal: number;
      /** Percent applied to the subtotal. */
      taxRate: number;
      /** Tax on the subtotal. */
      tax: number;
      /** Refundable caution deposit, charged at payment and returned after checkout. */
      deposit: number;
      /** What is paid at booking: subtotal, tax and deposit. */
      dueOnline: number;
      /** Everything, deposit included. Equal to dueOnline. */
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
  /** Every room the booking holds, for the same dates. */
  apartmentIds: number[];
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  payment: PaymentMethod | 'cash' | 'other';
  /** Everything the guest pays, in naira: rooms, tax and caution deposit. */
  total: number;
  /** Refundable caution deposit in naira. Part of `total`. */
  deposit: number;
  /** Naira due at payment. What Paystack charges. */
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
