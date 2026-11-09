-- The Perch: editable rates, tax and deposit, with a change log.
--
-- Room rates move out of the code into `room_rates`, one row per room, and
-- the tax rate and caution deposit into `pricing_settings`, a single row.
-- Anyone may read both (they are on the public site anyway); nobody may
-- write them directly. Staff change them through set_room_rates() and
-- set_pricing_settings(), which record every change, with who made it,
-- when, the old and new values and an optional reason, in `rate_history`.
-- The log is append-only.
--
-- Bookings store the amounts they were priced at, so changing a rate never
-- alters an existing booking.

create table public.room_rates (
  apartment_id  integer primary key,
  nightly       integer not null check (nightly > 0),
  weekend       integer not null check (weekend > 0),
  weekly        integer not null check (weekly >= 0),
  monthly       integer not null check (monthly >= 0),
  min_stay      integer not null default 1 check (min_stay between 1 and 365),
  updated_at    timestamptz not null default now(),
  updated_by    text not null default 'system'
);

comment on table public.room_rates is 'Current rate card, in naira, tax inclusive. Change only through set_room_rates(), which logs to rate_history.';

create table public.pricing_settings (
  -- Exactly one row.
  id               boolean primary key default true check (id),
  -- Percent of a room rate that is tax, e.g. 7.5. Rates are tax inclusive, so
  -- this is never added on top of the subtotal.
  tax_rate         numeric(5, 2) not null check (tax_rate >= 0 and tax_rate <= 100),
  -- Refundable, once per booking, in naira.
  caution_deposit  integer not null check (caution_deposit >= 0),
  updated_at       timestamptz not null default now(),
  updated_by       text not null default 'system'
);

comment on table public.pricing_settings is 'Tax share of the (tax-inclusive) rates and the caution deposit added to every booking. Change only through set_pricing_settings(), which logs to rate_history.';

create table public.rate_history (
  id            bigint generated always as identity primary key,
  -- The room changed, or null for tax/deposit, which apply to every booking.
  apartment_id  integer,
  -- Only the fields that changed: {"nightly": {"from": 70000, "to": 75000}, …}
  changes       jsonb not null,
  note          text not null default '',
  changed_by    text not null,
  changed_at    timestamptz not null default now()
);

create index rate_history_changed_at_idx on public.rate_history (changed_at desc);
create index rate_history_apartment_idx on public.rate_history (apartment_id, changed_at desc);

-- The rate card as of September 2026, which the code carried until now.
insert into public.room_rates (apartment_id, nightly, weekend, weekly, monthly, min_stay) values
  (1, 70000, 70000, 490000, 2100000, 1),
  (2, 70000, 70000, 490000, 2100000, 1),
  (3, 70000, 70000, 490000, 2100000, 1),
  (4, 70000, 70000, 490000, 2100000, 1),
  (5, 90000, 90000, 630000, 2700000, 1),
  (6, 90000, 90000, 630000, 2700000, 1);

insert into public.rate_history (apartment_id, changes, note, changed_by)
select
  apartment_id,
  jsonb_build_object(
    'nightly',  jsonb_build_object('from', null, 'to', nightly),
    'weekend',  jsonb_build_object('from', null, 'to', weekend),
    'weekly',   jsonb_build_object('from', null, 'to', weekly),
    'monthly',  jsonb_build_object('from', null, 'to', monthly),
    'min_stay', jsonb_build_object('from', null, 'to', min_stay)
  ),
  'Starting rate card (Sept 2026)',
  'system'
from public.room_rates;

insert into public.pricing_settings (tax_rate, caution_deposit) values (7.5, 100000);

insert into public.rate_history (apartment_id, changes, note, changed_by) values (
  null,
  jsonb_build_object(
    'tax_rate',        jsonb_build_object('from', null, 'to', 7.5),
    'caution_deposit', jsonb_build_object('from', null, 'to', 100000)
  ),
  'Starting tax and caution deposit (Oct 2026)',
  'system'
);

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------
alter table public.room_rates enable row level security;
alter table public.pricing_settings enable row level security;
alter table public.rate_history enable row level security;

create policy "anyone reads room rates" on public.room_rates
  for select to anon, authenticated
  using (true);

create policy "anyone reads pricing settings" on public.pricing_settings
  for select to anon, authenticated
  using (true);

create policy "admins read rate history" on public.rate_history
  for select to authenticated
  using ((select public.is_admin()));

-- No insert/update/delete policies: writes go through the set_* functions only.
revoke insert, update, delete, truncate on public.room_rates from anon, authenticated;
revoke insert, update, delete, truncate on public.pricing_settings from anon, authenticated;
revoke insert, update, delete, truncate on public.rate_history from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Change a room's rates and log what changed. Staff only.
-- Returns the number of fields that changed (0 means nothing was logged).
-- ---------------------------------------------------------------------------
create or replace function public.set_room_rates(
  p_apartment_id integer,
  p_nightly      integer,
  p_weekend      integer,
  p_weekly       integer,
  p_monthly      integer,
  p_min_stay     integer,
  p_note         text default ''
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cur     public.room_rates%rowtype;
  diff    jsonb := '{}'::jsonb;
  who     text;
begin
  if not public.is_admin() then
    raise exception 'Only staff can change rates.' using errcode = '42501';
  end if;

  select * into cur from public.room_rates where apartment_id = p_apartment_id for update;
  if not found then
    raise exception 'Unknown room %.', p_apartment_id;
  end if;

  if cur.nightly  is distinct from p_nightly  then diff := diff || jsonb_build_object('nightly',  jsonb_build_object('from', cur.nightly,  'to', p_nightly));  end if;
  if cur.weekend  is distinct from p_weekend  then diff := diff || jsonb_build_object('weekend',  jsonb_build_object('from', cur.weekend,  'to', p_weekend));  end if;
  if cur.weekly   is distinct from p_weekly   then diff := diff || jsonb_build_object('weekly',   jsonb_build_object('from', cur.weekly,   'to', p_weekly));   end if;
  if cur.monthly  is distinct from p_monthly  then diff := diff || jsonb_build_object('monthly',  jsonb_build_object('from', cur.monthly,  'to', p_monthly));  end if;
  if cur.min_stay is distinct from p_min_stay then diff := diff || jsonb_build_object('min_stay', jsonb_build_object('from', cur.min_stay, 'to', p_min_stay)); end if;

  if diff = '{}'::jsonb then
    return 0;
  end if;

  select email into who from public.admins where user_id = auth.uid();

  -- Column checks reject bad values here, before anything is logged.
  update public.room_rates
    set nightly    = p_nightly,
        weekend    = p_weekend,
        weekly     = p_weekly,
        monthly    = p_monthly,
        min_stay   = p_min_stay,
        updated_at = now(),
        updated_by = coalesce(who, 'unknown')
    where apartment_id = p_apartment_id;

  insert into public.rate_history (apartment_id, changes, note, changed_by)
  values (p_apartment_id, diff, coalesce(left(trim(p_note), 500), ''), coalesce(who, 'unknown'));

  return (select count(*) from jsonb_object_keys(diff));
end;
$$;

revoke execute on function public.set_room_rates(integer, integer, integer, integer, integer, integer, text) from public, anon;
grant execute on function public.set_room_rates(integer, integer, integer, integer, integer, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Change the tax rate and caution deposit and log what changed. Staff only.
-- Returns the number of fields that changed (0 means nothing was logged).
-- ---------------------------------------------------------------------------
create or replace function public.set_pricing_settings(
  p_tax_rate        numeric,
  p_caution_deposit integer,
  p_note            text default ''
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cur   public.pricing_settings%rowtype;
  diff  jsonb := '{}'::jsonb;
  who   text;
  v_tax numeric(5, 2) := round(p_tax_rate, 2);
begin
  if not public.is_admin() then
    raise exception 'Only staff can change tax or the deposit.' using errcode = '42501';
  end if;

  select * into cur from public.pricing_settings where id for update;
  if not found then
    raise exception 'Pricing settings are missing.';
  end if;

  if cur.tax_rate        is distinct from v_tax             then diff := diff || jsonb_build_object('tax_rate',        jsonb_build_object('from', cur.tax_rate,        'to', v_tax));             end if;
  if cur.caution_deposit is distinct from p_caution_deposit then diff := diff || jsonb_build_object('caution_deposit', jsonb_build_object('from', cur.caution_deposit, 'to', p_caution_deposit)); end if;

  if diff = '{}'::jsonb then
    return 0;
  end if;

  select email into who from public.admins where user_id = auth.uid();

  update public.pricing_settings
    set tax_rate        = v_tax,
        caution_deposit = p_caution_deposit,
        updated_at      = now(),
        updated_by      = coalesce(who, 'unknown')
    where id;

  insert into public.rate_history (apartment_id, changes, note, changed_by)
  values (null, diff, coalesce(left(trim(p_note), 500), ''), coalesce(who, 'unknown'));

  return (select count(*) from jsonb_object_keys(diff));
end;
$$;

revoke execute on function public.set_pricing_settings(numeric, integer, text) from public, anon;
grant execute on function public.set_pricing_settings(numeric, integer, text) to authenticated;

-- Staff screens refresh when rates change.
alter publication supabase_realtime add table public.room_rates;
alter publication supabase_realtime add table public.pricing_settings;
alter publication supabase_realtime add table public.rate_history;
