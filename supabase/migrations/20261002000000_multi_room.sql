-- The Perch: one booking, several rooms.
--
-- A website booking now takes two or more rooms for the same dates, so the
-- rooms move out of `bookings.apartment_id` into `booking_rooms`. The
-- no-double-booking rule moves with them: it is enforced per room, on
-- `booking_rooms`, whose dates and liveness are kept in step with the parent
-- booking by a trigger. Cancelling a booking (or reinstating one) therefore
-- frees (or re-claims) all of its rooms at once, and a reinstatement that
-- clashes still raises exclusion_violation, which record_paystack_payment()
-- already handles.
--
-- Pricing changes too: no cleaning fee; room rates are tax inclusive (7.5% of
-- the rate is tax, never added on top); a ₦100,000 caution deposit charged at
-- payment and refunded after checkout.
-- `amount_due` is now the whole total. Existing rows keep the amounts they
-- were priced with.

create table public.booking_rooms (
  booking_ref   text not null references public.bookings (ref) on delete cascade,
  apartment_id  integer not null,
  -- Copies of the parent booking's dates and status, maintained by trigger,
  -- so the exclusion constraint can see them.
  check_in      date not null,
  check_out     date not null,
  live          boolean not null default true,

  primary key (booking_ref, apartment_id),
  constraint booking_rooms_dates_ordered check (check_out > check_in),
  constraint booking_rooms_no_double_booking exclude using gist (
    apartment_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (live)
);

create index booking_rooms_apartment_dates_idx on public.booking_rooms (apartment_id, check_in, check_out);

comment on table public.booking_rooms is 'Rooms held by a booking. Dates and liveness mirror the parent booking.';

-- Move every existing booking's single room across.
insert into public.booking_rooms (booking_ref, apartment_id, check_in, check_out, live)
select ref, apartment_id, check_in, check_out, status <> 'cancelled'
from public.bookings;

-- The occupancy view reads bookings.apartment_id; rebuild it on the new table.
drop view public.occupancy;

alter table public.bookings drop constraint bookings_no_double_booking;
drop index public.bookings_apartment_dates_idx;
alter table public.bookings drop column apartment_id;

comment on column public.bookings.total is 'Everything the guest pays, in naira: the tax-inclusive room subtotal and the caution deposit.';
comment on column public.bookings.deposit is 'Refundable caution deposit in naira, charged at payment and included in total. Refunded 24-48 hours after checkout if there is no damage.';
comment on column public.bookings.amount_due is 'Naira due at payment. This is what Paystack charges.';

create index bookings_dates_idx on public.bookings (check_in, check_out);

-- ---------------------------------------------------------------------------
-- Keep booking_rooms in step with its booking.
-- ---------------------------------------------------------------------------
create or replace function public.sync_booking_rooms()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.booking_rooms
    set check_in  = new.check_in,
        check_out = new.check_out,
        live      = new.status <> 'cancelled'
    where booking_ref = new.ref;
  return new;
end;
$$;

create trigger bookings_sync_rooms
  after update of status, check_in, check_out on public.bookings
  for each row
  when (old.status is distinct from new.status
        or old.check_in is distinct from new.check_in
        or old.check_out is distinct from new.check_out)
  execute function public.sync_booking_rooms();

-- ---------------------------------------------------------------------------
-- Create a booking and its rooms in one transaction.
--
-- Runs with the caller's rights: the create-booking edge function calls it
-- with the service role, and staff call it from the admin screen, where
-- row-level security applies. Raises 23P01 (exclusion_violation) when a room
-- is already held, and P0001 with message 'dates_blocked' when a room is
-- blocked for any of the nights.
-- ---------------------------------------------------------------------------
create or replace function public.create_booking(p_booking jsonb, p_rooms integer[])
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_ref   text;
  v_in      date := (p_booking->>'check_in')::date;
  v_out     date := (p_booking->>'check_out')::date;
  v_status  text := coalesce(p_booking->>'status', 'pending');
begin
  if p_rooms is null or cardinality(p_rooms) = 0 then
    raise exception 'A booking needs at least one room.';
  end if;

  if exists (
    select 1 from public.date_blocks
    where apartment_id = any (p_rooms)
      and daterange(start_date, end_date, '[)') && daterange(v_in, v_out, '[)')
  ) then
    raise exception 'dates_blocked';
  end if;

  insert into public.bookings (
    check_in, check_out, adults, children,
    guest_name, guest_email, guest_phone, guest_whatsapp, arrival_time,
    payment, total, deposit, amount_due, status, source, note,
    payment_status, hold_expires_at
  ) values (
    v_in, v_out,
    coalesce((p_booking->>'adults')::integer, 1),
    coalesce((p_booking->>'children')::integer, 0),
    p_booking->>'guest_name',
    coalesce(p_booking->>'guest_email', ''),
    coalesce(p_booking->>'guest_phone', ''),
    coalesce(p_booking->>'guest_whatsapp', ''),
    coalesce(p_booking->>'arrival_time', ''),
    p_booking->>'payment',
    (p_booking->>'total')::integer,
    coalesce((p_booking->>'deposit')::integer, 0),
    coalesce((p_booking->>'amount_due')::integer, 0),
    v_status,
    coalesce(p_booking->>'source', 'website'),
    coalesce(p_booking->>'note', ''),
    coalesce(p_booking->>'payment_status', 'unpaid'),
    (p_booking->>'hold_expires_at')::timestamptz
  )
  returning ref into new_ref;

  insert into public.booking_rooms (booking_ref, apartment_id, check_in, check_out, live)
  select new_ref, room, v_in, v_out, v_status <> 'cancelled'
  from (select distinct unnest(p_rooms) as room) r;

  return new_ref;
end;
$$;

revoke execute on function public.create_booking(jsonb, integer[]) from public, anon;
grant execute on function public.create_booking(jsonb, integer[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Access control: staff only, like bookings. The edge functions use the
-- service role; the public reads nights through the occupancy view.
-- ---------------------------------------------------------------------------
alter table public.booking_rooms enable row level security;

create policy "admins manage booking rooms" on public.booking_rooms
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Public occupancy, one row per held room.
-- ---------------------------------------------------------------------------
create view public.occupancy
with (security_invoker = false)
as
  select
    b.ref || ':' || r.apartment_id  as id,
    'booking'                       as kind,
    r.apartment_id,
    r.check_in                      as start_date,
    r.check_out                     as end_date,
    b.status
  from public.booking_rooms r
  join public.bookings b on b.ref = r.booking_ref
  where r.live
  union all
  select
    id,
    'block',
    apartment_id,
    start_date,
    end_date,
    'blocked'
  from public.date_blocks;

grant select on public.occupancy to anon, authenticated;
