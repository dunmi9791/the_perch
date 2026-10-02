import { useEffect, useState } from 'react';
import type {
  Apartment,
  AvailabilityState,
  BookingState,
  FilterState,
  GuestDetails,
  Screen,
} from './types';
import { c, CONTACT } from './theme';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './screens/Home';
import { Apartments, EMPTY_FILTERS } from './screens/Apartments';
import { ApartmentDetail } from './screens/ApartmentDetail';
import { Availability } from './screens/Availability';
import { Booking } from './screens/Booking';
import { Gallery } from './screens/Gallery';
import { About } from './screens/About';
import { Contact } from './screens/Contact';
import { Admin } from './screens/Admin';
import { findApartment } from './data/apartments';
import { MIN_ROOMS } from './lib/pricing';
import { getStore, refreshStore } from './lib/store';
import { BookingError, createBooking, initializePayment, verifyPayment } from './lib/api';
import { openPaystack } from './lib/paystack';
import type { PaymentPhase, PaymentReceipt } from './screens/Booking';
import { isAvailable } from './lib/occupancy';
import { fitsCapacity, guestError, stayError } from './lib/validation';

/** Identity of a booking as submitted; a change to any of these is a new booking, not a retry. */
function bookingKey(b: BookingState): string {
  return [[...b.apartmentIds].sort((x, y) => x - y).join(','), b.checkIn, b.checkOut, b.adults, b.children, b.guest.email.trim().toLowerCase()].join('|');
}

const EMPTY_GUEST: GuestDetails = {
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  arrival: '',
  purpose: '',
  requests: '',
};

const INITIAL_BOOKING: BookingState = {
  step: 1,
  checkIn: '',
  checkOut: '',
  adults: '2',
  children: '0',
  apartmentIds: [],
  guest: EMPTY_GUEST,
  payment: 'transfer',
};

const INITIAL_AVAIL: AvailabilityState = {
  checkIn: '',
  checkOut: '',
  adults: '2',
  children: '0',
};

const SCREENS: Screen[] = [
  'home',
  'apartments',
  'detail',
  'availability',
  'booking',
  'gallery',
  'about',
  'contact',
  'admin',
];

function screenFromHash(): Screen {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return (SCREENS as string[]).includes(raw) ? (raw as Screen) : 'home';
}

export function App() {
  const [screen, setScreen] = useState<Screen>(screenFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avail, setAvail] = useState<AvailabilityState>(INITIAL_AVAIL);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [detailId, setDetailId] = useState(1);
  const [booking, setBooking] = useState<BookingState>(INITIAL_BOOKING);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [confirmedKey, setConfirmedKey] = useState<string | null>(null);
  const [phase, setPhase] = useState<PaymentPhase>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);

  // The hash keeps the address bar meaningful and makes back/forward work
  // without pulling in a router for what is a single-page mockup.
  useEffect(() => {
    const onHashChange = () => setScreen(screenFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Applies to back/forward and pasted URLs, not just in-app nav clicks.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  const navigate = (next: Screen) => {
    setScreen(next);
    setMenuOpen(false);
    window.location.hash = `/${next}`;
  };

  const viewApartment = (id: number) => {
    setDetailId(id);
    navigate('detail');
  };

  const patchBooking = (patch: Partial<BookingState>) => setBooking((b) => ({ ...b, ...patch }));
  const patchGuest = (patch: Partial<GuestDetails>) =>
    setBooking((b) => ({ ...b, guest: { ...b.guest, ...patch } }));

  /**
   * Availability -> booking: carry the dates and the picked room. The guest
   * lands on the room step to add the rest, unless the dates need fixing.
   */
  const selectFromAvailability = (id: number) => {
    setBooking((b) => ({
      ...b,
      checkIn: avail.checkIn,
      checkOut: avail.checkOut,
      adults: avail.adults,
      children: avail.children,
      apartmentIds: [id],
      step: stayError(avail.checkIn, avail.checkOut) ? 1 : 2,
    }));
    navigate('booking');
  };

  /** Detail -> booking: add this room, then the dates step or the room step to pick the others. */
  const reserveFromDetail = () => {
    setBooking((b) => ({
      ...b,
      apartmentIds: b.apartmentIds.includes(detailId) ? b.apartmentIds : [...b.apartmentIds, detailId],
      step: stayError(b.checkIn, b.checkOut) ? 1 : 2,
    }));
    navigate('booking');
  };

  /**
   * Takes an unpaid booking through the Paystack popup and verifies the result
   * with the server. Only the server's verdict moves the guest to step 5.
   */
  const payForBooking = async (ref: string) => {
    setPhase('paying');
    const init = await initializePayment(ref);
    const popup = await openPaystack(init.accessCode);
    setPhase('verifying');
    const result = await verifyPayment(init.reference);
    if (result.paid) {
      setReceipt({ reference: init.reference, amount: result.amount, channel: result.channel });
      patchBooking({ step: 5 });
      return;
    }
    setSubmitError(
      popup === 'closed'
        ? 'Payment was not completed. Your dates are held for a short while, so you can try again below.'
        : 'We could not confirm your payment yet. If you were charged, contact us with your booking reference and we will sort it out.',
    );
  };

  /**
   * Final gate before a booking is sent to the server. Every earlier step
   * re-validates here so a stale or hand-edited state cannot slip through,
   * and the server runs the same rules again before it saves anything.
   */
  const confirmBooking = async () => {
    if (phase !== 'idle') return;
    const rooms = booking.apartmentIds.map((id) => findApartment(id));
    const { holds, blocks } = getStore();
    if (stayError(booking.checkIn, booking.checkOut)) {
      patchBooking({ step: 1 });
      return;
    }
    if (
      rooms.length < MIN_ROOMS ||
      rooms.some((a) => !a || !isAvailable(a.id, booking.checkIn, booking.checkOut, holds, blocks)) ||
      !fitsCapacity(rooms as Apartment[], booking.adults, booking.children)
    ) {
      patchBooking({ step: 2 });
      return;
    }
    if (guestError(booking.guest)) {
      patchBooking({ step: 3 });
      return;
    }

    setSubmitError(null);
    const wantsPaystack = booking.payment === 'paystack';
    const key = bookingKey(booking);

    try {
      // Re-confirming the same booking (e.g. after going back to re-read the bank
      // details, or retrying a closed Paystack popup) keeps its reference.
      let ref = bookingRef && confirmedKey === key ? bookingRef : null;
      if (!ref) {
        setPhase('saving');
        const created = await createBooking({
          apartmentIds: booking.apartmentIds,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          adults: Number(booking.adults) || 1,
          children: Number(booking.children) || 0,
          guest: booking.guest,
          payment: booking.payment,
        });
        ref = created.ref;
        setBookingRef(ref);
        setConfirmedKey(key);
        setReceipt(null);
        void refreshStore();
      }

      if (wantsPaystack && !receipt) {
        await payForBooking(ref);
      } else {
        patchBooking({ step: 5 });
      }
    } catch (e) {
      const err = e instanceof BookingError ? e : new BookingError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setSubmitError(err.message);
      // Send the guest back to the step that can fix what the server rejected.
      if (err.field === 'stay') patchBooking({ step: 1 });
      else if (err.field === 'apartment') patchBooking({ step: 2 });
      else if (err.field === 'guest') patchBooking({ step: 3 });
      // A lapsed hold means the booking is gone; the next attempt starts fresh.
      if (err.code === 'hold_expired' || err.code === 'not_found' || err.code === 'not_pending') {
        setBookingRef(null);
        setConfirmedKey(null);
      }
      void refreshStore();
    } finally {
      setPhase('idle');
    }
  };

  const patchAvail = (patch: Partial<AvailabilityState>) => setAvail((a) => ({ ...a, ...patch }));

  const isAdmin = screen === 'admin';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: c.white,
        display: 'flex',
        flexDirection: 'column',
        color: c.navy,
      }}
    >
      <Header
        screen={screen}
        menuOpen={menuOpen}
        onNavigate={navigate}
        onToggleMenu={() => setMenuOpen((o) => !o)}
      />

      <main style={{ flex: 1 }}>
        {screen === 'home' && (
          <Home
            avail={avail}
            onAvailChange={patchAvail}
            onNavigate={navigate}
            onViewApartment={viewApartment}
          />
        )}

        {screen === 'apartments' && (
          <Apartments
            filters={filters}
            onFilterChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
            onResetFilters={() => setFilters(EMPTY_FILTERS)}
            onViewApartment={viewApartment}
            onCheckAvailability={() => navigate('availability')}
          />
        )}

        {screen === 'detail' && (
          <ApartmentDetail
            apartmentId={detailId}
            booking={booking}
            onBookingChange={patchBooking}
            onViewApartment={viewApartment}
            onBackToList={() => navigate('apartments')}
            onReserve={reserveFromDetail}
          />
        )}

        {screen === 'availability' && (
          <Availability
            avail={avail}
            onAvailChange={patchAvail}
            onSelectApartment={selectFromAvailability}
          />
        )}

        {screen === 'booking' && (
          <Booking
            booking={booking}
            bookingRef={bookingRef}
            onBookingChange={patchBooking}
            onGuestChange={patchGuest}
            onConfirm={() => void confirmBooking()}
            phase={phase}
            receipt={receipt}
            submitError={submitError}
            onDismissError={() => setSubmitError(null)}
          />
        )}

        {screen === 'gallery' && <Gallery />}
        {screen === 'about' && <About />}
        {screen === 'contact' && <Contact />}

        {screen === 'admin' && (
          <Admin onExit={() => navigate('home')} onEditApartment={viewApartment} />
        )}
      </main>

      {!isAdmin && <Footer onNavigate={navigate} />}

      {!isAdmin && (
        <div
          data-mobile-only="1"
          style={{
            display: 'none',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: c.white,
            borderTop: '1px solid rgba(31,58,77,0.12)',
            padding: '10px 16px',
            gap: 10,
            zIndex: 60,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <button
            onClick={() => navigate('booking')}
            style={{
              flex: 1,
              background: c.navy,
              color: c.white,
              border: 'none',
              padding: 12,
              borderRadius: 4,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Book Now
          </button>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1,
              textAlign: 'center',
              background: c.sageBg,
              color: c.sageText,
              padding: 12,
              borderRadius: 4,
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
