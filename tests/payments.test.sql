-- Section G, the parts that run inside the database: verify-vs-webhook order,
-- repeats, a tampered amount, hold expiry and a payment that lands late.
-- record_paystack_payment() is what both the verify endpoint and the webhook
-- call, so testing it covers either arrival order.
-- Everything happens inside one transaction and is rolled back at the end.
\set ON_ERROR_STOP on
begin;

create temp table results (n serial, name text, got text, want text) on commit drop;

create or replace function pg_temp.note(p_name text, p_got text, p_want text) returns void
language sql as $$ insert into results (name, got, want) values (p_name, p_got, p_want) $$;

-- A booking priced the new way: 2 rooms x 2 nights at 70,000, tax inside the
-- rate, plus the 100,000 deposit. 380,000 naira = 38,000,000 kobo.
create or replace function pg_temp.mk(p_rooms integer[], p_in date, p_out date, p_hold interval default interval '30 minutes')
returns text language sql as $$
  select public.create_booking(
    jsonb_build_object(
      'check_in', p_in, 'check_out', p_out, 'adults', 2, 'children', 0,
      'guest_name', 'Test Guest', 'guest_email', 'test@example.com', 'guest_phone', '08030000000',
      'payment', 'paystack', 'total', 380000, 'deposit', 100000, 'amount_due', 380000,
      'status', 'pending', 'source', 'website', 'payment_status', 'unpaid',
      'hold_expires_at', (now() + p_hold)::text
    ),
    p_rooms
  );
$$;

create or replace function pg_temp.attempt(p_ref text, p_suffix int, p_kobo integer default 38000000)
returns text language plpgsql as $$
declare r text := p_ref || '-' || p_suffix;
begin
  insert into public.payment_attempts (booking_ref, reference, amount_kobo) values (p_ref, r, p_kobo);
  return r;
end; $$;

-- ---------------------------------------------------------------------------
-- 1 · A paid booking confirms itself
-- ---------------------------------------------------------------------------
do $$
declare b text; a text; o record;
begin
  b := pg_temp.mk(array[1,2], '2026-12-01', '2026-12-03');
  a := pg_temp.attempt(b, 1);
  select * into o from public.record_paystack_payment(a, 38000000, 'card', now(), 111, '{}'::jsonb);
  perform pg_temp.note('first call marks the booking paid', o.outcome, 'paid');
  perform pg_temp.note('a pending booking becomes confirmed', o.booking_status, 'confirmed');
  perform pg_temp.note('payment status is paid', o.payment_status, 'paid');
  perform pg_temp.note('paid amount stored in naira',
    (select paid_amount::text from public.bookings where ref = b), '380000');
  perform pg_temp.note('the hold is cleared once paid',
    (select coalesce(hold_expires_at::text, 'null') from public.bookings where ref = b), 'null');
  perform pg_temp.note('the attempt is marked success',
    (select status from public.payment_attempts where reference = a), 'success');

  -- 2 · The other path arrives second: same reference, nothing changes.
  select * into o from public.record_paystack_payment(a, 38000000, 'card', now(), 111, '{}'::jsonb);
  perform pg_temp.note('the second path is a no-op', o.outcome, 'already_paid');
  perform pg_temp.note('and again, still a no-op',
    (select outcome from public.record_paystack_payment(a, 38000000, 'card', now(), 111, '{}'::jsonb)), 'already_paid');
  perform pg_temp.note('no duplicate note was written',
    (select (note not like '%DUPLICATE%')::text from public.bookings where ref = b), 'true');

  -- 3 · A genuine second charge on the same booking is flagged for refund.
  a := pg_temp.attempt(b, 2);
  select * into o from public.record_paystack_payment(a, 38000000, 'card', now(), 222, '{}'::jsonb);
  perform pg_temp.note('a second charge is flagged', o.outcome, 'duplicate_payment');
  perform pg_temp.note('the booking note asks for a refund',
    (select (note like '%DUPLICATE PAYMENT%refund required%')::text from public.bookings where ref = b), 'true');
end $$;

-- ---------------------------------------------------------------------------
-- 4 · A tampered amount is refused
-- ---------------------------------------------------------------------------
do $$
declare b text; a text; o record;
begin
  b := pg_temp.mk(array[3,4], '2026-12-01', '2026-12-03');
  a := pg_temp.attempt(b, 1);
  -- Paystack reports 1,000 naira against a 380,000 booking.
  select * into o from public.record_paystack_payment(a, 100000, 'card', now(), 333, '{}'::jsonb);
  perform pg_temp.note('a short payment is refused', o.outcome, 'amount_mismatch');
  perform pg_temp.note('the booking stays unpaid',
    (select payment_status from public.bookings where ref = b), 'unpaid');
  perform pg_temp.note('the booking stays pending',
    (select status from public.bookings where ref = b), 'pending');
  perform pg_temp.note('the attempt records the mismatch',
    (select status from public.payment_attempts where reference = a), 'mismatch');
  perform pg_temp.note('the note names both amounts',
    (select (note like '%AMOUNT MISMATCH%paid 1000%expected 380000%')::text from public.bookings where ref = b), 'true');

  -- An overpayment is refused the same way.
  a := pg_temp.attempt(b, 2);
  perform pg_temp.note('an overpayment is refused too',
    (select outcome from public.record_paystack_payment(a, 50000000, 'card', now(), 334, '{}'::jsonb)), 'amount_mismatch');

  -- The correct amount still goes through afterwards.
  a := pg_temp.attempt(b, 3);
  perform pg_temp.note('the right amount still pays',
    (select outcome from public.record_paystack_payment(a, 38000000, 'card', now(), 335, '{}'::jsonb)), 'paid');
end $$;

-- 5 · A reference nobody initialized
select pg_temp.note('an unknown reference is rejected',
  (select outcome from public.record_paystack_payment('PRC-00000-9', 38000000, 'card', now(), 444, '{}'::jsonb)),
  'unknown_reference');

-- ---------------------------------------------------------------------------
-- 6 · The hold expires and the nights go back on sale
-- ---------------------------------------------------------------------------
do $$
declare b text; b2 text; freed integer;
begin
  b := pg_temp.mk(array[5,6], '2026-12-10', '2026-12-12', interval '-10 minutes');
  perform pg_temp.note('the rooms are held while unpaid',
    (select count(*)::text from public.booking_rooms where booking_ref = b and live), '2');

  -- Someone else cannot take those nights yet.
  begin
    b2 := pg_temp.mk(array[5,6], '2026-12-10', '2026-12-12');
    perform pg_temp.note('a clashing booking is blocked', 'allowed', 'exclusion_violation');
  exception when exclusion_violation then
    perform pg_temp.note('a clashing booking is blocked', 'exclusion_violation', 'exclusion_violation');
  end;

  freed := public.expire_stale_holds();
  perform pg_temp.note('the stale hold is cancelled', freed::text, '1');
  perform pg_temp.note('the booking is cancelled',
    (select status from public.bookings where ref = b), 'cancelled');
  perform pg_temp.note('its rooms are released',
    (select count(*)::text from public.booking_rooms where booking_ref = b and live), '0');
  perform pg_temp.note('the note says why',
    (select (note like '%payment not completed within the hold%')::text from public.bookings where ref = b), 'true');

  -- The same nights now sell.
  b2 := pg_temp.mk(array[5,6], '2026-12-10', '2026-12-12');
  perform pg_temp.note('the nights are back on sale', (b2 is not null)::text, 'true');
end $$;

-- 7 · A hold inside its window, and the 5-minute grace, are left alone
do $$
declare b text; b2 text;
begin
  b  := pg_temp.mk(array[1,2], '2026-12-20', '2026-12-22', interval '25 minutes');
  b2 := pg_temp.mk(array[3,4], '2026-12-20', '2026-12-22', interval '-2 minutes');
  perform public.expire_stale_holds();
  perform pg_temp.note('a live hold survives the sweep',
    (select status from public.bookings where ref = b), 'pending');
  perform pg_temp.note('the 5-minute grace is respected',
    (select status from public.bookings where ref = b2), 'pending');
end $$;

-- 8 · Abandoned attempts are closed off after two hours
do $$
declare b text; a text;
begin
  b := pg_temp.mk(array[5,6], '2027-01-05', '2027-01-07');
  a := pg_temp.attempt(b, 1);
  update public.payment_attempts set created_at = now() - interval '3 hours' where reference = a;
  perform public.expire_stale_holds();
  perform pg_temp.note('a stale attempt is marked abandoned',
    (select status from public.payment_attempts where reference = a), 'abandoned');
end $$;

-- ---------------------------------------------------------------------------
-- 9 · A payment that lands after the hold lapsed
-- ---------------------------------------------------------------------------
do $$
declare b text; a text; o record;
begin
  -- Nights still free: reinstate.
  b := pg_temp.mk(array[1,2], '2027-02-01', '2027-02-03', interval '-20 minutes');
  a := pg_temp.attempt(b, 1);
  perform public.expire_stale_holds();
  select * into o from public.record_paystack_payment(a, 38000000, 'card', now(), 555, '{}'::jsonb);
  perform pg_temp.note('a late payment is reinstated', o.outcome, 'paid_reinstated');
  perform pg_temp.note('the reinstated booking is confirmed',
    (select status from public.bookings where ref = b), 'confirmed');
  perform pg_temp.note('its rooms are held again',
    (select count(*)::text from public.booking_rooms where booking_ref = b and live), '2');

  -- Nights resold in the meantime: flag for a refund instead.
  b := pg_temp.mk(array[3,4], '2027-03-01', '2027-03-03', interval '-20 minutes');
  a := pg_temp.attempt(b, 1);
  perform public.expire_stale_holds();
  perform pg_temp.mk(array[3,4], '2027-03-01', '2027-03-03');
  select * into o from public.record_paystack_payment(a, 38000000, 'card', now(), 666, '{}'::jsonb);
  perform pg_temp.note('a late payment on resold nights is flagged', o.outcome, 'paid_but_unavailable');
  perform pg_temp.note('that booking stays cancelled',
    (select status from public.bookings where ref = b), 'cancelled');
  perform pg_temp.note('but is recorded as paid',
    (select payment_status from public.bookings where ref = b), 'paid');
  perform pg_temp.note('and asks for a refund',
    (select (note like '%refund required%')::text from public.bookings where ref = b), 'true');
end $$;

-- ---------------------------------------------------------------------------
-- 10 · Writes to the rate tables only go through the set_* functions
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    set local role anon;
    update public.pricing_settings set tax_rate = 0 where id;
    reset role;
    perform pg_temp.note('anon cannot change the tax rate', 'allowed', 'refused');
  exception when others then
    reset role;
    perform pg_temp.note('anon cannot change the tax rate', 'refused', 'refused');
  end;
  begin
    set local role anon;
    perform public.set_pricing_settings(0, 0, 'test');
    reset role;
    perform pg_temp.note('anon cannot call set_pricing_settings', 'allowed', 'refused');
  exception when others then
    reset role;
    perform pg_temp.note('anon cannot call set_pricing_settings', 'refused', 'refused');
  end;
end $$;

\pset format aligned
\echo
select n, name,
       case when got = want then 'ok' else 'FAIL' end as result,
       got, want
from results order by n;

\echo
select count(*) filter (where got = want) as passed,
       count(*) filter (where got is distinct from want) as failed
from results;

rollback;
