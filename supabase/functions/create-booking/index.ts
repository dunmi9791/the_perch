/**
 * POST /functions/v1/create-booking
 *
 * Records a website reservation. The body carries dates, apartment, party
 * size, guest details and the chosen payment method — never a price. The
 * server re-runs every rule the website ran, prices the stay itself, and
 * lets the database's exclusion constraint settle any race for the same
 * nights.
 */
import { http, readJson } from '../_lib/http.ts';
import { serviceClient } from '../_lib/db.ts';
import { parseBookingInput } from '../_shared/booking-input.ts';
import { PROPERTY_TIME_ZONE, todayIso } from '../_shared/dates.ts';

const HOLD_MINUTES = Number(Deno.env.get('BOOKING_HOLD_MINUTES') ?? '30');

Deno.serve(async (req) => {
  const { early, json } = http(req, 'POST');
  if (early) return early;

  const raw = await readJson(req);
  if (!raw) return json(400, { error: 'Expected a JSON body.' });

  const parsed = parseBookingInput(raw, todayIso(PROPERTY_TIME_ZONE));
  if (!parsed.ok) return json(parsed.status, { error: parsed.error, field: parsed.field });
  const { input, price } = parsed;

  const supabase = serviceClient();

  // Booking-vs-booking clashes are caught by the exclusion constraint on
  // insert; blocked dates live in another table, so check them here.
  const { data: blocks, error: blockErr } = await supabase
    .from('date_blocks')
    .select('id')
    .eq('apartment_id', input.apartmentId)
    .lt('start_date', input.checkOut)
    .gt('end_date', input.checkIn)
    .limit(1);
  if (blockErr) {
    console.error('date_blocks lookup failed', blockErr);
    return json(500, { error: 'Could not check availability. Please try again.' });
  }
  if (blocks.length > 0) {
    return json(409, { error: 'Those dates are no longer available for this apartment.', field: 'apartment' });
  }

  const holdExpiresAt =
    input.payment === 'paystack' ? new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString() : null;

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      apartment_id: input.apartmentId,
      check_in: input.checkIn,
      check_out: input.checkOut,
      adults: input.adults,
      children: input.children,
      guest_name: input.guest.name,
      guest_email: input.guest.email,
      guest_phone: input.guest.phone,
      guest_whatsapp: input.guest.whatsapp,
      arrival_time: input.guest.arrival,
      payment: input.payment,
      total: price.total,
      deposit: price.deposit,
      amount_due: price.dueOnline,
      status: 'pending',
      source: 'website',
      note: [input.guest.purpose, input.guest.requests].filter(Boolean).join(' · '),
      payment_status: 'unpaid',
      hold_expires_at: holdExpiresAt,
    })
    .select('ref, total, status')
    .single();

  if (error) {
    // 23P01: exclusion_violation — another guest took the nights first.
    if (error.code === '23P01') {
      return json(409, {
        error: 'Those dates were just taken by another guest. Please choose different dates or another apartment.',
        field: 'apartment',
      });
    }
    console.error('booking insert failed', error);
    return json(500, { error: 'Could not save your booking. Please try again.' });
  }

  return json(201, { ref: data.ref, total: data.total, amountDue: price.dueOnline, deposit: price.deposit, status: data.status, holdExpiresAt });
});
