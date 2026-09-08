import { useEffect, useState } from 'react';
import type {
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
import { priceBreakdown } from './lib/pricing';
import { addBooking, getStore, newBookingRef } from './lib/store';
import { isAvailable } from './lib/occupancy';
import { fitsCapacity, guestError, stayError } from './lib/validation';

/** Identity of a booking as submitted; a change to any of these is a new booking, not a retry. */
function bookingKey(b: BookingState): string {
  return [b.apartmentId, b.checkIn, b.checkOut, b.adults, b.children, b.guest.email.trim().toLowerCase()].join('|');
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
  apartmentId: null,
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

  /** Availability -> booking: carry the dates and skip to the room step only if they are valid. */
  const selectFromAvailability = (id: number) => {
    setBooking((b) => ({
      ...b,
      checkIn: avail.checkIn,
      checkOut: avail.checkOut,
      adults: avail.adults,
      children: avail.children,
      apartmentId: id,
      step: stayError(avail.checkIn, avail.checkOut) ? 1 : 2,
    }));
    navigate('booking');
  };

  /** Detail -> booking: skip the dates step only when the picked range is actually bookable. */
  const reserveFromDetail = () => {
    setBooking((b) => ({
      ...b,
      apartmentId: detailId,
      step: stayError(b.checkIn, b.checkOut) ? 1 : 2,
    }));
    navigate('booking');
  };

  /**
   * Final gate before a booking is recorded. Every earlier step re-validates here
   * so a stale or hand-edited state cannot slip through to confirmation.
   */
  const confirmBooking = () => {
    const apt = findApartment(booking.apartmentId);
    const { bookings, blocks } = getStore();
    if (stayError(booking.checkIn, booking.checkOut)) {
      patchBooking({ step: 1 });
      return;
    }
    if (
      !apt ||
      !fitsCapacity(apt, booking.adults, booking.children) ||
      !isAvailable(apt.id, booking.checkIn, booking.checkOut, bookings, blocks)
    ) {
      patchBooking({ step: 2 });
      return;
    }
    if (guestError(booking.guest)) {
      patchBooking({ step: 3 });
      return;
    }

    // Re-confirming the same booking (e.g. after going back to re-read the bank
    // details) keeps its reference; anything else is a new reservation.
    const key = bookingKey(booking);
    if (bookingRef && confirmedKey === key) {
      patchBooking({ step: 5 });
      return;
    }
    const ref = newBookingRef();
    const bd = priceBreakdown(apt, booking.checkIn, booking.checkOut);
    {
      addBooking({
        ref,
        apartmentId: apt.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        adults: Number(booking.adults) || 1,
        children: Number(booking.children) || 0,
        guestName: booking.guest.name.trim(),
        guestEmail: booking.guest.email.trim(),
        guestPhone: booking.guest.phone.trim(),
        payment: booking.payment,
        total: bd.valid ? bd.total : 0,
        status: 'pending',
        source: 'website',
        note: [booking.guest.purpose, booking.guest.requests].filter(Boolean).join(' · '),
        createdAt: new Date().toISOString(),
      });
    }
    setBookingRef(ref);
    setConfirmedKey(key);
    patchBooking({ step: 5 });
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
            onConfirm={confirmBooking}
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
