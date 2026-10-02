/**
 * POST /functions/v1/create-booking
 *
 * Records a website reservation. The body carries dates, rooms, party
 * size, guest details and the chosen payment method — never a price. The
 * server re-runs every rule the website ran, prices the stay itself from the
 * live `room_rates` and `pricing_settings`, and lets the database's
 * exclusion constraint settle any race for the same nights.
 */
import { http, readJson } from '../_lib/http.ts';
import { serviceClient } from '../_lib/db.ts';
import { parseBookingInput } from '../_shared/booking-input.ts';
import { applyRates } from '../_shared/apartments.ts';
import { PROPERTY_TIME_ZONE, todayIso } from '../_shared/dates.ts';

const HOLD_MINUTES = Number(Deno.env.get('BOOKING_HOLD_MINUTES') ?? '30');

Deno.serve(async (req) => {
  const { early, json } = http(req, 'POST');
  if (early) return early;

  const raw = await readJson(req);
  if (!raw) return json(400, { error: 'Expected a JSON body.' });

  const supabase = serviceClient();

  // Price at the live rate card, tax and deposit. Never fall back to the
  // values baked into the code: a stale price is worse than asking the guest
  // to retry.
  const [ratesRes, settingsRes] = await Promise.all([
    supabase.from('room_rates').select('apartment_id, nightly, weekend, weekly, monthly, min_stay'),
    supabase.from('pricing_settings').select('tax_rate, caution_deposit').maybeSingle(),
  ]);
  const rateRows = ratesRes.data;
  const settings = settingsRes.data;
  if (ratesRes.error || settingsRes.error || !rateRows?.length || !settings) {
    console.error('rate lookup failed', ratesRes.error ?? settingsRes.error);
    return json(500, { error: 'Could not load room rates. Please try again.' });
  }
  const rooms = applyRates(
    rateRows.map((r) => ({
      apartmentId: r.apartment_id,
      nightly: r.nightly,
      weekend: r.weekend,
      weekly: r.weekly,
      monthly: r.monthly,
      minStay: r.min_stay,
    })),
  );

  const pricing = { taxRate: Number(settings.tax_rate), cautionDeposit: settings.caution_deposit };

  const parsed = parseBookingInput(raw, todayIso(PROPERTY_TIME_ZONE), rooms, pricing);
  if (!parsed.ok) return json(parsed.status, { error: parsed.error, field: parsed.field });
  const { input, price } = parsed;

  const holdExpiresAt =
    input.payment === 'paystack' ? new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString() : null;

  // One transaction: the booking, its rooms, and a check against blocked
  // dates. Clashes with other bookings are caught by the exclusion
  // constraint on booking_rooms.
  const { data: ref, error } = await supabase.rpc('create_booking', {
    p_booking: {
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
    },
    p_rooms: input.apartmentIds,
  });

  if (error) {
    // 23P01: exclusion_violation — another guest took one of the rooms first.
    if (error.code === '23P01' || error.message === 'dates_blocked') {
      return json(409, {
        error: 'One of your rooms was just taken for these dates. Please choose another room or different dates.',
        field: 'apartment',
      });
    }
    console.error('booking insert failed', error);
    return json(500, { error: 'Could not save your booking. Please try again.' });
  }

  return json(201, {
    ref,
    total: price.total,
    amountDue: price.dueOnline,
    deposit: price.deposit,
    status: 'pending',
    holdExpiresAt,
  });
});
