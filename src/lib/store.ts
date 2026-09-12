import { useSyncExternalStore } from 'react';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import type { BookingRecord, DateBlock, StayHold } from '../types';
import { supabase } from './supabase';

/**
 * Bookings and blocked dates, read from Supabase.
 *
 * Everyone gets `holds` and `blocks` from the `occupancy` view, which carries
 * no guest data. Signed-in staff additionally get full `bookings` (with names
 * and contacts) and blocks with their reasons, kept live through realtime.
 * This module is the only place that talks to the database for these tables.
 */

export interface StoreData {
  /** Nights taken by live bookings. Safe for anonymous visitors. */
  holds: StayHold[];
  blocks: DateBlock[];
  /** Full records; empty unless the current user is an admin. */
  bookings: BookingRecord[];
  /** False until the first fetch has finished. */
  ready: boolean;
  error: string | null;
}

export interface AuthState {
  session: Session | null;
  isAdmin: boolean;
  /** False until the stored session (if any) has been read and its admin status looked up. */
  checked: boolean;
}

const EMPTY: StoreData = { holds: [], blocks: [], bookings: [], ready: false, error: null };
const NO_AUTH: AuthState = { session: null, isAdmin: false, checked: false };

let data: StoreData = EMPTY;
let auth: AuthState = NO_AUTH;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setData(patch: Partial<StoreData>) {
  data = { ...data, ...patch };
  emit();
}

function setAuth(patch: Partial<AuthState>) {
  auth = { ...auth, ...patch };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore(): StoreData {
  return useSyncExternalStore(subscribe, () => data);
}

export function getStore(): StoreData {
  return data;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => auth);
}

/* ---------- row mapping ---------- */

interface BookingRow {
  ref: string;
  apartment_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  payment: BookingRecord['payment'];
  total: number;
  deposit: number;
  amount_due: number;
  status: BookingRecord['status'];
  source: BookingRecord['source'];
  note: string;
  created_at: string;
  payment_status: BookingRecord['paymentStatus'];
  payment_ref: string | null;
  payment_channel: string | null;
  paid_amount: number | null;
  paid_at: string | null;
  hold_expires_at: string | null;
}

interface BlockRow {
  id: string;
  apartment_id: number;
  start_date: string;
  end_date: string;
  reason: string;
}

interface OccupancyRow {
  id: string;
  kind: 'booking' | 'block';
  apartment_id: number;
  start_date: string;
  end_date: string;
  status: BookingRecord['status'] | 'blocked';
}

const BOOKING_COLUMNS =
  'ref, apartment_id, check_in, check_out, adults, children, guest_name, guest_email, guest_phone, payment, total, deposit, amount_due, status, source, note, created_at, payment_status, payment_ref, payment_channel, paid_amount, paid_at, hold_expires_at';

function toRecord(r: BookingRow): BookingRecord {
  return {
    ref: r.ref,
    apartmentId: r.apartment_id,
    checkIn: r.check_in,
    checkOut: r.check_out,
    adults: r.adults,
    children: r.children,
    guestName: r.guest_name,
    guestEmail: r.guest_email,
    guestPhone: r.guest_phone,
    payment: r.payment,
    total: r.total,
    deposit: r.deposit,
    amountDue: r.amount_due,
    status: r.status,
    source: r.source,
    note: r.note,
    createdAt: r.created_at,
    paymentStatus: r.payment_status,
    paymentRef: r.payment_ref ?? undefined,
    paymentChannel: r.payment_channel ?? undefined,
    paidAmount: r.paid_amount ?? undefined,
    paidAt: r.paid_at ?? undefined,
    holdExpiresAt: r.hold_expires_at ?? undefined,
  };
}

function toBlock(r: BlockRow): DateBlock {
  return { id: r.id, apartmentId: r.apartment_id, start: r.start_date, end: r.end_date, reason: r.reason };
}

/* ---------- reads ---------- */

async function fetchOccupancy(): Promise<Pick<StoreData, 'holds' | 'blocks'>> {
  const { data: rows, error } = await supabase
    .from('occupancy')
    .select('id, kind, apartment_id, start_date, end_date, status')
    .returns<OccupancyRow[]>();
  if (error) throw error;
  const holds: StayHold[] = [];
  const blocks: DateBlock[] = [];
  for (const r of rows) {
    if (r.kind === 'booking' && r.status !== 'blocked') {
      holds.push({ apartmentId: r.apartment_id, checkIn: r.start_date, checkOut: r.end_date, status: r.status });
    } else {
      blocks.push({ id: r.id, apartmentId: r.apartment_id, start: r.start_date, end: r.end_date, reason: '' });
    }
  }
  return { holds, blocks };
}

async function fetchAdminData(): Promise<Pick<StoreData, 'bookings' | 'blocks'>> {
  const [bookingsRes, blocksRes] = await Promise.all([
    supabase.from('bookings').select(BOOKING_COLUMNS).order('created_at', { ascending: false }).returns<BookingRow[]>(),
    supabase.from('date_blocks').select('id, apartment_id, start_date, end_date, reason').order('start_date', { ascending: false }).returns<BlockRow[]>(),
  ]);
  if (bookingsRes.error) throw bookingsRes.error;
  if (blocksRes.error) throw blocksRes.error;
  return { bookings: bookingsRes.data.map(toRecord), blocks: blocksRes.data.map(toBlock) };
}

let refreshing: Promise<void> | null = null;

/** Re-reads everything the current user is allowed to see. Concurrent calls share one round trip. */
export function refreshStore(): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const pub = await fetchOccupancy();
      const admin = auth.isAdmin ? await fetchAdminData() : { bookings: [] as BookingRecord[] };
      setData({ ...pub, ...admin, ready: true, error: null });
    } catch (e) {
      setData({ ready: true, error: e instanceof Error ? e.message : 'Could not load bookings.' });
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/* ---------- auth ---------- */

async function lookupAdmin(session: Session | null): Promise<boolean> {
  if (!session) return false;
  const { data: row } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  return Boolean(row);
}

let liveChannel: RealtimeChannel | null = null;

function startLiveUpdates() {
  if (liveChannel) return;
  liveChannel = supabase
    .channel('admin-store')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => void refreshStore())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'date_blocks' }, () => void refreshStore())
    .subscribe();
}

function stopLiveUpdates() {
  if (!liveChannel) return;
  void supabase.removeChannel(liveChannel);
  liveChannel = null;
}

async function applySession(session: Session | null) {
  const isAdmin = await lookupAdmin(session);
  setAuth({ session, isAdmin, checked: true });
  if (isAdmin) startLiveUpdates();
  else stopLiveUpdates();
  await refreshStore();
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/* ---------- writes (admin only; row-level security enforces it) ---------- */

export type NewBooking = Omit<BookingRecord, 'ref' | 'createdAt' | 'paymentStatus'> & {
  paymentStatus?: BookingRecord['paymentStatus'];
};

function friendly(error: { code?: string; message: string }): Error {
  if (error.code === '23P01') return new Error('Those dates are already held for this room.');
  if (error.code === '42501') return new Error('You are not allowed to do that. Sign in as an admin.');
  return new Error(error.message);
}

/** Records an offline booking. The database assigns the reference. */
export async function addBooking(b: NewBooking): Promise<BookingRecord> {
  const { data: row, error } = await supabase
    .from('bookings')
    .insert({
      apartment_id: b.apartmentId,
      check_in: b.checkIn,
      check_out: b.checkOut,
      adults: b.adults,
      children: b.children,
      guest_name: b.guestName,
      guest_email: b.guestEmail,
      guest_phone: b.guestPhone,
      payment: b.payment,
      total: b.total,
      deposit: b.deposit,
      amount_due: b.amountDue,
      status: b.status,
      source: b.source,
      note: b.note,
      payment_status: b.paymentStatus ?? 'unpaid',
    })
    .select(BOOKING_COLUMNS)
    .returns<BookingRow[]>()
    .single();
  if (error) throw friendly(error);
  await refreshStore();
  return toRecord(row);
}

export async function updateBooking(ref: string, patch: Partial<Pick<BookingRecord, 'status' | 'note'>>): Promise<void> {
  const { error } = await supabase.from('bookings').update(patch).eq('ref', ref);
  if (error) throw friendly(error);
  await refreshStore();
}

export async function removeBooking(ref: string): Promise<void> {
  const { error } = await supabase.from('bookings').delete().eq('ref', ref);
  if (error) throw friendly(error);
  await refreshStore();
}

export async function addBlock(block: Omit<DateBlock, 'id'>): Promise<void> {
  const { error } = await supabase.from('date_blocks').insert({
    apartment_id: block.apartmentId,
    start_date: block.start,
    end_date: block.end,
    reason: block.reason,
  });
  if (error) throw friendly(error);
  await refreshStore();
}

export async function removeBlock(id: string): Promise<void> {
  const { error } = await supabase.from('date_blocks').delete().eq('id', id);
  if (error) throw friendly(error);
  await refreshStore();
}

/* ---------- boot ---------- */

if (typeof window !== 'undefined') {
  // INITIAL_SESSION fires as soon as the stored session has been read, so this
  // also covers the first load. The callback must not await other Supabase
  // calls (they wait on the auth lock it holds), hence the setTimeout hop.
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      window.setTimeout(() => void applySession(session), 0);
    }
  });

  // Anonymous visitors have no realtime feed; catch up when they come back to the tab.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshStore();
  });
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void refreshStore();
  }, 60_000);
}
