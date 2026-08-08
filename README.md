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
  data/            apartments, marketing copy, gallery, admin demo data
  lib/             currency + date formatting, stay pricing, calendar grids
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

Rates in `src/data/apartments.ts` are the demo card from the mockup, which is why
"SAMPLE RATE" appears next to prices. **Replace them with the real rate card
before launch**, and drop the sample-rate labels with them.

## What is still mocked

Nothing here talks to a backend yet:

- **Availability** is not real — every apartment that fits the guest count is
  offered for any date range. The detail-page calendar and the admin timeline
  are coloured from fixed seeds.
- **Payment** selects a method and generates a reference; no processor is wired
  up, and there is no upload for bank-transfer evidence.
- **The contact form** and booking confirmation email are not sent anywhere.
- **Admin** is a static demo dashboard with no auth behind the footer link.
