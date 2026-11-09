// Section G over HTTP: the webhook endpoint, against the local stack.
// The webhook trusts a correctly signed body, so this exercises the real
// signature check and the real database path without Paystack.
//
// The secret below is a local-only dummy, not a Paystack key: put the same
// line in supabase/functions/.env (gitignored) before serving the functions.
// See tests/README.md for the three commands this needs.
import { createHmac } from 'node:crypto';

const URL = 'http://127.0.0.1:54321/functions/v1/paystack-webhook';
const SECRET = 'sk_test_local_signature_only';
const [PAID_REF, MISMATCH_REF] = process.argv.slice(2);
if (!PAID_REF || !MISMATCH_REF) throw new Error('pass the two seeded booking refs');

const sign = (body) => createHmac('sha512', SECRET).update(body).digest('hex');

let pass = 0;
const fails = [];
function check(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(name); console.log(`  FAIL ${name}\n        got  ${g}\n        want ${w}`); }
}

function charge(reference, over = {}) {
  return JSON.stringify({
    event: 'charge.success',
    data: {
      id: 900001, status: 'success', reference, amount: 38000000, currency: 'NGN',
      channel: 'card', paid_at: new Date().toISOString(), customer: { email: 'webhook@example.com' },
      ...over,
    },
  });
}

async function post(body, { signature = 'auto', method = 'POST' } = {}) {
  const headers = { 'content-type': 'application/json' };
  const sig = signature === 'auto' ? sign(body) : signature;
  if (sig !== null) headers['x-paystack-signature'] = sig;
  const res = await fetch(URL, { method, headers, body: method === 'GET' ? undefined : body });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep the text */ }
  return { status: res.status, json, text };
}

console.log('\nSignature check');
{
  const body = charge(`${PAID_REF}-1`);
  check('an unsigned request is refused', (await post(body, { signature: null })).status, 401);
  check('a wrong signature is refused', (await post(body, { signature: 'f'.repeat(128) })).status, 401);
  check('a short signature is refused', (await post(body, { signature: 'abc' })).status, 401);
  // Sign one body, send another: this is the tampering the check exists for.
  const tampered = charge(`${PAID_REF}-1`, { amount: 100 });
  const r = await fetch(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-paystack-signature': sign(body) },
    body: tampered,
  });
  check('a body changed after signing is refused', r.status, 401);
  check('GET is refused', (await post(body, { method: 'GET' })).status, 405);
}

console.log('\nA signed charge.success');
{
  const r = await post(charge(`${PAID_REF}-1`));
  check('accepted', r.status, 200);
  check('the booking is paid', r.json?.outcome, 'paid');
  check('it names the booking', r.json?.booking, PAID_REF);

  const again = await post(charge(`${PAID_REF}-1`));
  check('a retry changes nothing', [again.status, again.json?.outcome], [200, 'already_paid']);
  const third = await post(charge(`${PAID_REF}-1`));
  check('and a third delivery too', third.json?.outcome, 'already_paid');
}

console.log('\nAmounts and references');
{
  // Paystack reporting 1,000 naira against a 380,000 booking.
  const r = await post(charge(`${MISMATCH_REF}-1`, { amount: 100000 }));
  check('a short payment is refused', [r.status, r.json?.outcome], [200, 'amount_mismatch']);
  const unknown = await post(charge('PRC-00000-1'));
  check('an unknown reference is reported', unknown.json?.outcome, 'unknown_reference');
}

console.log('\nOther events and bad bodies');
{
  const failed = JSON.stringify({ event: 'charge.failed', data: { reference: `${MISMATCH_REF}-1`, status: 'failed' } });
  const r = await post(failed);
  check('charge.failed is acknowledged and ignored', [r.status, r.json?.ignored], [200, 'charge.failed']);
  const transfer = JSON.stringify({ event: 'transfer.success', data: {} });
  check('an unrelated event is ignored', (await post(transfer)).json?.ignored, 'transfer.success');
  check('malformed JSON is refused', (await post('{not json')).status, 400);
  const noEvent = JSON.stringify({ data: { reference: 'x' } });
  check('a body with no event is ignored', (await post(noEvent)).json?.ignored, 'unknown');
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { console.log('failed: ' + fails.join('; ')); process.exit(1); }
