-- Removes everything the two HTTP tests create, so the local database is left
-- as it was. Run it after tests/webhook.test.mjs and tests/create-booking.test.mjs.
\set ON_ERROR_STOP on

delete from public.payment_attempts
 where booking_ref in (
   select ref from public.bookings where guest_name in ('Webhook Test', 'HTTP Test')
 );

delete from public.bookings where guest_name in ('Webhook Test', 'HTTP Test');

select count(*) as test_rows_left
from public.bookings
where guest_name in ('Webhook Test', 'HTTP Test');
