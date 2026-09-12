# The Perch

Short-let booking site for The Perch, River Park Estate, Lugbe, Abuja.

Implemented from the Claude Design canvas in [`design/The Perch.dc.html`](design/The%20Perch.dc.html).

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase URL and anon key
npm run dev
```

`npm run build` typechecks and bundles to `dist/`; `npm run typecheck` runs the
compiler alone.

### Backend (Supabase)

Bookings, blocked dates and the staff list live in a Supabase project. The
schema is in `supabase/migrations/`, the booking endpoint in
`supabase/functions/create-booking/`, and the domain rules both sides share
(rate card, pricing, occupancy, validation) in `supabase/functions/_shared/`,
which the site imports as `@shared/*`.

To work locally with Docker running:

```bash
npx supabase start            # local Postgres, auth, edge runtime; prints the URL and anon key
npx supabase functions serve  # runs create-booking against the local database
```

Put the printed URL and anon key in `.env.local`. `npx supabase db reset`
re-applies the migrations from scratch.

To point at a hosted project:

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push                          # applies supabase/migrations
npx supabase functions deploy create-booking
```

Then in the dashboard set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` for
the site build, and the edge function secrets:

```bash
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_... "SITE_ORIGIN=https://your-domain,http://localhost:5173" BOOKING_HOLD_MINUTES=30
```

`SITE_ORIGIN` is a comma-separated list of origins allowed to call the
functions from a browser; leave it unset to allow any origin while testing.

For `npx supabase functions serve` locally, put the same values in
`supabase/functions/.env` (see `.env.example` there; the file is gitignored).

**Staff accounts.** Create the user under Authentication → Users, then run in
the SQL editor:

```sql
select public.grant_admin('staff@example.com');
```

Only users in the `admins` table can read guest details or change bookings;
row-level security enforces it, not the UI.

## Layout

```
design/            the original .dc.html mockup and its runtime, kept for reference
public/assets/     photography (see the README there — some files are still missing)
supabase/
  migrations/      database schema: bookings, date_blocks, admins, occupancy view
  functions/
    _shared/       domain code used by both the site and the functions (imported as @shared/*)
    _lib/          Deno-only helpers: HTTP, service-role client, Paystack API
    create-booking/      the public booking endpoint
    paystack-initialize/ starts a Paystack transaction for a booking
    paystack-verify/     confirms a transaction with Paystack and records it
    paystack-webhook/    receives charge.success from Paystack (signed)
src/
  App.tsx          screen state, hash routing, and the flows that cross screens
  theme.ts         palette, shared control/button styles, business contact details
  types.ts         UI state types; re-exports the domain types from @shared
  data/            marketing copy, gallery, admin tabs + status styles
  lib/             formatting, calendar grids, the Supabase store and API client,
                   plus thin re-exports of the shared pricing/occupancy/validation
  components/      header, footer, image slot, icons, booking summary
  screens/         one file per screen
```

## How it maps to the mockup

The mockup was a single `<x-dc>` document driven by a `DCLogic` class: one
`state` object, a `renderVals()` that derived every binding, and `sc-if` /
`sc-for` for control flow. That structure maps onto React directly, so:

- `state` became `useState` in `App.tsx`, with screen-local state (gallery
  filter, FAQ accordion, contact form) pushed down into the screens that own it.
- `renderVals()` disappeared — each screen derives what it needs where it
  renders it. Pure derivations (`priceBreakdown`, the calendar grid) moved to
  `src/lib/`.
- `<image-slot>` — a designer affordance for dropping photos onto the canvas —
  became `<ImageSlot>`, which renders the photo when there is one and a labelled
  placeholder when there isn't.
- Inline styles were kept, since that is how the mockup expressed the design.
  Repeated values moved into `theme.ts`; the responsive `data-*` breakpoints
  carried over verbatim into `src/styles.css`.

Screens are addressable by hash (`#/apartments`, `#/booking`, `#/admin`, …) so
back/forward and deep links work without pulling in a router.

## Pricing

`supabase/functions/_shared/pricing.ts` is the single source of truth, and it
runs in two places: the site uses it to show the guest a total, and the
`create-booking` function uses it to decide what is actually stored. A stay is
priced per night, with Friday and Saturday nights billed at the weekend rate,
plus a cleaning fee and a refundable deposit. Stays shorter than an apartment's
minimum are rejected rather than priced.

Two amounts come out of it. `dueOnline` (stay plus cleaning) is what the guest
pays before arrival, by Paystack or bank transfer; the deposit is collected at
check-in and returned after checkout. `total` includes the deposit and is what
the admin dashboard reports.

Rates in `supabase/functions/_shared/apartments.ts` are the official rate card:
₦70,000 a night for Robin, Weaver, Sunbird and Hornbill, ₦90,000 for Kingfisher
and Turaco. Weekend and weekday rates are the same.

## Paying with Paystack

Choosing "Pay now with Paystack" on step 4 runs this sequence, all driven from
`confirmBooking` in `App.tsx`:

1. `create-booking` saves the reservation as pending with a 30-minute hold
   (`hold_expires_at`).
2. `paystack-initialize` prices the booking server-side, creates a
   `payment_attempts` row with reference `PRC-xxxxx-n`, and asks Paystack for
   an access code. The browser never sees a Paystack key.
3. `src/lib/paystack.ts` opens the Paystack popup with that access code.
4. When the popup closes, `paystack-verify` asks Paystack for the verdict and
   calls `record_paystack_payment()` in the database, which checks the amount,
   marks the booking paid and confirmed, and is a no-op on repeat calls.
5. `paystack-webhook` receives `charge.success` independently (signature
   checked with HMAC-SHA512) and calls the same function, so a guest whose
   connection dropped is still confirmed.

`expire_stale_holds()` runs every five minutes through pg_cron and cancels
Paystack bookings still unpaid five minutes past their hold. A payment that
lands after that reinstates the booking if the nights are still free, and
otherwise marks it "refund required" in the note for the admin.

Bank transfer and pay-on-arrival bookings are unchanged: pending until an admin
confirms. Pay on Arrival is only offered for stays booked 48 hours or more
ahead.

## Bookings and the admin area

`src/lib/store.ts` is the only module that reads or writes the database. It
exposes `useStore()` with:

- `holds` and `blocks` for everyone, read from the `occupancy` view, which
  carries dates and status but no guest data. The availability search, the
  booking flow's room picker and the detail page calendar consult these.
- `bookings` (full records) for signed-in staff, kept live through Supabase
  realtime.

Website bookings go through the `create-booking` edge function, which
re-validates the stay, prices it server-side and inserts it as **pending**. A
database exclusion constraint makes double-booking an apartment impossible
even under a race; the function turns that into a "dates just taken" message.
Paystack bookings carry a 30-minute hold (`hold_expires_at`) for phase 1.

`src/lib/occupancy.ts` (shared) decides availability: pending and confirmed
bookings and admin blocks all hold their nights; cancelled bookings release
them.

`#/admin` (footer link) signs in with Supabase Auth. It has a dashboard
(totals, revenue, occupancy, arrivals), a bookings list with confirm/cancel, a
form for offline bookings taken by phone or WhatsApp, a 21-day timeline, and a
block-dates form for maintenance or owner use.

## What is still mocked

- **Bank transfer** has no upload for payment evidence; the admin confirms by
  hand after checking the account.
- **Refunds** are done in the Paystack dashboard; the admin only sees the note.
- **The contact form** and booking confirmation email are not sent anywhere.
