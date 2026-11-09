# Tests

The parts of the plan's section G matrix that can run without Paystack. Last
full run: 9 November 2026, 92 checks, all passing.

Everything here runs against the **local** Supabase stack, never the hosted
project. Start it first:

```bash
npx supabase start
```

## 1 · Pricing and booking rules — 26 checks

No database needed. Bundles the shared modules with esbuild (Node cannot
import `.ts` directly) and asserts against the real `priceBreakdown` and
`parseBookingInput`.

```bash
npm run test:pricing
```

Covers: room rates are charge inclusive, so the 7.5% is backed out of the
subtotal (`subtotal × 7.5 / 107.5`) and never added to it; `total` is
`subtotal + deposit`; weekend nights bill at the weekend rate; the caution
deposit is charged once; at least two rooms; capacity; dates; the 48-hour
Pay-on-Arrival rule; and a price sent in the request body being ignored.

## 2 · Payments in the database — 38 checks

Runs inside one transaction and rolls back, so it leaves nothing behind.
`record_paystack_payment()` is what both the verify endpoint and the webhook
call, so this covers either arrival order.

```bash
npm run test:db
```

Covers: verify and webhook in either order, repeat deliveries, a second charge
flagged for refund, a short or over payment refused, an unknown reference, hold
expiry and its five-minute grace, nights going back on sale, and a payment that
lands after the hold lapsed (reinstated when the nights are free, flagged when
they were resold).

## 3 · The functions over HTTP — 28 checks

These need the functions served locally. The webhook is signed with HMAC-SHA512
of the raw body, so a **local dummy secret** is enough to exercise the real
signature check — no Paystack key is involved. Put this line in
`supabase/functions/.env`, which is gitignored:

```
PAYSTACK_SECRET_KEY=sk_test_local_signature_only
```

Then, in one terminal:

```bash
npx supabase functions serve --env-file supabase/functions/.env --no-verify-jwt
```

In another:

```bash
npm run test:create-booking
```

```bash
docker exec -i supabase_db_the_perch psql -U postgres -d postgres -q < tests/webhook-seed.sql
```

The seed prints two booking refs. Pass them in that order — the first gets
paid, the second gets underpaid:

```bash
node tests/webhook.test.mjs PRC-11111 PRC-22222
```

Then put the database back as it was:

```bash
npm run test:cleanup
```

`create-booking` checks the amount Paystack would be asked for, priced from
`room_rates` and `pricing_settings`, and that overlapping nights return 409.
The webhook checks that unsigned, mis-signed and tampered bodies are refused
with 401, that a signed `charge.success` pays its booking, that retries are
no-ops, that other events are acknowledged and ignored, and that malformed
JSON returns 400.

## Still to run, because it needs Paystack

A test key pair is required for all of it, and none is in `.env.local` today.

- The popup card flow: the successful card `4084 0840 8408 4081`, a declined
  card, and one that asks for an OTP. Needs `VITE_PAYSTACK_PUBLIC_KEY` for the
  site and a `sk_test_…` secret for the functions.
- `paystack-initialize` and `paystack-verify`, which call `api.paystack.co`.
- The Paystack dashboard's own "send test webhook" against the deployed
  endpoint. The signature check above used a dummy secret, so Paystack's real
  signing is still unproven.
