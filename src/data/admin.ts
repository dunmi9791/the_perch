import { c } from '../theme';
import type { BookingStatus } from '../types';

export const ADMIN_TABS = [
  { key: 'overview', label: 'Dashboard' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'calendar', label: 'Calendar & Blocks' },
  { key: 'guests', label: 'Guests' },
  { key: 'apartments', label: 'Apartments' },
  { key: 'rates', label: 'Rates & Pricing' },
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number]['key'];

/**
 * Gate for the admin area. This is a convenience lock for a static site, not
 * real security — move auth to a server before exposing sensitive guest data.
 */
export const ADMIN_PASSCODE = 'perch2026';

export const STATUS_STYLE: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  pending: { bg: '#F8ECD6', color: '#8A6A2A', label: 'Pending' },
  confirmed: { bg: c.sageBg, color: c.sageText, label: 'Confirmed' },
  cancelled: { bg: '#F1E4E4', color: c.danger, label: 'Cancelled' },
};

export const PAYMENT_LABEL: Record<string, string> = {
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  transfer: 'Bank Transfer',
  arrival: 'Pay on Arrival',
  cash: 'Cash',
  other: 'Other',
};

export const CALENDAR_LEGEND = [
  { label: 'Confirmed', color: c.navy },
  { label: 'Pending / Awaiting Payment', color: c.gold },
  { label: 'Blocked (offline / maintenance)', color: '#D8D3C6' },
  { label: 'Available', color: c.sageBg },
];
