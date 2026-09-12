/**
 * POST /functions/v1/paystack-verify   { reference }
 *
 * Asks Paystack whether a transaction succeeded and, if so, marks the booking
 * paid. Safe to call repeatedly; the webhook may have got there first.
 */
import { gate, json, readJson } from '../_lib/http.ts';
import { serviceClient } from '../_lib/db.ts';
import { verifyTransaction } from '../_lib/paystack.ts';
import { applyTransaction } from '../_lib/payments.ts';

Deno.serve(async (req) => {
  const early = gate(req, 'POST');
  if (early) return early;

  const body = await readJson(req);
  const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';
  if (!/^PRC-\d{5}-\d+$/.test(reference)) return json(400, { error: 'A payment reference is required.' });

  const supabase = serviceClient();
  const { data: attempt } = await supabase
    .from('payment_attempts')
    .select('reference, booking_ref')
    .eq('reference', reference)
    .maybeSingle();
  if (!attempt) return json(404, { error: 'Unknown payment reference.', code: 'unknown_reference' });

  let tx;
  try {
    tx = await verifyTransaction(reference);
  } catch (e) {
    console.error('paystack verify failed', e);
    return json(502, { error: 'Could not reach Paystack to confirm the payment. Please try again.', code: 'paystack_unavailable' });
  }

  try {
    const result = await applyTransaction(supabase, tx);
    return json(200, {
      paid: result.paid,
      outcome: result.outcome,
      status: tx.status,
      reference,
      bookingRef: result.bookingRef ?? attempt.booking_ref,
      bookingStatus: result.bookingStatus,
      amount: tx.amount / 100,
      channel: tx.channel,
      paidAt: tx.paid_at,
    });
  } catch (e) {
    console.error('apply transaction failed', e);
    return json(500, { error: 'The payment was received but could not be recorded. Please contact us with your booking reference.' });
  }
});
