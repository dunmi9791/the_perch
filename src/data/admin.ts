import { fmt } from '../lib/format';
import { c } from '../theme';

/** Everything below is illustrative demo data — the admin screen is a mockup. */

export const ADMIN_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'apartments', label: 'Apartments' },
  { key: 'rates', label: 'Rates & Pricing' },
  { key: 'guests', label: 'Guests' },
  { key: 'payments', label: 'Payments' },
  { key: 'reports', label: 'Reports' },
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number]['key'];

export const ADMIN_STATS = [
  { label: 'Arrivals Today', value: '3' },
  { label: 'Departures Today', value: '2' },
  { label: 'Current Guests', value: '11' },
  { label: 'Available Units Today', value: '6' },
  { label: 'Pending Reservations', value: '4' },
  { label: 'Awaiting Payment', value: '2' },
  { label: 'Monthly Revenue', value: fmt(4820000) },
  { label: 'Occupancy', value: '68%' },
];

const STATUS_CONFIRMED = { statusBg: c.sageBg, statusColor: c.sageText };
const STATUS_AWAITING = { statusBg: '#F8ECD6', statusColor: '#8A6A2A' };
const STATUS_CHECKED_IN = { statusBg: '#E6EEF3', statusColor: c.navy };
const STATUS_PENDING = { statusBg: '#F1E9E4', statusColor: '#8A5A3A' };

export const ADMIN_ARRIVALS = [
  {
    guest: 'Chidinma O.',
    apt: 'The Roost',
    dates: 'Aug 6 → Aug 9',
    type: 'Arrival',
    status: 'Confirmed',
    ...STATUS_CONFIRMED,
  },
  {
    guest: 'James Okon',
    apt: 'The Aviary',
    dates: 'Aug 6 → Aug 12',
    type: 'Arrival',
    status: 'Awaiting Payment',
    ...STATUS_AWAITING,
  },
  {
    guest: 'Grace A.',
    apt: 'The Nest Studio',
    dates: 'Aug 3 → Aug 6',
    type: 'Departure',
    status: 'Checked In',
    ...STATUS_CHECKED_IN,
  },
  {
    guest: 'Corporate — Zenera Ltd',
    apt: 'The Sanctuary',
    dates: 'Aug 4 → Aug 6',
    type: 'Departure',
    status: 'Checked In',
    ...STATUS_CHECKED_IN,
  },
  {
    guest: 'Tunde B.',
    apt: 'The Nestled Suite',
    dates: 'Aug 6 → Aug 8',
    type: 'Arrival',
    status: 'Confirmed',
    ...STATUS_CONFIRMED,
  },
];

export const ADMIN_GUESTS = [
  { name: 'Chidinma O.', contact: '0803 xxx xx12', stays: 3, balance: fmt(0) },
  { name: 'James Okon', contact: '0806 xxx xx45', stays: 1, balance: fmt(95000) },
  { name: 'Grace A.', contact: '0701 xxx xx78', stays: 5, balance: fmt(0) },
  { name: 'Zenera Ltd (Corporate)', contact: '0812 xxx xx01', stays: 8, balance: fmt(0) },
  { name: 'Tunde B.', contact: '0909 xxx xx33', stays: 2, balance: fmt(40000) },
  { name: 'Amaka N.', contact: '0705 xxx xx90', stays: 1, balance: fmt(0) },
];

export const ADMIN_PAYMENTS = [
  {
    ref: 'PRC-10245',
    guest: 'Chidinma O.',
    amount: fmt(195000),
    method: 'Paystack',
    status: 'Verified',
    ...STATUS_CONFIRMED,
  },
  {
    ref: 'PRC-10246',
    guest: 'James Okon',
    amount: fmt(95000),
    method: 'Bank Transfer',
    status: 'Under Review',
    ...STATUS_AWAITING,
  },
  {
    ref: 'PRC-10247',
    guest: 'Grace A.',
    amount: fmt(148000),
    method: 'Flutterwave',
    status: 'Verified',
    ...STATUS_CONFIRMED,
  },
  {
    ref: 'PRC-10248',
    guest: 'Zenera Ltd',
    amount: fmt(560000),
    method: 'Bank Transfer',
    status: 'Verified',
    ...STATUS_CONFIRMED,
  },
  {
    ref: 'PRC-10249',
    guest: 'Tunde B.',
    amount: fmt(40000),
    method: 'Pay on Arrival',
    status: 'Pending',
    ...STATUS_PENDING,
  },
  {
    ref: 'PRC-10250',
    guest: 'Amaka N.',
    amount: fmt(65000),
    method: 'Paystack',
    status: 'Verified',
    ...STATUS_CONFIRMED,
  },
];

export const REPORT_LIST = [
  'Daily Arrivals & Departures',
  'Occupancy Report',
  'Apartment Performance',
  'Booking Sources',
  'Revenue by Apartment',
  'Revenue by Date Range',
  'Outstanding Payments',
  'Cancelled Bookings',
  'Guest History',
  'Discounts Granted',
];

export const CALENDAR_LEGEND = [
  { label: 'Confirmed', color: c.navy },
  { label: 'Awaiting Payment', color: c.gold },
  { label: 'Checked In', color: c.sageIcon },
  { label: 'Blocked/Maintenance', color: '#D8D3C6' },
  { label: 'Available', color: c.sageBg },
];

/**
 * Deterministic stand-in for a real occupancy timeline: each unit/day cell is
 * coloured from a fixed seed so the grid looks plausible without a backend.
 */
export function timelineCellColor(unitIndex: number, dayIndex: number): string {
  const seed = (unitIndex * 7 + dayIndex) % 9;
  if (seed === 2 || seed === 3) return c.navy;
  if (seed === 5) return c.gold;
  if (seed === 7) return '#D8D3C6';
  if (seed === 1) return '#DCE9D8';
  return c.sageBg;
}
