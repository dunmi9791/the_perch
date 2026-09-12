import { FunctionsHttpError } from '@supabase/supabase-js';
import type { BookingInput } from '@shared/booking-input.ts';
import { supabase } from './supabase';

export type BookingErrorField = 'stay' | 'apartment' | 'guest' | 'payment';

/** A request the server refused, with the step the guest should go back to and a machine-readable code. */
export class BookingError extends Error {
  constructor(
    message: string,
    public readonly field?: BookingErrorField,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

/** Invokes an edge function and turns its JSON error body into a BookingError. */
async function invoke<T>(name: string, body: Record<string, unknown>, fallback: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      type ErrorBody = { error?: string; field?: BookingErrorField; code?: string };
      let parsed: ErrorBody | null = null;
      try {
        parsed = (await error.context.json()) as ErrorBody;
      } catch {
        parsed = null;
      }
      if (parsed) throw new BookingError(parsed.error ?? fallback, parsed.field, parsed.code);
    }
    throw new BookingError('Could not reach the booking service. Please check your connection and try again.');
  }
  if (!data) throw new BookingError('The booking service returned no reply. Please try again.');
  return data;
}

export interface CreatedBooking {
  ref: string;
  total: number;
  amountDue: number;
  deposit: number;
  status: 'pending';
  holdExpiresAt: string | null;
}

/** Records a website reservation through the create-booking edge function. */
export function createBooking(input: BookingInput): Promise<CreatedBooking> {
  return invoke<CreatedBooking>('create-booking', { ...input }, 'Could not save your booking.');
}

export interface PaymentInit {
  reference: string;
  accessCode: string;
  authorizationUrl: string;
  amountKobo: number;
  email: string;
}

/** Starts a Paystack transaction for a booking; the server decides the amount. */
export function initializePayment(ref: string): Promise<PaymentInit> {
  return invoke<PaymentInit>('paystack-initialize', { ref }, 'Could not start the payment.');
}

export interface PaymentVerification {
  paid: boolean;
  outcome: string;
  status: string;
  reference: string;
  bookingRef: string;
  bookingStatus: string | null;
  /** Naira. */
  amount: number;
  channel: string | null;
  paidAt: string | null;
}

/** Asks the server to confirm a Paystack transaction with Paystack and record it. */
export function verifyPayment(reference: string): Promise<PaymentVerification> {
  return invoke<PaymentVerification>('paystack-verify', { reference }, 'Could not confirm the payment.');
}
