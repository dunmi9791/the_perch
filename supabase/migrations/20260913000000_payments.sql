-- The Perch: Paystack payments.
--
-- The guest pays the stay and cleaning fee online (`amount_due`); the
-- refundable deposit is collected at check-in. Every Paystack attempt is a
-- row in `payment_attempts`; a booking is marked paid only through
-- record_paystack_payment(), which the verify and webhook functions both call,
-- so whichever arrives first wins and the second is a no-op.

alter table public.bookings
  add column deposit    integer not null default 0 check (deposit >= 0),
  add column amount_due integer not null default 0 check (amount_due >= 0);

comment on column public.bookings.deposit is 'Refundable deposit in naira, collected at check-in. Included in total.';
comment on column public.bookings.amount_due is 'Naira due before arrival (total minus deposit). This is what Paystack charges.';

-- Anything recorded before this migration was priced with everything due up front.
update public.bookings set amount_due = total where amount_due = 0;

create table public.payment_attempts (
  id           bigint generated always as identity primary key,
  booking_ref  text not null references public.bookings (ref) on delete cascade,
  -- The reference sent to Paystack: <booking ref>-<attempt number>. Unique per account.
  reference    text not null unique,
  amount_kobo  integer not null check (amount_kobo > 0),
  status       text not null default 'initialized'
               check (status in ('initialized', 'success', 'failed', 'abandoned', 'mismatch')),
  channel      text,
  paystack_id  bigint,
  raw          jsonb,
  created_at   timestamptz not null default now(),
  verified_at  timestamptz
);

create index payment_attempts_booking_idx on public.payment_attempts (booking_ref, created_at desc);

alter table public.payment_attempts enable row level security;

create policy "admins read payment attempts" on public.payment_attempts
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.append_note(existing text, addition text)
returns text
language sql
immutable
as $$
  select case when coalesce(existing, '') = '' then addition else existing || ' · ' || addition end;
$$;

-- ---------------------------------------------------------------------------
-- Record a successful Paystack charge. Idempotent; safe to call from both the
-- verify endpoint and the webhook, in either order, any number of times.
-- ---------------------------------------------------------------------------
create or replace function public.record_paystack_payment(
  p_reference   text,
  p_amount_kobo integer,
  p_channel     text,
  p_paid_at     timestamptz,
  p_paystack_id bigint,
  p_raw         jsonb
)
returns table (outcome text, booking_ref text, booking_status text, payment_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.payment_attempts%rowtype;
  b public.bookings%rowtype;
  expected_kobo integer;
begin
  select * into a from public.payment_attempts where reference = p_reference for update;
  if not found then
    return query select 'unknown_reference'::text, null::text, null::text, null::text;
    return;
  end if;

  select * into b from public.bookings where ref = a.booking_ref for update;

  -- Already settled by the other path (verify vs webhook), or a second attempt paid twice.
  if b.payment_status = 'paid' then
    if b.payment_ref = p_reference then
      return query select 'already_paid'::text, b.ref, b.status, b.payment_status;
      return;
    end if;
    update public.payment_attempts
      set status = 'success', channel = p_channel, paystack_id = p_paystack_id, raw = p_raw, verified_at = now()
      where id = a.id;
    update public.bookings
      set note = public.append_note(note, 'DUPLICATE PAYMENT ' || p_reference || ' — refund required')
      where ref = b.ref;
    return query select 'duplicate_payment'::text, b.ref, b.status, b.payment_status;
    return;
  end if;

  -- Never trust the amount: it must equal what the server priced.
  expected_kobo := b.amount_due * 100;
  if p_amount_kobo <> expected_kobo then
    update public.payment_attempts
      set status = 'mismatch', channel = p_channel, paystack_id = p_paystack_id, raw = p_raw, verified_at = now()
      where id = a.id;
    update public.bookings
      set note = public.append_note(note, 'AMOUNT MISMATCH on ' || p_reference || ': paid ' || (p_amount_kobo / 100)::text || ', expected ' || b.amount_due::text)
      where ref = b.ref;
    return query select 'amount_mismatch'::text, b.ref, b.status, b.payment_status;
    return;
  end if;

  update public.payment_attempts
    set status = 'success', channel = p_channel, paystack_id = p_paystack_id, raw = p_raw, verified_at = now()
    where id = a.id;

  update public.bookings
    set payment_status  = 'paid',
        payment_ref     = p_reference,
        payment_channel = p_channel,
        paid_amount     = p_amount_kobo / 100,
        paid_at         = coalesce(p_paid_at, now()),
        hold_expires_at = null
    where ref = b.ref;

  if b.status = 'confirmed' then
    return query select 'paid'::text, b.ref, 'confirmed'::text, 'paid'::text;
    return;
  end if;

  if b.status = 'pending' then
    update public.bookings set status = 'confirmed' where ref = b.ref;
    return query select 'paid'::text, b.ref, 'confirmed'::text, 'paid'::text;
    return;
  end if;

  -- Cancelled — almost always an expired hold whose payment landed late.
  -- Reinstate if the nights are still free; otherwise flag for a refund.
  begin
    update public.bookings set status = 'confirmed' where ref = b.ref;
    update public.bookings
      set note = public.append_note(note, 'Paid after the hold expired; reinstated automatically')
      where ref = b.ref;
    return query select 'paid_reinstated'::text, b.ref, 'confirmed'::text, 'paid'::text;
    return;
  exception when exclusion_violation then
    update public.bookings
      set note = public.append_note(note, 'PAID AFTER HOLD EXPIRED — nights no longer free, refund required')
      where ref = b.ref;
    return query select 'paid_but_unavailable'::text, b.ref, 'cancelled'::text, 'paid'::text;
    return;
  end;
end;
$$;

revoke execute on function public.record_paystack_payment(text, integer, text, timestamptz, bigint, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Release nights held by Paystack bookings that were never paid. A 5-minute
-- grace after the hold covers a payment that lands as the hold lapses; a
-- late success after cancellation is handled by record_paystack_payment().
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with expired as (
    update public.bookings
      set status = 'cancelled',
          hold_expires_at = null,
          note = public.append_note(note, 'Cancelled automatically: payment not completed within the hold')
      where status = 'pending'
        and payment = 'paystack'
        and payment_status = 'unpaid'
        and hold_expires_at is not null
        and hold_expires_at < now() - interval '5 minutes'
      returning ref
  )
  select count(*) into n from expired;

  update public.payment_attempts
    set status = 'abandoned'
    where status = 'initialized' and created_at < now() - interval '2 hours';

  return n;
end;
$$;

revoke execute on function public.expire_stale_holds() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

select cron.schedule('perch-expire-holds', '*/5 * * * *', $$select public.expire_stale_holds()$$);
