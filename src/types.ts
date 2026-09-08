export type Screen =
  | 'home'
  | 'apartments'
  | 'detail'
  | 'availability'
  | 'booking'
  | 'gallery'
  | 'about'
  | 'contact'
  | 'admin';

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

export interface BookingState {
  step: 1 | 2 | 3 | 4 | 5;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  apartmentId: number | null;
  guest: GuestDetails;
  payment: PaymentMethod;
}

export interface AvailabilityState {
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
}

export interface FilterState {
  checkIn: string;
  checkOut: string;
  /** '0' means "any". */
  guests: string;
  /** '-1' means "any"; '0' means studio. */
  bedrooms: string;
  /** '0' means "any". */
  maxPrice: string;
}

export interface GalleryImage {
  slotId: string;
  category: string;
  caption: string;
  rowSpan: number;
  photo?: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type BookingSource = 'website' | 'offline';

/** A reservation as stored by the admin store — website submissions and offline entries alike. */
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
  status: BookingStatus;
  source: BookingSource;
  note: string;
  createdAt: string;
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
