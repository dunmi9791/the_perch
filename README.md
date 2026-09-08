# The Perch

Short-let booking site for The Perch, River Park Estate, Lugbe, Abuja.

Implemented from the Claude Design canvas in [`design/The Perch.dc.html`](design/The%20Perch.dc.html).

## Running it

```bash
npm install
npm run dev
```

`npm run build` typechecks and bundles to `dist/`; `npm run typecheck` runs the
compiler alone.

## Layout

```
design/            the original .dc.html mockup and its runtime, kept for reference
public/assets/     photography (see the README there — some files are still missing)
src/
  App.tsx          screen state, hash routing, and the flows that cross screens
  theme.ts         palette, shared control/button styles, business contact details
  types.ts
  data/            apartments, marketing copy, gallery, admin tabs + status styles
  lib/             formatting, stay pricing, calendar grids, occupancy checks, booking store
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

`src/lib/pricing.ts` is the single source of truth. A stay is priced per night,
with Friday and Saturday nights billed at the weekend rate, plus a cleaning fee
and a refundable deposit. Stays shorter than an apartment's minimum are rejected
rather than priced.

Rates in `src/data/apartments.ts` are the official rate card: ₦70,000 a night for
Robin, Weaver, Sunbird and Hornbill, ₦90,000 for Kingfisher and Turaco. Weekend
and weekday rates are the same.

## Bookings and the admin area

`src/lib/store.ts` keeps bookings and blocked dates in `localStorage` (key
`perch.store.v1`) and exposes them through `useStore()`. It is deliberately the
only place that reads or writes persistence, so moving to a real backend means
replacing its `load`/`commit` pair and nothing else.

- Website bookings are saved as **pending** when the guest submits step 4.
- `src/lib/occupancy.ts` decides availability: pending and confirmed bookings
  and admin blocks all hold their nights; cancelled bookings release them. The
  availability search, the booking flow's room picker, and the detail page's
  Reserve button all consult it.
- `#/admin` (footer link) is behind a passcode in `src/data/admin.ts`. It has a
  dashboard (totals, revenue, occupancy, arrivals), a bookings list with
  confirm/cancel, a form for offline bookings taken by phone or WhatsApp, a
  21-day timeline, and a block-dates form for maintenance or owner use.

The passcode is a convenience lock for a static site, not security: anyone with
the source can read it, and the data lives in the browser that entered it. Move
both to a server before storing real guest details.

## What is still mocked

Nothing here talks to a backend yet:

- **Persistence is per-browser.** Bookings made on a guest's phone are only
  visible in that phone's `localStorage`; the admin sees them only when made on
  the same device. A backend is needed before real guests book online.
- **Payment** selects a method and generates a reference; no processor is wired
  up, and there is no upload for bank-transfer evidence.
- **The contact form** and booking confirmation email are not sent anywhere.
- **Admin auth** is a client-side passcode, see above.
