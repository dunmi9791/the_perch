import { useSyncExternalStore } from 'react';
import type { BookingRecord, DateBlock } from '../types';

/**
 * Persistence for bookings and blocked dates. Backed by localStorage so the
 * admin view works without a server; swap `load`/`save` for API calls later.
 */
const KEY = 'perch.store.v1';

interface StoreData {
  bookings: BookingRecord[];
  blocks: DateBlock[];
}

const EMPTY: StoreData = { bookings: [], blocks: [] };

function load(): StoreData {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
    };
  } catch {
    return EMPTY;
  }
}

let state: StoreData = load();
const listeners = new Set<() => void>();

function commit(next: StoreData) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode); keep the in-memory copy.
  }
  listeners.forEach((l) => l());
}

// Keep several open tabs in sync — an admin confirming in one tab updates the other.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore(): StoreData {
  return useSyncExternalStore(subscribe, () => state);
}

export function getStore(): StoreData {
  return state;
}

export function newBookingRef(): string {
  let ref = '';
  do {
    ref = `PRC-${Math.floor(10000 + Math.random() * 89999)}`;
  } while (state.bookings.some((b) => b.ref === ref));
  return ref;
}

export function addBooking(record: BookingRecord) {
  commit({ ...state, bookings: [record, ...state.bookings] });
}

export function updateBooking(ref: string, patch: Partial<BookingRecord>) {
  commit({
    ...state,
    bookings: state.bookings.map((b) => (b.ref === ref ? { ...b, ...patch } : b)),
  });
}

export function removeBooking(ref: string) {
  commit({ ...state, bookings: state.bookings.filter((b) => b.ref !== ref) });
}

export function addBlock(block: Omit<DateBlock, 'id'>) {
  const id = `blk-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
  commit({ ...state, blocks: [{ ...block, id }, ...state.blocks] });
}

export function removeBlock(id: string) {
  commit({ ...state, blocks: state.blocks.filter((b) => b.id !== id) });
}
