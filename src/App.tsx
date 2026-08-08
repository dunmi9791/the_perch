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

  /** Availability -> booking: carry the dates and jump straight to guest details. */
  const selectFromAvailability = (id: number) => {
    setBooking((b) => ({
      ...b,
      checkIn: avail.checkIn,
      checkOut: avail.checkOut,
      adults: avail.adults,
      children: avail.children,
      apartmentId: id,
      step: 2,
    }));
    navigate('booking');
  };

  /** Detail -> booking: skip the dates step when the guest already picked a range. */
  const reserveFromDetail = () => {
    setBooking((b) => ({
      ...b,
      apartmentId: detailId,
      step: b.checkIn && b.checkOut ? 2 : 1,
    }));
    navigate('booking');
  };

  const confirmBooking = () => {
    setBookingRef((ref) => ref ?? `PRC-${Math.floor(10000 + Math.random() * 89999)}`);
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
