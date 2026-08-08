import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { BookingState, GuestDetails, PaymentMethod } from '../types';
import { APARTMENTS, findApartment } from '../data/apartments';
import { BANK_DETAILS, PAYMENT_OPTIONS } from '../data/content';
import { bedroomsLabel, daysBetween, fmt } from '../lib/format';
import { priceBreakdown } from '../lib/pricing';
import { btnGhost, btnPrimary, c, CONTACT, field, label, serif } from '../theme';
import { ImageSlot } from '../components/ImageSlot';
import { BookingSummary } from '../components/BookingSummary';
import { CheckIcon } from '../components/Icons';

interface Props {
  booking: BookingState;
  bookingRef: string | null;
  onBookingChange: (patch: Partial<BookingState>) => void;
  onGuestChange: (patch: Partial<GuestDetails>) => void;
  onConfirm: () => void;
}

const STEPS = [
  { n: 1, label: 'Dates' },
  { n: 2, label: 'Apartment' },
  { n: 3, label: 'Guest Info' },
  { n: 4, label: 'Payment' },
  { n: 5, label: 'Confirmation' },
] as const;

const panel = {
  background: c.white,
  border: `1px solid ${c.hairline}`,
  borderRadius: 10,
} as const;

const stepHeading = {
  fontFamily: serif,
  fontSize: 22,
  color: c.navy,
  margin: '0 0 24px',
  fontWeight: 600,
} as const;

export function Booking({ booking, bookingRef, onBookingChange, onGuestChange, onConfirm }: Props) {
  const nights = daysBetween(booking.checkIn, booking.checkOut);
  const selectedApt = findApartment(booking.apartmentId);
  const breakdown = priceBreakdown(selectedApt, booking.checkIn, booking.checkOut);

  // A check-in earlier than today is rejected before the dates step will advance.
  const startOfToday = new Date(new Date().toDateString());
  let dateError: string | null = null;
  if (booking.checkIn && new Date(booking.checkIn) < startOfToday) {
    dateError = 'Check-in date cannot be in the past.';
  } else if (booking.checkIn && booking.checkOut && nights <= 0) {
    dateError = 'Check-out date must be after check-in date.';
  }

  const guestComplete = Boolean(booking.guest.name && booking.guest.email && booking.guest.phone);
  const isTransfer = booking.payment === 'transfer';

  // Each step is a fresh page of the flow; land at the top of it.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [booking.step]);

  const goTo = (step: BookingState['step']) => onBookingChange({ step });

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 100px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48, flexWrap: 'wrap' }}>
        {STEPS.map((st, i) => {
          const reached = booking.step >= st.n;
          return (
            <div key={st.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  minWidth: 80,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: reached ? c.navy : '#E8E4DA',
                    color: reached ? c.white : c.faint,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {st.n}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: reached ? c.navy : c.faint,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  {st.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    width: 32,
                    height: 1,
                    background: 'rgba(31,58,77,0.15)',
                    margin: '0 4px 20px',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* STEP 1 — DATES */}
      {booking.step === 1 && (
        <div style={{ ...panel, padding: 36 }}>
          <h2 style={stepHeading}>Select Your Dates</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={label} htmlFor="b-checkin">
                Check-in
              </label>
              <input
                id="b-checkin"
                type="date"
                value={booking.checkIn}
                onChange={(e) => onBookingChange({ checkIn: e.target.value })}
                style={field}
              />
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={label} htmlFor="b-checkout">
                Check-out
              </label>
              <input
                id="b-checkout"
                type="date"
                value={booking.checkOut}
                onChange={(e) => onBookingChange({ checkOut: e.target.value })}
                style={field}
              />
            </div>
            <div style={{ flex: 0.6, minWidth: 100 }}>
              <label style={label} htmlFor="b-adults">
                Adults
              </label>
              <select
                id="b-adults"
                value={booking.adults}
                onChange={(e) => onBookingChange({ adults: e.target.value })}
                style={field}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 0.6, minWidth: 100 }}>
              <label style={label} htmlFor="b-children">
                Children
              </label>
              <select
                id="b-children"
                value={booking.children}
                onChange={(e) => onBookingChange({ children: e.target.value })}
                style={field}
              >
                {[0, 1, 2].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {dateError && <p style={{ color: c.danger, fontSize: 13, margin: '0 0 20px' }}>{dateError}</p>}
          <button
            onClick={() => {
              if (!dateError && booking.checkIn && booking.checkOut) goTo(2);
            }}
            style={btnPrimary}
          >
            Continue
          </button>
        </div>
      )}

      {/* STEP 2 — APARTMENT */}
      {booking.step === 2 && (
        <div>
          <h2 style={stepHeading}>Select Your Apartment</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            {APARTMENTS.map((apt) => {
              const bd = priceBreakdown(apt, booking.checkIn, booking.checkOut);
              const stayTotal = bd.valid ? bd.stayOnlyTotal : apt.nightly * Math.max(nights, 1);
              return (
                <div
                  key={apt.id}
                  onClick={() => onBookingChange({ apartmentId: apt.id })}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    background: c.white,
                    border: `2px solid ${booking.apartmentId === apt.id ? c.gold : c.hairline}`,
                    borderRadius: 10,
                    padding: 16,
                    cursor: 'pointer',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{ width: 120, height: 80, flex: '0 0 120px', borderRadius: 6, overflow: 'hidden' }}
                  >
                    <ImageSlot src={apt.photo} placeholder="Photo" />
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ fontSize: 15, color: c.navy, fontWeight: 600, margin: '0 0 2px' }}>
                      {apt.name}
                    </p>
                    <p style={{ fontSize: 12.5, color: c.faint, margin: 0 }}>
                      {apt.maxGuests} Guests · {bedroomsLabel(apt.bedrooms)} · {nights} nights
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p
                      style={{
                        fontFamily: serif,
                        fontSize: 17,
                        color: c.navy,
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      {fmt(stayTotal)}
                    </p>
                    <p style={{ fontSize: 11, color: c.faint, margin: 0 }}>total, before fees</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => goTo(1)} style={btnGhost}>
              Back
            </button>
            <button
              onClick={() => goTo(3)}
              disabled={!selectedApt}
              style={{ ...btnPrimary, background: selectedApt ? c.navy : c.disabled }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — GUEST INFO */}
      {booking.step === 3 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
          <div style={{ ...panel, flex: 2, minWidth: 300, padding: 32 }}>
            <h2 style={stepHeading}>Guest Information</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                gap: 16,
              }}
            >
              <Field id="g-name" text="Full Name">
                <input
                  id="g-name"
                  type="text"
                  value={booking.guest.name}
                  onChange={(e) => onGuestChange({ name: e.target.value })}
                  style={field}
                />
              </Field>
              <Field id="g-email" text="Email">
                <input
                  id="g-email"
                  type="email"
                  value={booking.guest.email}
                  onChange={(e) => onGuestChange({ email: e.target.value })}
                  style={field}
                />
              </Field>
              <Field id="g-phone" text="Telephone">
                <input
                  id="g-phone"
                  type="tel"
                  value={booking.guest.phone}
                  onChange={(e) => onGuestChange({ phone: e.target.value })}
                  style={field}
                />
              </Field>
              <Field id="g-whatsapp" text="WhatsApp Number">
                <input
                  id="g-whatsapp"
                  type="tel"
                  value={booking.guest.whatsapp}
                  onChange={(e) => onGuestChange({ whatsapp: e.target.value })}
                  style={field}
                />
              </Field>
              <Field id="g-arrival" text="Expected Arrival Time">
                <input
                  id="g-arrival"
                  type="time"
                  value={booking.guest.arrival}
                  onChange={(e) => onGuestChange({ arrival: e.target.value })}
                  style={field}
                />
              </Field>
              <Field id="g-purpose" text="Booking Purpose (optional)">
                <select
                  id="g-purpose"
                  value={booking.guest.purpose}
                  onChange={(e) => onGuestChange({ purpose: e.target.value })}
                  style={field}
                >
                  <option value="">Select...</option>
                  <option value="business">Business</option>
                  <option value="leisure">Leisure</option>
                  <option value="event">Event / Wedding</option>
                  <option value="relocation">Relocation</option>
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={label} htmlFor="g-requests">
                Special Requests
              </label>
              <textarea
                id="g-requests"
                rows={3}
                value={booking.guest.requests}
                onChange={(e) => onGuestChange({ requests: e.target.value })}
                style={{ ...field, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => goTo(2)} style={btnGhost}>
                Back
              </button>
              <button
                onClick={() => goTo(4)}
                disabled={!guestComplete}
                style={{ ...btnPrimary, background: guestComplete ? c.navy : c.disabled }}
              >
                Continue to Payment
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <BookingSummary
              apartment={selectedApt}
              breakdown={breakdown}
              checkIn={booking.checkIn}
              checkOut={booking.checkOut}
            />
          </div>
        </div>
      )}

      {/* STEP 4 — PAYMENT */}
      {booking.step === 4 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
          <div style={{ ...panel, flex: 2, minWidth: 300, padding: 32 }}>
            <h2 style={stepHeading}>Payment Method</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {PAYMENT_OPTIONS.map((po) => {
                const active = booking.payment === po.key;
                return (
                  <div
                    key={po.key}
                    onClick={() => onBookingChange({ payment: po.key as PaymentMethod })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      border: `2px solid ${active ? c.gold : c.hairline}`,
                      borderRadius: 8,
                      padding: 16,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: `2px solid ${active ? c.gold : '#C7CDD1'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: '0 0 auto',
                      }}
                    >
                      <div
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          background: active ? c.gold : 'transparent',
                        }}
                      />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, color: c.navy, fontWeight: 600, margin: 0 }}>{po.label}</p>
                      <p style={{ fontSize: 12.5, color: c.faint, margin: '2px 0 0' }}>{po.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {isTransfer && (
              <div
                style={{
                  background: c.cream,
                  borderRadius: 8,
                  padding: 18,
                  marginBottom: 20,
                  fontSize: 13.5,
                  color: c.navySoft,
                  lineHeight: 1.7,
                }}
              >
                <p style={{ margin: '0 0 4px' }}>
                  <strong>Bank:</strong> {BANK_DETAILS.bank}
                </p>
                <p style={{ margin: '0 0 4px' }}>
                  <strong>Account Name:</strong> {BANK_DETAILS.accountName}
                </p>
                <p style={{ margin: '0 0 4px' }}>
                  <strong>Account Number:</strong> {BANK_DETAILS.accountNumber}
                </p>
                <p style={{ margin: 0 }}>
                  Booking reference will be generated after submission. Upload proof of payment to complete
                  your reservation — it will be marked “Awaiting Verification” until confirmed.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => goTo(3)} style={btnGhost}>
                Back
              </button>
              <button onClick={onConfirm} style={btnPrimary}>
                {isTransfer ? 'Submit & Upload Evidence' : 'Confirm & Pay'}
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <BookingSummary
              apartment={selectedApt}
              breakdown={breakdown}
              checkIn={booking.checkIn}
              checkOut={booking.checkOut}
            />
          </div>
        </div>
      )}

      {/* STEP 5 — CONFIRMATION */}
      {booking.step === 5 && (
        <div style={{ ...panel, textAlign: 'center', padding: '52px 32px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: c.sageBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <CheckIcon size={30} color={c.sageIcon} width={2.5} />
          </div>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 26,
              color: c.navy,
              margin: '0 0 8px',
              fontWeight: 600,
            }}
          >
            {isTransfer ? 'Booking Received — Awaiting Verification' : 'Booking Confirmed!'}
          </h2>
          <p style={{ color: c.body, fontSize: 14, margin: '0 0 28px' }}>
            Booking Reference <strong style={{ color: c.navy }}>{bookingRef ?? 'PRC-00000'}</strong>
          </p>
          <div
            style={{
              maxWidth: 420,
              margin: '0 auto 28px',
              textAlign: 'left',
              background: c.cream,
              borderRadius: 8,
              padding: 20,
              fontSize: 13.5,
              color: c.navySoft,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <ConfirmRow label="Apartment" value={selectedApt?.name ?? '—'} />
            <ConfirmRow label="Check-in" value={booking.checkIn || '—'} />
            <ConfirmRow label="Check-out" value={booking.checkOut || '—'} />
            <ConfirmRow label="Total" value={breakdown.valid ? fmt(breakdown.total) : '—'} />
          </div>
          <p style={{ fontSize: 13, color: c.faint, margin: '0 0 28px' }}>
            A confirmation has been sent to {booking.guest.email || 'your email address'}. Check-in
            instructions will follow once your reservation is confirmed.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.print()} style={{ ...btnPrimary, padding: '12px 24px', fontSize: 13.5 }}>
              Download Confirmation
            </button>
            <a
              href={calendarLink(booking, selectedApt?.name)}
              download={`the-perch-${bookingRef ?? 'booking'}.ics`}
              style={{ ...btnGhost, padding: '12px 24px', fontSize: 13.5, display: 'inline-block' }}
            >
              Add to Calendar
            </a>
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noreferrer"
              style={{
                background: c.sageBg,
                color: c.sageText,
                padding: '12px 24px',
                borderRadius: 4,
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              Send via WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ id, text, children }: { id: string; text: string; children: ReactNode }) {
  return (
    <div>
      <label style={label} htmlFor={id}>
        {text}
      </label>
      {children}
    </div>
  );
}

function ConfirmRow({ label: text, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{text}</span>
      <strong>{value}</strong>
    </div>
  );
}

/** Minimal all-day VEVENT so "Add to Calendar" produces a real .ics download. */
function calendarLink(booking: BookingState, aptName: string | undefined): string {
  const stamp = (d: string) => d.replace(/-/g, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Perch//Booking//EN',
    'BEGIN:VEVENT',
    `SUMMARY:Stay at The Perch — ${aptName ?? 'Apartment'}`,
    `DTSTART;VALUE=DATE:${stamp(booking.checkIn)}`,
    `DTEND;VALUE=DATE:${stamp(booking.checkOut)}`,
    `LOCATION:${CONTACT.address}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
