/**
 * POST /functions/v1/paystack-webhook
 *
 * Paystack calls this for every event on the account. Only a request whose
 * HMAC-SHA512 signature matches the secret key is trusted. charge.success is
 * applied to its booking; everything else is acknowledged and ignored.
 */
import { serviceClient } from '../_lib/db.ts';
import { verifyWebhookSignature } from '../_lib/paystack.ts';
import type { PaystackTransaction } from '../_lib/paystack.ts';
import { applyTransaction } from '../_lib/payments.ts';

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed.' });

  const raw = await req.text();
  const ok = await verifyWebhookSignature(raw, req.headers.get('x-paystack-signature')).catch(() => false);
  if (!ok) return reply(401, { error: 'Invalid signature.' });

  let event: { event?: string; data?: PaystackTransaction };
  try {
    event = JSON.parse(raw);
  } catch {
    return reply(400, { error: 'Malformed JSON.' });
  }

  if (event.event !== 'charge.success' || !event.data) {
    return reply(200, { ok: true, ignored: event.event ?? 'unknown' });
  }

  try {
    const result = await applyTransaction(serviceClient(), event.data);
    return reply(200, { ok: true, outcome: result.outcome, booking: result.bookingRef });
  } catch (e) {
    // A non-2xx makes Paystack retry, which is what we want if the database hiccupped.
    console.error('webhook apply failed', e);
    return reply(500, { error: 'Could not record the payment.' });
  }
});
