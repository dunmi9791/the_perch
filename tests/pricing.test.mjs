// The pricing and input rules the server runs on every booking: the part of
// the plan's section G test matrix that needs neither Paystack nor a database.
// Exercises the real shared modules, bundled from supabase/functions/_shared
// by `npm run test:pricing` (Node cannot import .ts directly).
import { parseBookingInput, arrivalPaymentAllowed } from './.bundle/booking-input.mjs';

let pass = 0;
const fails = [];
function check(name, got, want) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(name); console.log(`  FAIL ${name}\n        got  ${g}\n        want ${w}`); }
}

const PRICING = { taxRate: 7.5, cautionDeposit: 100000 };

function room(id, nightly, weekend = nightly, maxGuests = 2, minStay = 1) {
  return { id, name: `Room ${id}`, type: 't', maxGuests, bedrooms: 1, bathrooms: '1', beds: '1',
    size: 's', unitCount: 1, shortDesc: '', longDesc: '', amenities: [],
    nightly, weekend, weekly: nightly * 7, monthly: nightly * 30, minStay,
    checkinTime: '2:00 PM', checkoutTime: '11:00 AM' };
}

const ROOMS = [room(1, 70000), room(2, 70000), room(3, 70000), room(4, 70000), room(5, 90000), room(6, 90000)];
const GUEST = { name: 'Ada Obi', email: 'ada@example.com', phone: '08031234567' };
const TODAY = '2026-11-09';

function parse(over = {}) {
  return parseBookingInput(
    { apartmentIds: [1, 2], checkIn: '2026-11-16', checkOut: '2026-11-18', adults: 2, children: 0,
      guest: GUEST, payment: 'paystack', ...over },
    TODAY, ROOMS, PRICING,
  );
}

console.log('\nPricing — rates are charge inclusive');
{
  const r = parse();
  if (!r.ok) throw new Error('baseline booking was rejected: ' + r.error);
  const p = r.price;
  // Mon 16 → Wed 18: two weekday nights in two 70,000 rooms.
  check('room subtotal is the rate card, untouched', p.subtotal, 280000);
  check('tax is backed out of the subtotal', p.tax, 19535);          // 280000 × 7.5/107.5
  check('tax is NOT added to the total', p.total, 380000);           // subtotal + deposit only
  check('deposit charged once per booking', p.deposit, 100000);
  check('due online equals the total', p.dueOnline, p.total);
  check('total = subtotal + deposit exactly', p.total, p.subtotal + p.deposit);
  check('nights counted', p.nights, 2);
}
{
  // A 0% tax setting must not change what the guest pays.
  const r = parseBookingInput(
    { apartmentIds: [1, 2], checkIn: '2026-11-16', checkOut: '2026-11-18', adults: 2, children: 0, guest: GUEST, payment: 'paystack' },
    TODAY, ROOMS, { taxRate: 0, cautionDeposit: 100000 },
  );
  check('0% tax leaves the price alone', [r.price.tax, r.price.total], [0, 380000]);
}
{
  // Weekend nights bill at the weekend rate: Fri 20 and Sat 21.
  const weekendRooms = [room(1, 70000, 90000), room(2, 70000, 90000), ...ROOMS.slice(2)];
  const r = parseBookingInput(
    { apartmentIds: [1, 2], checkIn: '2026-11-20', checkOut: '2026-11-22', adults: 2, children: 0, guest: GUEST, payment: 'paystack' },
    TODAY, weekendRooms, PRICING,
  );
  check('Fri and Sat bill at the weekend rate', r.price.subtotal, 360000);
  check('tax follows the weekend subtotal', r.price.tax, 25116);     // 360000 × 7.5/107.5
}
{
  // The tax share of a 90,000 room, to the naira.
  const r = parseBookingInput(
    { apartmentIds: [5, 6], checkIn: '2026-11-16', checkOut: '2026-11-17', adults: 2, children: 0, guest: GUEST, payment: 'paystack' },
    TODAY, ROOMS, PRICING,
  );
  check('one night, two larger rooms', [r.price.subtotal, r.price.tax, r.price.total], [180000, 12558, 280000]);
}

console.log('\nBooking rules the server re-runs');
check('a single room is refused', parse({ apartmentIds: [1] }).error, 'Please choose at least 2 rooms.');
check('two rooms are accepted', parse({ apartmentIds: [1, 2] }).ok, true);
check('an unknown room is refused', parse({ apartmentIds: [1, 99] }).error, 'Unknown apartment.');
check('duplicate ids collapse to one room', parse({ apartmentIds: [1, 1] }).error, 'Please choose at least 2 rooms.');
check('a party too large for the rooms is refused',
  parse({ adults: 5 }).error, 'The rooms you chose sleep up to 4 guests. Add another room.');
check('check-out before check-in is refused',
  parse({ checkIn: '2026-11-18', checkOut: '2026-11-16' }).error, 'Check-out date must be after check-in date.');
check('a past check-in is refused', parse({ checkIn: '2026-11-01', checkOut: '2026-11-03' }).error, 'Check-in date cannot be in the past.');
check('a bad email is refused', parse({ guest: { ...GUEST, email: 'ada@' } }).error, 'Please enter a valid email address.');
check('a price in the body is ignored', parse({ total: 1, amount_due: 1 }).price.total, 380000);

console.log('\nPay on Arrival, 48-hour rule');
check('48 hours ahead is allowed', arrivalPaymentAllowed('2026-11-11', TODAY), true);
check('tomorrow is refused', arrivalPaymentAllowed('2026-11-10', TODAY), false);
check('same day is refused', arrivalPaymentAllowed(TODAY, TODAY), false);
check('the parser refuses a late arrival booking',
  parse({ checkIn: '2026-11-10', checkOut: '2026-11-12', payment: 'arrival' }).field, 'payment');
check('transfer is accepted for the same dates',
  parse({ checkIn: '2026-11-10', checkOut: '2026-11-12', payment: 'transfer' }).ok, true);
check('an unknown payment method is refused', parse({ payment: 'bitcoin' }).error, 'Choose a payment method.');

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { console.log('failed: ' + fails.join('; ')); process.exit(1); }
