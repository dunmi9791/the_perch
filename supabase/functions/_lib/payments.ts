import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { PaystackTransaction } from './paystack.ts';

export type PaymentOutcome =
  | 'paid'
  | 'already_paid'
  | 'paid_reinstated'
  | 'paid_but_unavailable'
  | 'duplicate_payment'
  | 'amount_mismatch'
  | 'unknown_reference'
  | 'not_successful';

export interface PaymentResult {
  outcome: PaymentOutcome;
  /** True when the booking is now (or already was) paid and confirmed. */
  paid: boolean;
  bookingRef: string | null;
  bookingStatus: string | null;
  paymentStatus: string | null;
}

const PAID: ReadonlySet<PaymentOutcome> = new Set(['paid', 'already_paid', 'paid_reinstated']);

/**
 * Applies a Paystack transaction to its booking. Both the verify endpoint and
 * the webhook end up here, so the database function does all the deciding.
 */
export async function applyTransaction(
  supabase: SupabaseClient,
  tx: PaystackTransaction,
): Promise<PaymentResult> {
  if (tx.status !== 'success' || tx.currency !== 'NGN') {
    const attemptStatus = tx.status === 'abandoned' ? 'abandoned' : tx.status === 'failed' || tx.status === 'reversed' ? 'failed' : null;
    if (attemptStatus) {
      await supabase
        .from('payment_attempts')
        .update({ status: attemptStatus, raw: tx, verified_at: new Date().toISOString() })
        .eq('reference', tx.reference)
        .eq('status', 'initialized');
    }
    return { outcome: 'not_successful', paid: false, bookingRef: null, bookingStatus: null, paymentStatus: null };
  }

  const { data, error } = await supabase.rpc('record_paystack_payment', {
    p_reference: tx.reference,
    p_amount_kobo: tx.amount,
    p_channel: tx.channel,
    p_paid_at: tx.paid_at,
    p_paystack_id: tx.id,
    p_raw: tx,
  });
  if (error) throw new Error(`record_paystack_payment failed: ${error.message}`);

  const row = (Array.isArray(data) ? data[0] : data) as
    | { outcome: PaymentOutcome; booking_ref: string | null; booking_status: string | null; payment_status: string | null }
    | undefined;
  if (!row) throw new Error('record_paystack_payment returned no row');

  if (!PAID.has(row.outcome)) {
    console.warn('payment needs attention', { reference: tx.reference, outcome: row.outcome, booking: row.booking_ref });
  }

  return {
    outcome: row.outcome,
    paid: PAID.has(row.outcome),
    bookingRef: row.booking_ref,
    bookingStatus: row.booking_status,
    paymentStatus: row.payment_status,
  };
}
