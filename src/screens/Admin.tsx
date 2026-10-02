import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import {
  ADMIN_TABS,
  CALENDAR_LEGEND,
  PAYMENT_LABEL,
  PAYMENT_STATUS_STYLE,
  STATUS_STYLE,
} from '../data/admin';
import type { AdminTab } from '../data/admin';
import { APARTMENTS, findApartment, useApartments, usePricing } from '../data/apartments';
import { daysBetween, fmt } from '../lib/format';
import { DAY_COLORS, upcomingDays } from '../lib/calendar';
import {
  activeBookings,
  dayStatus,
  isAvailable,
  isoDate,
  nightsHeldInRange,
  todayIso,
} from '../lib/occupancy';
import { priceBreakdown } from '../lib/pricing';
import {
  addBlock,
  addBooking,
  removeBlock,
  removeBooking,
  setPricingSettings,
  setRoomRates,
  signIn,
  signOut,
  updateBooking,
  useAuth,
  useStore,
} from '../lib/store';
import { btnGhost, btnPrimary, c, field, label, serif } from '../theme';
import type { Apartment, BookingRecord, BookingStatus, DateBlock, PricingSettings, RateChange, RoomRate } from '../types';

interface Props {
  onExit: () => void;
  onEditApartment: (id: number) => void;
}

const TIMELINE_DAYS = 21;

/* ---------- shared styles ---------- */

const h1: CSSProperties = {
  fontFamily: serif,
  fontSize: 24,
  color: c.navy,
  margin: '0 0 4px',
  fontWeight: 600,
};

const subtitle: CSSProperties = { fontSize: 13, color: c.faint, margin: '0 0 24px' };

const panel: CSSProperties = {
  background: c.white,
  borderRadius: 8,
  boxShadow: '0 2px 10px rgba(31,58,77,0.06)',
};

const tableWrap: CSSProperties = { ...panel, overflow: 'auto' };

const headRow = (cols: string): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: cols,
  gap: 10,
  padding: '12px 18px',
  background: c.cream,
  fontSize: 11.5,
  fontWeight: 700,
  color: c.body,
  textTransform: 'uppercase',
  minWidth: 760,
});

const bodyRow = (cols: string): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: cols,
  gap: 10,
  padding: '14px 18px',
  borderTop: '1px solid rgba(31,58,77,0.06)',
  fontSize: 13.5,
  color: c.navySoft,
  alignItems: 'center',
  minWidth: 760,
});

const pill = (bg: string, color: string): CSSProperties => ({
  background: bg,
  color,
  padding: '4px 10px',
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 600,
  width: 'fit-content',
  whiteSpace: 'nowrap',
});

const smallBtn = (bg: string, color: string): CSSProperties => ({
  background: bg,
  color,
  border: 'none',
  padding: '6px 10px',
  borderRadius: 4,
  fontSize: 11.5,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const sectionH3: CSSProperties = {
  fontSize: 15,
  color: c.navy,
  margin: '0 0 14px',
  fontWeight: 600,
};

const emptyNote: CSSProperties = { padding: 24, fontSize: 13.5, color: c.faint, textAlign: 'center' };

/* ---------- helpers ---------- */

function fmtDate(iso: string): string {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function fmtRange(a: string, b: string): string {
  return `${fmtDate(a)} → ${fmtDate(b)}`;
}

function aptName(id: number): string {
  return findApartment(id)?.name ?? `Apartment ${id}`;
}

function roomNames(ids: number[]): string {
  return ids.length ? ids.map(aptName).join(', ') : '—';
}

function monthBounds(now = new Date()): { start: string; end: string } {
  return {
    start: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
  };
}

function PaymentPill({ status }: { status: BookingRecord['paymentStatus'] }) {
  const st = PAYMENT_STATUS_STYLE[status];
  return (
    <span
      style={{
        display: 'inline-block',
        background: st.bg,
        color: st.color,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 999,
        marginTop: 2,
      }}
    >
      {st.label}
    </span>
  );
}

function StatusPill({ status }: { status: BookingStatus }) {
  const s = STATUS_STYLE[status];
  return <span style={pill(s.bg, s.color)}>{s.label}</span>;
}

function StatCard({ label: text, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ ...panel, padding: 18 }}>
      <p
        style={{
          fontSize: 11.5,
          color: c.faint,
          margin: '0 0 6px',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {text}
      </p>
      <p style={{ fontFamily: serif, fontSize: 24, color: c.navy, margin: 0, fontWeight: 600 }}>
        {value}
      </p>
      {hint && <p style={{ fontSize: 11.5, color: c.faint, margin: '4px 0 0' }}>{hint}</p>}
    </div>
  );
}

/* ---------- sign in ---------- */

function Gate({ onExit }: { onExit: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      // The store picks up the session and the screen re-renders as an admin.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 74px)',
        background: c.cream,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form onSubmit={(e) => void submit(e)} style={{ ...panel, padding: 32, width: '100%', maxWidth: 380 }}>
        <p style={{ ...h1, fontSize: 22 }}>Perch Admin</p>
        <p style={subtitle}>Sign in with your staff account to manage bookings.</p>
        <label style={label} htmlFor="admin-email">
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          value={email}
          autoFocus
          onChange={(e) => setEmail(e.target.value)}
          style={{ ...field, marginBottom: 12 }}
        />
        <label style={label} htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ ...field, marginBottom: 12 }}
        />
        {error && <p style={{ color: c.danger, fontSize: 12.5, margin: '0 0 12px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={busy} style={{ ...btnPrimary, flex: 1, opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <button type="button" onClick={onExit} style={btnGhost}>
            Back
          </button>
        </div>
      </form>
    </div>
  );
}

/** A signed-in account that is not on the staff list. */
function NotStaff({ email, onExit }: { email: string; onExit: () => void }) {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 74px)',
        background: c.cream,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ ...panel, padding: 32, width: '100%', maxWidth: 420 }}>
        <p style={{ ...h1, fontSize: 22 }}>Not on the staff list</p>
        <p style={{ ...subtitle, marginBottom: 20 }}>
          {email} is signed in but has not been granted admin access. Ask the owner to add it.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => void signOut()} style={{ ...btnPrimary, flex: 1 }}>
            Sign out
          </button>
          <button type="button" onClick={onExit} style={btnGhost}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- screen ---------- */

export function Admin({ onExit, onEditApartment }: Props) {
  const { session, isAdmin, checked } = useAuth();
  const { error: loadError } = useStore();
  const [tab, setTab] = useState<AdminTab>('overview');

  if (!checked) {
    return (
      <div style={{ minHeight: 'calc(100vh - 74px)', background: c.cream, display: 'grid', placeItems: 'center' }}>
        <p style={{ color: c.faint, fontSize: 13.5 }}>Checking your session…</p>
      </div>
    );
  }
  if (!session) return <Gate onExit={onExit} />;
  if (!isAdmin) return <NotStaff email={session.user.email ?? 'This account'} onExit={onExit} />;

  const lock = () => void signOut();

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 74px)', background: c.cream }}>
      <aside
        style={{
          width: 220,
          flex: '0 0 220px',
          background: c.navy,
          padding: '28px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <p
          style={{
            color: c.gold,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '0 24px',
            margin: '0 0 18px',
          }}
        >
          Perch Admin
        </p>
        {ADMIN_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <div
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '12px 24px',
                cursor: 'pointer',
                background: active ? 'rgba(184,147,79,0.15)' : 'transparent',
                color: active ? c.white : c.onNavy,
                fontSize: 13.5,
                fontWeight: 600,
                borderLeft: `3px solid ${active ? c.gold : 'transparent'}`,
              }}
            >
              {t.label}
            </div>
          );
        })}
        <div
          style={{
            marginTop: 'auto',
            padding: '20px 24px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <span style={{ color: c.onNavyFaint, fontSize: 11.5, wordBreak: 'break-all' }}>{session.user.email}</span>
          <a onClick={lock} style={{ color: c.onNavy, fontSize: 12.5, cursor: 'pointer' }}>
            Sign out
          </a>
          <a onClick={onExit} style={{ color: c.onNavy, fontSize: 12.5, cursor: 'pointer' }}>
            ← Exit to Website
          </a>
        </div>
      </aside>

      <div style={{ flex: 1, padding: '36px 40px', overflow: 'auto', minWidth: 0 }}>
        {loadError && (
          <p role="alert" style={{ background: '#F1E4E4', color: c.danger, padding: '10px 14px', borderRadius: 6, fontSize: 13, margin: '0 0 20px' }}>
            Could not load bookings: {loadError}
          </p>
        )}
        {tab === 'overview' && <Dashboard onViewBookings={() => setTab('bookings')} />}
        {tab === 'bookings' && <BookingsTab />}
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'guests' && <GuestsTab />}
        {tab === 'apartments' && <ApartmentsTab onEditApartment={onEditApartment} />}
        {tab === 'rates' && <RatesTab />}
      </div>
    </div>
  );
}

/* ---------- dashboard ---------- */

function Dashboard({ onViewBookings }: { onViewBookings: () => void }) {
  const { bookings, holds, blocks } = useStore();
  const today = todayIso();
  const { start: mStart, end: mEnd } = monthBounds();

  const stats = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === 'confirmed');
    const pending = bookings.filter((b) => b.status === 'pending');
    const cancelled = bookings.filter((b) => b.status === 'cancelled');
    const revenue = confirmed.reduce((s, b) => s + b.total, 0);
    const collected = bookings
      .filter((b) => b.paymentStatus === 'paid')
      .reduce((s, b) => s + (b.paidAmount ?? b.amountDue), 0);
    const monthRevenue = confirmed
      .filter((b) => b.checkIn >= mStart && b.checkIn < mEnd)
      .reduce((s, b) => s + b.total, 0);
    const arrivals = activeBookings(bookings).filter((b) => b.checkIn === today);
    const departures = activeBookings(bookings).filter((b) => b.checkOut === today);
    const inHouse = confirmed.filter((b) => b.checkIn <= today && today < b.checkOut);
    const nightsInMonth = daysBetween(mStart, mEnd);
    const held = APARTMENTS.reduce(
      (s, a) => s + nightsHeldInRange(a.id, mStart, mEnd, holds, blocks),
      0,
    );
    const occupancy = nightsInMonth ? Math.round((held / (nightsInMonth * APARTMENTS.length)) * 100) : 0;
    return {
      confirmed,
      pending,
      cancelled,
      collected,
      revenue,
      monthRevenue,
      arrivals,
      departures,
      inHouse,
      occupancy,
    };
  }, [bookings, holds, blocks, today, mStart, mEnd]);

  const upcoming = useMemo(() => {
    const limit = isoDate(new Date(Date.now() + 7 * 86400000));
    return activeBookings(bookings)
      .filter((b) => b.checkIn >= today && b.checkIn <= limit)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }, [bookings, today]);

  const perApartment = useMemo(
    () =>
      APARTMENTS.map((a) => {
        const mine = activeBookings(bookings).filter((b) => b.apartmentIds.includes(a.id));
        return {
          name: a.name,
          count: mine.length,
          // A multi-room booking's total is shared evenly across its rooms.
          revenue: mine
            .filter((b) => b.status === 'confirmed')
            .reduce((s, b) => s + b.total / Math.max(1, b.apartmentIds.length), 0),
        };
      }),
    [bookings],
  );
  const maxCount = Math.max(1, ...perApartment.map((p) => p.count));

  const recent = bookings.slice(0, 5);

  return (
    <>
      <h1 style={h1}>Dashboard</h1>
      <p style={{ ...subtitle, margin: '0 0 28px' }}>
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard label="Total Bookings" value={String(bookings.length)} hint={`${stats.cancelled.length} cancelled`} />
        <StatCard label="Confirmed" value={String(stats.confirmed.length)} />
        <StatCard label="Pending" value={String(stats.pending.length)} hint="awaiting confirmation" />
        <StatCard label="Confirmed Revenue" value={fmt(stats.revenue)} hint="all time, incl. deposits" />
        <StatCard label="Collected Online" value={fmt(stats.collected)} hint="paid through Paystack" />
        <StatCard label="This Month" value={fmt(stats.monthRevenue)} hint="confirmed, by check-in date" />
        <StatCard label="Occupancy This Month" value={`${stats.occupancy}%`} hint="incl. blocked nights" />
        <StatCard label="Arrivals Today" value={String(stats.arrivals.length)} />
        <StatCard label="Departures Today" value={String(stats.departures.length)} />
        <StatCard label="Guests In-House" value={String(stats.inHouse.length)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 24, marginBottom: 32 }}>
        <div>
          <h3 style={sectionH3}>Arrivals in the next 7 days</h3>
          <div style={tableWrap}>
            <div style={{ ...headRow('1.2fr 1fr 1.2fr 0.8fr'), minWidth: 0 }}>
              <span>Guest</span>
              <span>Room</span>
              <span>Dates</span>
              <span>Status</span>
            </div>
            {upcoming.length === 0 && <p style={emptyNote}>No arrivals in the next week.</p>}
            {upcoming.map((b) => (
              <div key={b.ref} style={{ ...bodyRow('1.2fr 1fr 1.2fr 0.8fr'), minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: c.navy }}>{b.guestName || '—'}</span>
                <span>{roomNames(b.apartmentIds)}</span>
                <span>{fmtRange(b.checkIn, b.checkOut)}</span>
                <StatusPill status={b.status} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={sectionH3}>Bookings by room</h3>
          <div style={{ ...panel, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {perApartment.map((p) => (
              <div key={p.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: c.navy }}>{p.name}</span>
                  <span style={{ color: c.faint }}>
                    {p.count} booking{p.count === 1 ? '' : 's'} · {fmt(p.revenue)}
                  </span>
                </div>
                <div style={{ height: 8, background: c.cream, borderRadius: 4 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(p.count / maxCount) * 100}%`,
                      background: c.gold,
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ ...sectionH3, margin: 0 }}>Recent bookings</h3>
        <a onClick={onViewBookings} style={{ fontSize: 12.5, color: c.gold, fontWeight: 600, cursor: 'pointer' }}>
          View all →
        </a>
      </div>
      <div style={tableWrap}>
        <div style={headRow('0.9fr 1.2fr 0.9fr 1.2fr 0.9fr 0.8fr 0.8fr')}>
          <span>Ref</span>
          <span>Guest</span>
          <span>Room</span>
          <span>Dates</span>
          <span>Total</span>
          <span>Source</span>
          <span>Status</span>
        </div>
        {recent.length === 0 && <p style={emptyNote}>No bookings yet.</p>}
        {recent.map((b) => (
          <div key={b.ref} style={bodyRow('0.9fr 1.2fr 0.9fr 1.2fr 0.9fr 0.8fr 0.8fr')}>
            <span style={{ fontWeight: 600, color: c.navy }}>{b.ref}</span>
            <span>{b.guestName || '—'}</span>
            <span>{roomNames(b.apartmentIds)}</span>
            <span>{fmtRange(b.checkIn, b.checkOut)}</span>
            <span>{fmt(b.total)}</span>
            <span style={{ textTransform: 'capitalize' }}>{b.source}</span>
            <StatusPill status={b.status} />
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- bookings ---------- */

type StatusFilter = 'all' | BookingStatus;

const BOOKING_COLS = '0.8fr 1.3fr 0.9fr 1.2fr 0.5fr 0.9fr 0.9fr 0.7fr 0.8fr 1.4fr';

function BookingsTab() {
  const { bookings } = useStore();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings
      .filter((b) => filter === 'all' || b.status === filter)
      .filter(
        (b) =>
          !q ||
          b.ref.toLowerCase().includes(q) ||
          b.guestName.toLowerCase().includes(q) ||
          b.guestPhone.toLowerCase().includes(q) ||
          b.guestEmail.toLowerCase().includes(q),
      )
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  }, [bookings, filter, search]);

  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={h1}>Bookings</h1>
          <p style={subtitle}>Website reservations arrive as Pending. Confirm once payment is verified.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} style={btnPrimary}>
          {showForm ? 'Close form' : '+ Add offline booking'}
        </button>
      </div>

      {showForm && <OfflineBookingForm onDone={() => setShowForm(false)} />}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        {(['all', 'pending', 'confirmed', 'cancelled'] as StatusFilter[]).map((k) => {
          const active = filter === k;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                ...smallBtn(active ? c.navy : c.white, active ? c.white : c.navy),
                border: `1px solid ${active ? c.navy : c.border}`,
                textTransform: 'capitalize',
              }}
            >
              {k} ({counts[k]})
            </button>
          );
        })}
        <input
          placeholder="Search ref, name, phone, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...field, width: 260, marginLeft: 'auto', padding: 8, fontSize: 13 }}
        />
      </div>

      <div style={tableWrap}>
        <div style={{ ...headRow(BOOKING_COLS), minWidth: 1100 }}>
          <span>Ref</span>
          <span>Guest</span>
          <span>Room</span>
          <span>Dates</span>
          <span>Nts</span>
          <span>Total</span>
          <span>Payment</span>
          <span>Source</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {rows.length === 0 && <p style={emptyNote}>No bookings match.</p>}
        {rows.map((b) => (
          <BookingRow key={b.ref} b={b} />
        ))}
      </div>
    </>
  );
}

function BookingRow({ b }: { b: BookingRecord }) {
  const nights = daysBetween(b.checkIn, b.checkOut);
  const report = (e: unknown) => window.alert(e instanceof Error ? e.message : 'That did not save. Please try again.');
  const setStatus = (status: BookingStatus) => updateBooking(b.ref, { status }).catch(report);
  const del = () => {
    if (window.confirm(`Delete booking ${b.ref} permanently? Cancelling is usually enough.`)) {
      removeBooking(b.ref).catch(report);
    }
  };

  return (
    <div style={{ ...bodyRow(BOOKING_COLS), minWidth: 1100 }}>
      <span style={{ fontWeight: 600, color: c.navy }}>{b.ref}</span>
      <span>
        <span style={{ display: 'block', fontWeight: 600, color: c.navy }}>{b.guestName || '—'}</span>
        <span style={{ display: 'block', fontSize: 11.5, color: c.faint }}>
          {[b.guestPhone, b.guestEmail].filter(Boolean).join(' · ')}
        </span>
        {b.note && (
          <span style={{ display: 'block', fontSize: 11.5, color: c.faint, fontStyle: 'italic' }}>{b.note}</span>
        )}
      </span>
      <span>{roomNames(b.apartmentIds)}</span>
      <span>{fmtRange(b.checkIn, b.checkOut)}</span>
      <span>{nights}</span>
      <span>
        {fmt(b.total)}
        {b.deposit > 0 && (
          <span style={{ display: 'block', fontSize: 11.5, color: c.faint }}>incl. {fmt(b.deposit)} deposit</span>
        )}
      </span>
      <span>
        <span style={{ display: 'block' }}>{PAYMENT_LABEL[b.payment] ?? b.payment}</span>
        <PaymentPill status={b.paymentStatus} />
        {b.paymentRef && (
          <span style={{ display: 'block', fontSize: 11, color: c.faint, marginTop: 2 }}>{b.paymentRef}</span>
        )}
      </span>
      <span style={{ textTransform: 'capitalize' }}>{b.source}</span>
      <StatusPill status={b.status} />
      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {b.status !== 'confirmed' && b.paymentStatus !== 'paid' && (
          <button onClick={() => setStatus('confirmed')} style={smallBtn(c.sageBg, c.sageText)}>
            Confirm
          </button>
        )}
        {b.status !== 'cancelled' && (
          <button onClick={() => setStatus('cancelled')} style={smallBtn('#F1E4E4', c.danger)}>
            Cancel
          </button>
        )}
        {b.status === 'cancelled' && (
          <button onClick={() => setStatus('pending')} style={smallBtn(c.cream, c.navy)}>
            Reopen
          </button>
        )}
        <button onClick={del} style={smallBtn('transparent', c.faint)}>
          Delete
        </button>
      </span>
    </div>
  );
}

function OfflineBookingForm({ onDone }: { onDone: () => void }) {
  const { holds, blocks } = useStore();
  const [apartmentIds, setApartmentIds] = useState<number[]>([]);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [adults, setAdults] = useState('2');
  const [payment, setPayment] = useState<BookingRecord['payment']>('transfer');
  const [status, setStatus] = useState<BookingStatus>('confirmed');
  const [totalOverride, setTotalOverride] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const apartments = useApartments();
  const pricing = usePricing();
  const bd = priceBreakdown(apartmentIds.map((id) => findApartment(id, apartments)), checkIn, checkOut, pricing);
  const suggested = bd.valid ? bd.total : 0;
  const usingRateCard = totalOverride === '';
  const total = usingRateCard ? suggested : Number(totalOverride) || 0;
  const taken = apartmentIds.filter((id) => !isAvailable(id, checkIn, checkOut, holds, blocks));
  const free = taken.length === 0;
  const toggleRoom = (id: number) =>
    setApartmentIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut || daysBetween(checkIn, checkOut) <= 0) {
      setError('Enter a valid check-in and check-out.');
      return;
    }
    if (apartmentIds.length === 0) {
      setError('Choose at least one room.');
      return;
    }
    if (!guestName.trim()) {
      setError('Guest name is required.');
      return;
    }
    if (!free) {
      setError('Those dates are already held for one of these rooms. Cancel the clashing booking or remove the block first.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addBooking({
        apartmentIds,
        checkIn,
        checkOut,
        adults: Number(adults) || 1,
        children: 0,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
        payment,
        total,
        deposit: usingRateCard && bd.valid ? bd.deposit : 0,
        amountDue: total,
        status,
        source: 'offline',
        note: note.trim(),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the booking.');
      setSaving(false);
    }
  };

  const col: CSSProperties = { display: 'flex', flexDirection: 'column' };

  return (
    <form onSubmit={(e) => void submit(e)} style={{ ...panel, padding: 22, marginBottom: 24 }}>
      <h3 style={sectionH3}>New offline booking</h3>
      <p style={{ fontSize: 12.5, color: c.faint, margin: '0 0 16px' }}>
        For reservations taken by phone, WhatsApp or walk-in. Saving locks the dates on the website.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14 }}>
        <fieldset style={{ ...col, gridColumn: '1 / -1', border: 'none', padding: 0, margin: 0 }}>
          <legend style={label}>Rooms</legend>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 13.5, color: c.navy }}>
            {APARTMENTS.map((a) => (
              <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={apartmentIds.includes(a.id)} onChange={() => toggleRoom(a.id)} />
                {a.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div style={col}>
          <label style={label} htmlFor="ob-in">Check-in</label>
          <input id="ob-in" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} style={field} />
        </div>
        <div style={col}>
          <label style={label} htmlFor="ob-out">Check-out</label>
          <input id="ob-out" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} style={field} />
        </div>
        <div style={col}>
          <label style={label} htmlFor="ob-name">Guest name</label>
          <input id="ob-name" value={guestName} onChange={(e) => setGuestName(e.target.value)} style={field} />
        </div>
        <div style={col}>
          <label style={label} htmlFor="ob-phone">Phone</label>
          <input id="ob-phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} style={field} />
        </div>
        <div style={col}>
          <label style={label} htmlFor="ob-email">Email (optional)</label>
          <input id="ob-email" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} style={field} />
        </div>
        <div style={col}>
          <label style={label} htmlFor="ob-adults">Guests</label>
          <select id="ob-adults" value={adults} onChange={(e) => setAdults(e.target.value)} style={field}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={String(n)}>{n}</option>
            ))}
          </select>
        </div>
        <div style={col}>
          <label style={label} htmlFor="ob-pay">Payment</label>
          <select id="ob-pay" value={payment} onChange={(e) => setPayment(e.target.value as BookingRecord['payment'])} style={field}>
            {Object.entries(PAYMENT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div style={col}>
          <label style={label} htmlFor="ob-status">Status</label>
          <select id="ob-status" value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)} style={field}>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div style={col}>
          <label style={label} htmlFor="ob-total">Total (₦)</label>
          <input
            id="ob-total"
            type="number"
            min={0}
            placeholder={suggested ? String(suggested) : '0'}
            value={totalOverride}
            onChange={(e) => setTotalOverride(e.target.value)}
            style={field}
          />
          {suggested > 0 && (
            <span style={{ fontSize: 11, color: c.faint, marginTop: 4 }}>
              Rate card: {fmt(suggested)} incl. tax and {fmt(pricing.cautionDeposit)} deposit
            </span>
          )}
        </div>
        <div style={{ ...col, gridColumn: '1 / -1' }}>
          <label style={label} htmlFor="ob-note">Note (optional)</label>
          <input id="ob-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. paid cash on arrival, late check-in" style={field} />
        </div>
      </div>

      {checkIn && checkOut && !free && (
        <p style={{ color: c.danger, fontSize: 12.5, margin: '14px 0 0' }}>
          {roomNames(taken)} {taken.length === 1 ? 'is' : 'are'} already held for part of these dates.
        </p>
      )}
      {error && <p style={{ color: c.danger, fontSize: 12.5, margin: '14px 0 0' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save booking'}
        </button>
        <button type="button" onClick={onDone} style={btnGhost}>Cancel</button>
      </div>
    </form>
  );
}

/* ---------- calendar & blocks ---------- */

function CalendarTab() {
  const { bookings, holds, blocks } = useStore();
  const [start, setStart] = useState(todayIso());
  const days = upcomingDays(TIMELINE_DAYS, new Date(`${start}T00:00:00`));

  const shift = (n: number) => {
    const d = new Date(`${start}T00:00:00`);
    d.setDate(d.getDate() + n);
    setStart(isoDate(d));
  };

  const holderFor = (aptId: number, iso: string): string => {
    const bl = blocks.find((b) => b.apartmentId === aptId && b.start <= iso && iso < b.end);
    if (bl) return `Blocked: ${bl.reason || 'no reason given'}`;
    const bk = activeBookings(bookings).find(
      (b) => b.apartmentIds.includes(aptId) && b.checkIn <= iso && iso < b.checkOut,
    );
    return bk ? `${bk.ref} · ${bk.guestName} (${STATUS_STYLE[bk.status].label})` : 'Available';
  };

  return (
    <>
      <h1 style={h1}>Calendar &amp; Blocked Dates</h1>
      <p style={subtitle}>Each cell is one night. Hover a cell to see who holds it.</p>

      <div style={{ ...panel, padding: 20, marginBottom: 24, overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={() => shift(-7)} style={smallBtn(c.cream, c.navy)}>← Week</button>
          <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} style={{ ...field, width: 160, padding: 6, fontSize: 13 }} />
          <button onClick={() => shift(7)} style={smallBtn(c.cream, c.navy)}>Week →</button>
          <button onClick={() => setStart(todayIso())} style={smallBtn('transparent', c.gold)}>Today</button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `120px repeat(${TIMELINE_DAYS},minmax(34px,1fr))`,
            gap: 2,
            minWidth: 900,
          }}
        >
          <div />
          {days.map((d) => (
            <div
              key={d.iso}
              style={{
                textAlign: 'center',
                fontSize: 10.5,
                color: d.iso === todayIso() ? c.gold : c.faint,
                fontWeight: 600,
                padding: '4px 0',
                lineHeight: 1.2,
              }}
            >
              {d.label.split(' ').map((part) => (
                <span key={part} style={{ display: 'block' }}>{part}</span>
              ))}
            </div>
          ))}
          {APARTMENTS.map((apt) => (
            <TimelineRow
              key={apt.id}
              name={apt.name}
              cells={days.map((d) => ({
                iso: d.iso,
                status: dayStatus(apt.id, d.iso, holds, blocks),
                title: holderFor(apt.id, d.iso),
              }))}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 20, fontSize: 11.5, color: c.body }}>
          {CALENDAR_LEGEND.map((lg) => (
            <span key={lg.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: lg.color, display: 'inline-block' }} />
              {lg.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 24 }}>
        <BlockForm />
        <BlockList blocks={blocks} />
      </div>
    </>
  );
}

function TimelineRow({
  name,
  cells,
}: {
  name: string;
  cells: { iso: string; status: keyof typeof DAY_COLORS; title: string }[];
}) {
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: c.navy, display: 'flex', alignItems: 'center', padding: '6px 0' }}>
        {name}
      </div>
      {cells.map((cell) => (
        <div
          key={cell.iso}
          title={`${fmtDate(cell.iso)} · ${cell.title}`}
          style={{ height: 30, background: DAY_COLORS[cell.status].bg, borderRadius: 3 }}
        />
      ))}
    </>
  );
}

function BlockForm() {
  const { holds, blocks } = useStore();
  const [target, setTarget] = useState<'all' | number>('all');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    if (!start || !end || daysBetween(start, end) <= 0) {
      setError('Enter a start date and an end date after it. The end date is the morning the room is free again.');
      return;
    }
    const ids = target === 'all' ? APARTMENTS.map((a) => a.id) : [target];
    const clashing = ids.filter(
      (id) => !isAvailable(id, start, end, holds, []),
    );
    if (clashing.length) {
      setError(
        `Existing bookings hold ${clashing.map(aptName).join(', ')} during this range. Cancel them first, or block a narrower range.`,
      );
      return;
    }
    const overlapsExisting = ids.some((id) =>
      blocks.some((b) => b.apartmentId === id && b.start < end && start < b.end),
    );
    if (overlapsExisting) {
      setError('That range overlaps an existing block for the same room.');
      return;
    }
    try {
      for (const id of ids) {
        await addBlock({ apartmentId: id, start, end, reason: reason.trim() });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the block.');
      return;
    }
    setStart('');
    setEnd('');
    setReason('');
    setError(null);
    setSaved(true);
  };

  return (
    <form onSubmit={(e) => void submit(e)} style={{ ...panel, padding: 22 }}>
      <h3 style={sectionH3}>Block dates</h3>
      <p style={{ fontSize: 12.5, color: c.faint, margin: '0 0 16px' }}>
        Take a room off sale for maintenance, owner use, or a stay confirmed elsewhere without guest details.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={label} htmlFor="bl-apt">Room</label>
          <select
            id="bl-apt"
            value={target}
            onChange={(e) => setTarget(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={field}
          >
            <option value="all">All changes</option>
          <option value="global">Tax &amp; deposit</option>
            {APARTMENTS.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={label} htmlFor="bl-start">From (first night)</label>
          <input id="bl-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} style={field} />
        </div>
        <div>
          <label style={label} htmlFor="bl-end">Until (free again on)</label>
          <input id="bl-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={field} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={label} htmlFor="bl-reason">Reason (optional)</label>
          <input id="bl-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Plumbing repairs, Airbnb guest" style={field} />
        </div>
      </div>
      {error && <p style={{ color: c.danger, fontSize: 12.5, margin: '14px 0 0' }}>{error}</p>}
      {saved && !error && <p style={{ color: c.sageText, fontSize: 12.5, margin: '14px 0 0' }}>Dates blocked.</p>}
      <button type="submit" style={{ ...btnPrimary, marginTop: 18 }}>Block dates</button>
    </form>
  );
}

function BlockList({ blocks }: { blocks: DateBlock[] }) {
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <div>
      <h3 style={sectionH3}>Active blocks</h3>
      <div style={tableWrap}>
        <div style={{ ...headRow('1fr 1.3fr 1.3fr 0.6fr'), minWidth: 0 }}>
          <span>Room</span>
          <span>Dates</span>
          <span>Reason</span>
          <span />
        </div>
        {sorted.length === 0 && <p style={emptyNote}>No blocked dates.</p>}
        {sorted.map((b) => (
          <div key={b.id} style={{ ...bodyRow('1fr 1.3fr 1.3fr 0.6fr'), minWidth: 0 }}>
            <span style={{ fontWeight: 600, color: c.navy }}>{aptName(b.apartmentId)}</span>
            <span>{fmtRange(b.start, b.end)}</span>
            <span style={{ color: c.faint }}>{b.reason || '—'}</span>
            <button
              onClick={() => removeBlock(b.id).catch((e: unknown) => window.alert(e instanceof Error ? e.message : 'Could not remove the block.'))}
              style={smallBtn('#F1E4E4', c.danger)}
            >
              Unblock
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- guests ---------- */

function GuestsTab() {
  const { bookings } = useStore();
  const guests = useMemo(() => {
    const map = new Map<string, { name: string; contact: string; stays: number; spent: number; last: string }>();
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      const key = (b.guestPhone || b.guestEmail || b.guestName).toLowerCase();
      if (!key) continue;
      const cur = map.get(key) ?? {
        name: b.guestName || '—',
        contact: [b.guestPhone, b.guestEmail].filter(Boolean).join(' · '),
        stays: 0,
        spent: 0,
        last: '',
      };
      cur.stays += 1;
      if (b.status === 'confirmed') cur.spent += b.total;
      if (b.checkIn > cur.last) cur.last = b.checkIn;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [bookings]);

  return (
    <>
      <h1 style={h1}>Guests</h1>
      <p style={subtitle}>Built from booking history. Cancelled bookings are not counted.</p>
      <div style={tableWrap}>
        <div style={headRow('1.2fr 1.6fr 0.6fr 0.9fr 0.9fr')}>
          <span>Guest</span>
          <span>Contact</span>
          <span>Stays</span>
          <span>Confirmed Spend</span>
          <span>Latest Stay</span>
        </div>
        {guests.length === 0 && <p style={emptyNote}>No guests yet.</p>}
        {guests.map((g) => (
          <div key={g.name + g.contact} style={bodyRow('1.2fr 1.6fr 0.6fr 0.9fr 0.9fr')}>
            <span style={{ fontWeight: 600, color: c.navy }}>{g.name}</span>
            <span>{g.contact || '—'}</span>
            <span>{g.stays}</span>
            <span>{fmt(g.spent)}</span>
            <span>{fmtDate(g.last)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- apartments & rates ---------- */

function ApartmentsTab({ onEditApartment }: { onEditApartment: (id: number) => void }) {
  const apartments = useApartments();
  return (
    <>
      <h1 style={h1}>Apartments</h1>
      <p style={subtitle}>Room types, capacity and nightly rates</p>
      <div style={tableWrap}>
        <div style={headRow('1.6fr 1.2fr 0.8fr 1fr 0.8fr 0.8fr')}>
          <span>Apartment</span>
          <span>Type</span>
          <span>Guests</span>
          <span>Nightly Rate</span>
          <span>Status</span>
          <span />
        </div>
        {apartments.map((apt) => (
          <div key={apt.id} style={bodyRow('1.6fr 1.2fr 0.8fr 1fr 0.8fr 0.8fr')}>
            <span style={{ fontWeight: 600, color: c.navy }}>{apt.name}</span>
            <span>{apt.type}</span>
            <span>{apt.maxGuests}</span>
            <span>{fmt(apt.nightly)}</span>
            <span style={pill(c.sageBg, c.sageText)}>Active</span>
            <a onClick={() => onEditApartment(apt.id)} style={{ fontSize: 12.5, color: c.gold, fontWeight: 600, cursor: 'pointer' }}>
              View
            </a>
          </div>
        ))}
      </div>
    </>
  );
}

type ValueKind = 'money' | 'nights' | 'percent';

const RATE_FIELDS = [
  { key: 'nightly', label: 'Nightly', kind: 'money' },
  { key: 'weekend', label: 'Weekend', kind: 'money' },
  { key: 'weekly', label: 'Weekly', kind: 'money' },
  { key: 'monthly', label: 'Monthly', kind: 'money' },
  { key: 'minStay', label: 'Min. stay', kind: 'nights' },
] as const;

type RateKey = (typeof RATE_FIELDS)[number]['key'];

/** Labels for the database's field names in the change log. */
const LOGGED_FIELD: Record<string, { label: string; kind: ValueKind }> = {
  nightly: { label: 'Nightly', kind: 'money' },
  weekend: { label: 'Weekend', kind: 'money' },
  weekly: { label: 'Weekly', kind: 'money' },
  monthly: { label: 'Monthly', kind: 'money' },
  min_stay: { label: 'Min. stay', kind: 'nights' },
  tax_rate: { label: 'Tax', kind: 'percent' },
  caution_deposit: { label: 'Caution deposit', kind: 'money' },
};

function rateOf(apt: Apartment): RoomRate {
  return {
    apartmentId: apt.id,
    nightly: apt.nightly,
    weekend: apt.weekend,
    weekly: apt.weekly,
    monthly: apt.monthly,
    minStay: apt.minStay,
  };
}

function fmtValue(v: number | null, kind: ValueKind): string {
  if (v === null) return '—';
  if (kind === 'money') return fmt(v);
  if (kind === 'percent') return `${Number(v)}%`;
  return `${v} night${v === 1 ? '' : 's'}`;
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const RATE_COLS = '1.2fr repeat(5, 1fr) 0.9fr';

function RatesTab() {
  const apartments = useApartments();
  const { rates, pricing, rateHistory } = useStore();
  const [editing, setEditing] = useState<number | null>(null);
  const live = rates.length > 0 && pricing !== null;

  return (
    <>
      <h1 style={h1}>Rates &amp; Pricing</h1>
      <p style={subtitle}>
        Changes take effect on the website straight away and apply to new bookings only; existing bookings keep the
        price they were booked at. Every change is logged below.
      </p>
      {!live && (
        <p style={{ fontSize: 13, color: c.danger, margin: '0 0 16px' }}>
          Live rates have not loaded, so editing is unavailable. Showing the values from the code.
        </p>
      )}
      <PricingSettingsPanel />
      <h3 style={sectionH3}>Room rates</h3>
      <div style={{ ...tableWrap, marginBottom: 32 }}>
        <div style={{ ...headRow(RATE_COLS), minWidth: 760 }}>
          <span>Apartment</span>
          {RATE_FIELDS.map((f) => (
            <span key={f.key}>{f.label}</span>
          ))}
          <span />
        </div>
        {apartments.map((apt) =>
          editing === apt.id ? (
            <RateEditor key={apt.id} apt={apt} onDone={() => setEditing(null)} />
          ) : (
            <div key={apt.id} style={{ ...bodyRow(RATE_COLS), minWidth: 760 }}>
              <span style={{ fontWeight: 600, color: c.navy }}>{apt.name}</span>
              {RATE_FIELDS.map((f) => (
                <span key={f.key}>{fmtValue(apt[f.key], f.kind)}</span>
              ))}
              <span>
                <button
                  onClick={() => setEditing(apt.id)}
                  disabled={!live || editing !== null}
                  style={{ ...smallBtn(c.cream, c.navy), opacity: !live || editing !== null ? 0.5 : 1 }}
                >
                  Edit
                </button>
              </span>
            </div>
          ),
        )}
      </div>

      <RateHistory history={rateHistory} />
    </>
  );
}

function RateEditor({ apt, onDone }: { apt: Apartment; onDone: () => void }) {
  const original = rateOf(apt);
  const [draft, setDraft] = useState<Record<RateKey, string>>({
    nightly: String(original.nightly),
    weekend: String(original.weekend),
    weekly: String(original.weekly),
    monthly: String(original.monthly),
    minStay: String(original.minStay),
  });
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const next: RoomRate = { ...original };
    for (const f of RATE_FIELDS) {
      const n = Number(draft[f.key]);
      const min = f.key === 'nightly' || f.key === 'weekend' || f.key === 'minStay' ? 1 : 0;
      if (draft[f.key].trim() === '' || !Number.isInteger(n) || n < min) {
        setError(`${f.label} must be a whole number${min ? ' above zero' : ''}.`);
        return;
      }
      next[f.key] = n;
    }
    const changed = RATE_FIELDS.filter((f) => next[f.key] !== original[f.key]);
    if (changed.length === 0) {
      onDone();
      return;
    }
    const summary = changed
      .map((f) => `${f.label}: ${fmtValue(original[f.key], f.kind)} → ${fmtValue(next[f.key], f.kind)}`)
      .join('\n');
    if (!window.confirm(`Change ${apt.name}'s rates? New bookings on the website will use them immediately.\n\n${summary}`)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setRoomRates(next, note);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the rates.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void save(e)} style={{ padding: '14px 16px', background: c.cream, minWidth: 760 }}>
      <div style={{ display: 'grid', gridTemplateColumns: RATE_COLS, gap: 10, alignItems: 'end' }}>
        <span style={{ fontWeight: 600, color: c.navy, fontSize: 13.5, paddingBottom: 9 }}>{apt.name}</span>
        {RATE_FIELDS.map((f) => (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={label} htmlFor={`rate-${apt.id}-${f.key}`}>
              {f.label}
              {f.kind === 'money' ? ' (₦)' : ' (nights)'}
            </label>
            <input
              id={`rate-${apt.id}-${f.key}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={draft[f.key]}
              onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              style={{ ...field, padding: 7, fontSize: 13 }}
            />
          </div>
        ))}
        <span />
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'end', marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column' }}>
          <label style={label} htmlFor={`rate-${apt.id}-note`}>Reason for change (optional, kept in the log)</label>
          <input
            id={`rate-${apt.id}-note`}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. December peak season"
            style={{ ...field, padding: 7, fontSize: 13 }}
          />
        </div>
        <button type="submit" disabled={saving} style={{ ...btnPrimary, padding: '9px 18px', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save rates'}
        </button>
        <button type="button" onClick={onDone} disabled={saving} style={{ ...btnGhost, padding: '9px 18px', fontSize: 13 }}>
          Cancel
        </button>
      </div>
      {error && <p style={{ color: c.danger, fontSize: 12.5, margin: '10px 0 0' }}>{error}</p>}
    </form>
  );
}

function RateHistory({ history }: { history: RateChange[] }) {
  // 'all', 'global' (tax and deposit), or a room id.
  const [room, setRoom] = useState<'all' | 'global' | number>('all');
  const rows =
    room === 'all'
      ? history
      : history.filter((h) => (room === 'global' ? h.apartmentId === null : h.apartmentId === room));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h3 style={{ ...sectionH3, margin: 0 }}>Change history</h3>
        <select
          aria-label="Filter by room"
          value={String(room)}
          onChange={(e) => {
            const v = e.target.value;
            setRoom(v === 'all' || v === 'global' ? v : Number(v));
          }}
          style={{ ...field, width: 180, padding: 6, fontSize: 13 }}
        >
          <option value="all">All changes</option>
          <option value="global">Tax &amp; deposit</option>
          {APARTMENTS.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      <div style={tableWrap}>
        <div style={{ ...headRow('1fr 0.8fr 2fr 1.2fr'), minWidth: 760 }}>
          <span>When</span>
          <span>Applies to</span>
          <span>Change</span>
          <span>By</span>
        </div>
        {rows.length === 0 && <p style={emptyNote}>No rate changes logged.</p>}
        {rows.map((h) => (
          <div key={h.id} style={{ ...bodyRow('1fr 0.8fr 2fr 1.2fr'), minWidth: 760 }}>
            <span>{fmtWhen(h.changedAt)}</span>
            <span style={{ fontWeight: 600, color: c.navy }}>
              {h.apartmentId === null ? 'All bookings' : aptName(h.apartmentId)}
            </span>
            <span>
              {Object.entries(h.changes).map(([k, v]) => {
                const meta = LOGGED_FIELD[k] ?? { label: k, kind: 'money' as const };
                return (
                  <span key={k} style={{ display: 'block' }}>
                    {meta.label}:{' '}
                    {v.from === null ? (
                      <strong>{fmtValue(v.to, meta.kind)}</strong>
                    ) : (
                      <>
                        {fmtValue(v.from, meta.kind)} → <strong>{fmtValue(v.to, meta.kind)}</strong>
                      </>
                    )}
                  </span>
                );
              })}
              {h.note && (
                <span style={{ display: 'block', fontSize: 11.5, color: c.faint, fontStyle: 'italic', marginTop: 2 }}>{h.note}</span>
              )}
            </span>
            <span>{h.changedBy}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/** Tax rate and caution deposit, which apply to every booking. */
function PricingSettingsPanel() {
  const { pricing: live } = useStore();
  const current = usePricing();
  const [editing, setEditing] = useState(false);
  const [tax, setTax] = useState('');
  const [deposit, setDeposit] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setTax(String(current.taxRate));
    setDeposit(String(current.cautionDeposit));
    setNote('');
    setError(null);
    setEditing(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const taxRate = Number(tax);
    const cautionDeposit = Number(deposit);
    if (tax.trim() === '' || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100 || Math.abs(Math.round(taxRate * 100) - taxRate * 100) > 1e-9) {
      setError('Tax must be a percentage between 0 and 100, with at most two decimal places.');
      return;
    }
    if (deposit.trim() === '' || !Number.isInteger(cautionDeposit) || cautionDeposit < 0) {
      setError('The deposit must be a whole number of naira, zero or more.');
      return;
    }
    const next: PricingSettings = { taxRate, cautionDeposit };
    const lines = [
      taxRate !== current.taxRate && `Tax: ${fmtValue(current.taxRate, 'percent')} → ${fmtValue(taxRate, 'percent')}`,
      cautionDeposit !== current.cautionDeposit &&
        `Caution deposit: ${fmt(current.cautionDeposit)} → ${fmt(cautionDeposit)}`,
    ].filter(Boolean);
    if (lines.length === 0) {
      setEditing(false);
      return;
    }
    if (!window.confirm(`Change the charges on every new booking? The website uses them immediately.\n\n${lines.join('\n')}`)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setPricingSettings(next, note);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const col: CSSProperties = { display: 'flex', flexDirection: 'column' };

  return (
    <div style={{ ...panel, padding: 20, marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ ...sectionH3, margin: '0 0 4px' }}>Tax &amp; caution deposit</h3>
          <p style={{ fontSize: 12.5, color: c.faint, margin: 0 }}>
            Added to every booking at payment. Tax is charged on the room subtotal; the deposit is charged once per
            booking and refunded 24–48 hours after checkout if there is no damage.
          </p>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            disabled={!live}
            style={{ ...smallBtn(c.cream, c.navy), opacity: live ? 1 : 0.5 }}
          >
            Edit
          </button>
        )}
      </div>

      {!editing ? (
        <div style={{ display: 'flex', gap: 32, marginTop: 14, fontSize: 13.5, color: c.body, flexWrap: 'wrap' }}>
          <span>
            Tax <strong style={{ color: c.navy }}>{fmtValue(current.taxRate, 'percent')}</strong>
          </span>
          <span>
            Caution deposit <strong style={{ color: c.navy }}>{fmt(current.cautionDeposit)}</strong>
          </span>
          {live?.updatedAt && (
            <span style={{ color: c.faint, fontSize: 12.5 }}>
              Last changed {fmtWhen(live.updatedAt)} by {live.updatedBy}
            </span>
          )}
        </div>
      ) : (
        <form onSubmit={(e) => void save(e)} style={{ marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
            <div style={col}>
              <label style={label} htmlFor="ps-tax">Tax (%)</label>
              <input
                id="ps-tax"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.01}
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                style={{ ...field, padding: 7, fontSize: 13 }}
              />
            </div>
            <div style={col}>
              <label style={label} htmlFor="ps-deposit">Caution deposit (₦)</label>
              <input
                id="ps-deposit"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                style={{ ...field, padding: 7, fontSize: 13 }}
              />
            </div>
            <div style={{ ...col, gridColumn: '1 / -1' }}>
              <label style={label} htmlFor="ps-note">Reason for change (optional, kept in the log)</label>
              <input
                id="ps-note"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. VAT rate change"
                style={{ ...field, padding: 7, fontSize: 13 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, padding: '9px 18px', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} disabled={saving} style={{ ...btnGhost, padding: '9px 18px', fontSize: 13 }}>
              Cancel
            </button>
          </div>
          {error && <p style={{ color: c.danger, fontSize: 12.5, margin: '10px 0 0' }}>{error}</p>}
        </form>
      )}
    </div>
  );
}
