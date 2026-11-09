-- Two bookings for the webhook test: one to be paid, one to be underpaid.
-- Both are priced the way the server prices a real booking — two rooms, two
-- nights at 70,000 with the tax already inside the rate, plus the 100,000
-- caution deposit — so 380,000 naira is due, which is 38,000,000 kobo.
--
-- Prints the two refs; pass them to tests/webhook.test.mjs in that order.
-- tests/webhook-cleanup.sql removes everything this creates.
\set ON_ERROR_STOP on

do $$
declare b1 text; b2 text;
begin
  b1 := public.create_booking(jsonb_build_object(
    'check_in','2027-06-01','check_out','2027-06-03','adults',2,'children',0,
    'guest_name','Webhook Test','guest_email','webhook@example.com','guest_phone','08030000000',
    'payment','paystack','total',380000,'deposit',100000,'amount_due',380000,
    'status','pending','source','website','payment_status','unpaid',
    'hold_expires_at',(now() + interval '30 minutes')::text), array[1,2]);
  b2 := public.create_booking(jsonb_build_object(
    'check_in','2027-06-01','check_out','2027-06-03','adults',2,'children',0,
    'guest_name','Webhook Test','guest_email','webhook@example.com','guest_phone','08030000000',
    'payment','paystack','total',380000,'deposit',100000,'amount_due',380000,
    'status','pending','source','website','payment_status','unpaid',
    'hold_expires_at',(now() + interval '30 minutes')::text), array[3,4]);

  -- What paystack-initialize would have written before sending the guest off.
  insert into public.payment_attempts (booking_ref, reference, amount_kobo) values (b1, b1 || '-1', 38000000);
  insert into public.payment_attempts (booking_ref, reference, amount_kobo) values (b2, b2 || '-1', 38000000);
end $$;

select ref as pass_these_refs_in_order, amount_due, status, payment_status
from public.bookings
where guest_name = 'Webhook Test'
order by ref;
