import type { GuestDetails, PaymentMethod } from '@shared/types.ts';

// Domain types live in the shared layer so the edge functions use the same definitions.
export type {
  Apartment,
  BookingRecord,
  BookingSource,
  BookingStatus,
  DateBlock,
  GuestDetails,
  PaymentMethod,
  PaymentStatus,
  PriceBreakdown,
  StayHold,
} from '@shared/types.ts';

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
