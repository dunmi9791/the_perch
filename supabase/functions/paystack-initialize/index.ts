/**
 * POST /functions/v1/paystack-initialize   { ref }
 *
 * Starts a Paystack transaction for an unpaid booking and returns the access
 * code the browser needs to open the popup. The amount comes from the
 * booking row, never from the request.
 */
import { http, readJson } from '../_lib/http.ts';
import { serviceClient } from '../_lib/db.ts';
import { initializeTransaction } from '../_lib/paystack.ts';
import { findApartment } from '../_shared/apartments.ts';

const HOLD_MINUTES = Number(Deno.env.get('BOOKING_HOLD_MINUTES') ?? '30');
const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  const { early, json } = http(req, 'POST');
  if (early) return early;

  const body = await readJson(req);
  const ref = typeof body?.ref === 'string' ? body.ref.trim() : '';
  if (!/^PRC-\d{5}$/.test(ref)) return json(400, { error: 'A booking reference is required.' });

  const supabase = serviceClient();
  const { data: b, error } = await supabase
    .from('bookings')
    .select('ref, guest_email, guest_name, apartment_id, check_in, check_out, payment, status, payment_status, amount_due, hold_expires_at')
    .eq('ref', ref)
    .maybeSingle();
  if (error) {
    console.error('booking lookup failed', error);
    return json(500, { error: 'Could not load the booking. Please try again.' });
  }
  if (!b) return json(404, { error: 'We could not find that booking.', code: 'not_found' });

  if (b.payment_status === 'paid') {
    return json(409, { error: 'This booking has already been paid.', code: 'already_paid' });
  }
  if (b.status !== 'pending') {
    return json(409, { error: 'This booking is no longer open for payment.', code: 'not_pending' });
  }
  if (b.hold_expires_at && new Date(b.hold_expires_at).getTime() < Date.now()) {
    return json(410, {
      error: 'The hold on these dates has expired. Please start a new booking.',
      code: 'hold_expired',
    });
  }
  if (!b.amount_due || b.amount_due <= 0) {
    return json(409, { error: 'There is nothing to pay on this booking.', code: 'nothing_due' });
  }

  const { count } = await supabase
    .from('payment_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('booking_ref', ref);
  const attempt = (count ?? 0) + 1;
  if (attempt > MAX_ATTEMPTS) {
    return json(429, { error: 'Too many payment attempts. Please contact us to complete this booking.', code: 'too_many_attempts' });
  }

  const reference = `${ref}-${attempt}`;
  const amountKobo = b.amount_due * 100;
  const apartment = findApartment(b.apartment_id);

  let init;
  try {
    init = await initializeTransaction({
      email: b.guest_email,
      amountKobo,
      reference,
      metadata: {
        booking_ref: ref,
        apartment: apartment?.name ?? String(b.apartment_id),
        check_in: b.check_in,
        check_out: b.check_out,
        custom_fields: [
          { display_name: 'Booking', variable_name: 'booking_ref', value: ref },
          { display_name: 'Apartment', variable_name: 'apartment', value: apartment?.name ?? '' },
          { display_name: 'Stay', variable_name: 'stay', value: `${b.check_in} → ${b.check_out}` },
        ],
      },
    });
  } catch (e) {
    console.error('paystack initialize failed', e);
    return json(502, { error: 'Could not start the payment. Please try again in a moment.', code: 'paystack_unavailable' });
  }

  const { error: insertErr } = await supabase.from('payment_attempts').insert({
    booking_ref: ref,
    reference,
    amount_kobo: amountKobo,
    status: 'initialized',
    raw: { access_code: init.access_code, authorization_url: init.authorization_url },
  });
  if (insertErr) {
    console.error('payment_attempts insert failed', insertErr);
    return json(500, { error: 'Could not record the payment attempt. Please try again.' });
  }

  // A guest who switched from bank transfer to card is now a Paystack booking,
  // and every fresh attempt gets a full hold so the popup never races the clock.
  await supabase
    .from('bookings')
    .update({
      payment: 'paystack',
      hold_expires_at: new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString(),
    })
    .eq('ref', ref);

  return json(200, {
    reference,
    accessCode: init.access_code,
    authorizationUrl: init.authorization_url,
    amountKobo,
    email: b.guest_email,
  });
});
