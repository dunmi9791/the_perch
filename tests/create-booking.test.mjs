// Section G over HTTP: create-booking against the local stack, which prices
// from room_rates and pricing_settings exactly as the deployed function does.
// This is the amount Paystack would be asked to charge. The bookings it makes
// are cleaned up by tests/webhook-cleanup.sql; see tests/README.md.
const URL = 'http://127.0.0.1:54321/functions/v1/create-booking';

let pass = 0;
const fails = [];
const made = [];
function check(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(name); console.log(`  FAIL ${name}\n        got  ${g}\n        want ${w}`); }
}

// Two weekday nights, far enough out for every payment method.
const base = {
  apartmentIds: [1, 2], checkIn: '2027-07-05', checkOut: '2027-07-07', adults: 2, children: 0,
  guest: { name: 'HTTP Test', email: 'http@example.com', phone: '08030000000' },
  payment: 'paystack',
};

async function post(over = {}) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...base, ...over }),
  });
  const json = await res.json().catch(() => null);
  if (json?.ref) made.push(json.ref);
  return { status: res.status, json };
}

console.log('\nWhat the server prices a booking at');
{
  const r = await post();
  check('a two-room booking is created', r.status, 201);
  check('total is rooms plus deposit, tax inside the rate', r.json?.total, 380000);
  check('Paystack is asked for the same figure', r.json?.amountDue, 380000);
  check('the deposit is in it, once', r.json?.deposit, 100000);
  check('it starts pending', r.json?.status, 'pending');
  check('a hold is set for Paystack', typeof r.json?.holdExpiresAt, 'string');
}

console.log('\nRules the server enforces whatever the browser sends');
{
  const one = await post({ apartmentIds: [3], checkIn: '2027-07-10', checkOut: '2027-07-12' });
  check('a single room is refused', [one.status, one.json?.error], [422, 'Please choose at least 2 rooms.']);

  const priced = await post({ apartmentIds: [3, 4], checkIn: '2027-07-10', checkOut: '2027-07-12', total: 1, amount_due: 1, deposit: 0 });
  check('a price in the body is ignored', [priced.status, priced.json?.total], [201, 380000]);

  const clash = await post({ apartmentIds: [1, 2], checkIn: '2027-07-06', checkOut: '2027-07-08' });
  check('overlapping nights are refused', clash.status, 409);

  const late = await post({ apartmentIds: [5, 6], checkIn: new Date(Date.now() + 86400000).toISOString().slice(0, 10), checkOut: '2027-07-20', payment: 'arrival' });
  check('pay-on-arrival inside 48 hours is refused', [late.status, late.json?.field], [422, 'payment']);

  const bad = await post({ guest: { name: 'HTTP Test', email: 'nope', phone: '08030000000' } });
  check('a bad email is refused', [bad.status, bad.json?.field], [422, 'guest']);

  const larger = await post({ apartmentIds: [5, 6], checkIn: '2027-08-03', checkOut: '2027-08-04' });
  check('one night in the two larger rooms', larger.json?.total, 280000);
}

console.log(`\n${pass} passed, ${fails.length} failed`);
console.log('bookings created: ' + (made.join(', ') || 'none'));
if (fails.length) process.exit(1);
