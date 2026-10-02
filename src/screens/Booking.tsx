import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Apartment, BookingState, GuestDetails, PaymentMethod } from '../types';
import { findApartment, useApartments, usePricing } from '../data/apartments';
import { BANK_DETAILS, PAYMENT_OPTIONS } from '../data/content';
import { bedroomsLabel, daysBetween, fmt, nightsLabel } from '../lib/format';
import { MIN_ROOMS, priceBreakdown, roomStayTotal } from '../lib/pricing';
import { isAvailable, todayIso } from '../lib/occupancy';
import { fitsCapacity, guestError, roomCapacity, stayError, totalGuests } from '../lib/validation';
import { arrivalPaymentAllowed } from '@shared/booking-input.ts';
import { useStore } from '../lib/store';
import { btnGhost, btnPrimary, c, CONTACT, field, label, serif } from '../theme';
import { ImageSlot } from '../components/ImageSlot';
import { BookingSummary } from '../components/BookingSummary';
import { CheckIcon } from '../components/Icons';

/** Where the confirm button is in its journey; anything but 'idle' disables it. */
export type PaymentPhase = 'idle' | 'saving' | 'paying' | 'verifying';

/** What the server confirmed after a successful Paystack payment. */
export interface PaymentReceipt {
  reference: string;
  /** Naira. */
  amount: number;
  channel: string | null;
}

const PHASE_LABEL: Record<Exclude<PaymentPhase, 'idle'>, string> = {
  saving: 'Saving your booking…',
  paying: 'Complete the payment in the Paystack window…',
  verifying: 'Confirming your payment…',
};

const DEPOSIT_NOTE = (deposit: number) =>
  `The ${fmt(deposit)} caution deposit is refunded 24–48 hours after checkout, provided there is no damage to the property.`;

const CHANNEL_LABEL: Record<string, string> = {
  card: 'Card',
  bank: 'Bank',
  bank_transfer: 'Bank transfer',
  ussd: 'USSD',
  qr: 'QR',
  mobile_money: 'Mobile money',
  apple_pay: 'Apple Pay',
};

interface Props {
  booking: BookingState;
  bookingRef: string | null;
  onBookingChange: (patch: Partial<BookingState>) => void;
  onGuestChange: (patch: Partial<GuestDetails>) => void;
  onConfirm: () => void;
  phase: PaymentPhase;
  receipt: PaymentReceipt | null;
  /** Why the server refused the last attempt, shown on whichever step can fix it. */
  submitError: string | null;
  onDismissError: () => void;
}

const STEPS = [
  { n: 1, label: 'Dates' },
  { n: 2, label: 'Rooms' },
  { n: 3, label: 'Guest Info' },
  { n: 4, label: 'Payment' },
  { n: 5, label: 'Confirmation' },
] as const;

const panel = {
  background: c.white,
  border: `1px solid ${c.hairline}`,
  borderRadius: 10,
} as const;

const infoBox = {
  background: c.cream,
  borderRadius: 8,
  padding: 18,
  marginBottom: 20,
  fontSize: 13.5,
  color: c.navySoft,
  lineHeight: 1.7,
} as const;

const stepHeading = {
  fontFamily: serif,
  fontSize: 22,
  color: c.navy,
  margin: '0 0 24px',
  fontWeight: 600,
} as const;

export function Booking({
  booking,
  bookingRef,
  onBookingChange,
  onGuestChange,
  onConfirm,
  phase,
  receipt,
  submitError,
  onDismissError,
}: Props) {
  const submitting = phase !== 'idle';
  const nights = daysBetween(booking.checkIn, booking.checkOut);
  const apartments = useApartments();
  const pricing = usePricing();
  const selectedApts = booking.apartmentIds.map((id) => findApartment(id, apartments)).filter((a): a is Apartment => Boolean(a));
  const breakdown = priceBreakdown(selectedApts, booking.checkIn, booking.checkOut, pricing);

  // The shared validator is the same one App.tsx runs before recording the booking.
  const stayProblem = stayError(booking.checkIn, booking.checkOut);
  // Only surface the "pick both dates" hint once the guest has started choosing.
  const dateError = booking.checkIn || booking.checkOut ? stayProblem : null;

  const guestProblem = guestError(booking.guest);
  const guestComplete = guestProblem === null;
  const guestStarted = Boolean(booking.guest.name || booking.guest.email || booking.guest.phone);

  const { holds, blocks } = useStore();
  const partySize = totalGuests(booking.adults, booking.children);
  const aptFree = (id: number) => isAvailable(id, booking.checkIn, booking.checkOut, holds, blocks);
  const allFree = selectedApts.every((a) => aptFree(a.id));
  const capacity = roomCapacity(selectedApts);
  const enoughRooms = selectedApts.length >= MIN_ROOMS;
  const fits = fitsCapacity(selectedApts, booking.adults, booking.children);
  const selectionValid = enoughRooms && allFree && fits;
  /** What still stops the guest leaving the room step, or null when nothing does. */
  const selectionProblem = !allFree
    ? 'One of your rooms is no longer available for these dates. Remove it and pick another.'
    : !enoughRooms
      ? `Bookings are for a minimum of ${MIN_ROOMS} rooms. Choose ${MIN_ROOMS - selectedApts.length} more.`
      : !fits
        ? `These rooms sleep up to ${capacity} guests — add another room for your party of ${partySize}.`
        : null;
  const toggleRoom = (id: number) =>
    onBookingChange({
      apartmentIds: booking.apartmentIds.includes(id)
        ? booking.apartmentIds.filter((x) => x !== id)
        : [...booking.apartmentIds, id],
    });
  const roomNames = selectedApts.map((a) => a.name).join(', ');
  const isTransfer = booking.payment === 'transfer';
  const isPaystack = booking.payment === 'paystack';
  const arrivalAllowed = arrivalPaymentAllowed(booking.checkIn, todayIso());
  const dueNow = breakdown.valid ? breakdown.dueOnline : 0;

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

      {submitError && booking.step < 5 && (
        <div
          role="alert"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            background: '#F1E4E4',
            color: c.danger,
            border: '1px solid rgba(184,79,79,0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 13.5,
          }}
        >
          <span>{submitError}</span>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', color: c.danger, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

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
              if (!stayProblem) goTo(2);
            }}
            disabled={Boolean(stayProblem)}
            style={{ ...btnPrimary, background: stayProblem ? c.disabled : c.navy }}
          >
            Continue
          </button>
        </div>
      )}

      {/* STEP 2 — ROOMS */}
      {booking.step === 2 && (
        <div>
          <h2 style={stepHeading}>Select Your Rooms</h2>
          <p style={{ fontSize: 13, color: c.faint, margin: '-12px 0 20px' }}>
            {partySize} guest{partySize === 1 ? '' : 's'} · {nightsLabel(nights)}. Bookings are for a minimum of{' '}
            {MIN_ROOMS} rooms. Rooms that are taken for your dates are greyed out.
          </p>
          <div
            role="group"
            aria-label="Rooms"
            style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}
          >
            {apartments.map((apt) => {
              const stayTotal = nights > 0 ? roomStayTotal(apt, booking.checkIn, booking.checkOut) : apt.nightly;
              const free = aptFree(apt.id);
              const selected = booking.apartmentIds.includes(apt.id);
              // A room taken since it was picked stays clickable so the guest can remove it.
              const selectable = free || selected;
              return (
                <button
                  key={apt.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  disabled={!selectable}
                  onClick={() => toggleRoom(apt.id)}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    width: '100%',
                    textAlign: 'left',
                    font: 'inherit',
                    color: 'inherit',
                    background: c.white,
                    border: `2px solid ${selected ? c.gold : c.hairline}`,
                    borderRadius: 10,
                    padding: 16,
                    cursor: selectable ? 'pointer' : 'not-allowed',
                    opacity: free ? 1 : 0.5,
                    alignItems: 'center',
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: 20,
                      height: 20,
                      flex: '0 0 20px',
                      borderRadius: 4,
                      border: `2px solid ${selected ? c.gold : '#C7CDD1'}`,
                      background: selected ? c.gold : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected && <CheckIcon size={12} color={c.white} width={3} />}
                  </div>
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
                      Sleeps {apt.maxGuests} · {bedroomsLabel(apt.bedrooms)} · {nightsLabel(nights)}
                    </p>
                    {!free && (
                      <p style={{ fontSize: 12, color: c.danger, fontWeight: 600, margin: '4px 0 0' }}>
                        Not available for these dates
                      </p>
                    )}
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
                    <p style={{ fontSize: 11, color: c.faint, margin: 0 }}>
                      {nights > 0 ? 'for your stay, before tax' : 'per night'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 13.5, color: c.navy, margin: '0 0 6px' }}>
            {selectedApts.length === 0
              ? 'No rooms selected yet.'
              : `${selectedApts.length} room${selectedApts.length === 1 ? '' : 's'} selected: ${roomNames} · sleeps ${capacity}`}
          </p>
          {selectionProblem && selectedApts.length > 0 && (
            <p style={{ fontSize: 13, color: c.danger, margin: '0 0 20px' }}>{selectionProblem}</p>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
            <button onClick={() => goTo(1)} style={btnGhost}>
              Back
            </button>
            <button
              onClick={() => goTo(3)}
              disabled={!selectionValid}
              style={{ ...btnPrimary, background: selectionValid ? c.navy : c.disabled }}
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
            {guestStarted && guestProblem && (
              <p style={{ color: c.danger, fontSize: 13, margin: '16px 0 0' }}>{guestProblem}</p>
            )}
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
              apartments={selectedApts}
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
                const disabled = po.key === 'arrival' && !arrivalAllowed;
                return (
                  <div
                    key={po.key}
                    onClick={() => !disabled && onBookingChange({ payment: po.key as PaymentMethod })}
                    aria-disabled={disabled}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      border: `2px solid ${active ? c.gold : c.hairline}`,
                      borderRadius: 8,
                      padding: 16,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1,
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

            {isPaystack && breakdown.valid && (
              <div style={infoBox}>
                <p style={{ margin: '0 0 4px' }}>
                  You will pay <strong>{fmt(dueNow)}</strong> now through Paystack — by card, bank transfer or USSD —
                  and your booking is confirmed the moment it goes through.
                </p>
                <p style={{ margin: 0 }}>{DEPOSIT_NOTE(breakdown.deposit)}</p>
              </div>
            )}

            {isTransfer && (
              <div style={infoBox}>
                <p style={{ margin: '0 0 4px' }}>
                  <strong>Bank:</strong> {BANK_DETAILS.bank}
                </p>
                <p style={{ margin: '0 0 4px' }}>
                  <strong>Account Name:</strong> {BANK_DETAILS.accountName}
                </p>
                <p style={{ margin: '0 0 4px' }}>
                  <strong>Account Number:</strong> {BANK_DETAILS.accountNumber}
                </p>
                <p style={{ margin: '0 0 4px' }}>
                  <strong>Amount:</strong> {breakdown.valid ? fmt(dueNow) : '—'}
                  {breakdown.valid && ` (includes the ${fmt(breakdown.deposit)} refundable caution deposit)`}
                </p>
                <p style={{ margin: 0 }}>
                  Use your booking reference as the transfer narration. Your reservation shows as “Awaiting
                  Verification” until we confirm the payment.
                </p>
              </div>
            )}

            {booking.payment === 'arrival' && !arrivalAllowed && (
              <div style={{ ...infoBox, color: c.danger }}>
                Pay on Arrival is only available for stays booked at least 48 hours ahead. Please choose another
                method.
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => goTo(3)} disabled={submitting} style={btnGhost}>
                Back
              </button>
              <button
                onClick={onConfirm}
                disabled={submitting}
                style={{ ...btnPrimary, opacity: submitting ? 0.7 : 1, cursor: submitting ? 'wait' : 'pointer' }}
              >
                {phase !== 'idle'
                  ? PHASE_LABEL[phase]
                  : isPaystack
                    ? `Pay ${fmt(dueNow)} with Paystack`
                    : isTransfer
                      ? 'Submit Booking'
                      : 'Confirm Booking'}
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <BookingSummary
              apartments={selectedApts}
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
            {receipt
              ? 'Payment Received — Booking Confirmed!'
              : isTransfer
                ? 'Booking Received — Awaiting Verification'
                : booking.payment === 'arrival'
                  ? 'Booking Received'
                  : 'Booking Confirmed!'}
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
            <ConfirmRow label={selectedApts.length === 1 ? 'Room' : 'Rooms'} value={roomNames || '—'} />
            <ConfirmRow label="Check-in" value={booking.checkIn || '—'} />
            <ConfirmRow label="Check-out" value={booking.checkOut || '—'} />
            {receipt ? (
              <>
                <ConfirmRow label="Paid now" value={fmt(receipt.amount)} />
                <ConfirmRow
                  label="Paystack reference"
                  value={`${receipt.reference}${receipt.channel ? ` · ${CHANNEL_LABEL[receipt.channel] ?? receipt.channel}` : ''}`}
                />
              </>
            ) : (
              <ConfirmRow label="Amount due" value={breakdown.valid ? fmt(breakdown.dueOnline) : '—'} />
            )}
            <ConfirmRow label="Caution deposit (refundable)" value={breakdown.valid ? fmt(breakdown.deposit) : '—'} />
          </div>
          {breakdown.valid && (
            <p style={{ fontSize: 12.5, color: c.faint, maxWidth: 420, margin: '-16px auto 24px' }}>
              {DEPOSIT_NOTE(breakdown.deposit)}
            </p>
          )}
          <p style={{ fontSize: 13, color: c.faint, margin: '0 0 28px' }}>
            {receipt
              ? `Paystack has emailed a receipt to ${booking.guest.email || 'your email address'}. Check-in instructions will follow before your arrival.`
              : `A confirmation has been sent to ${booking.guest.email || 'your email address'}. Check-in instructions will follow once your reservation is confirmed.`}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.print()} style={{ ...btnPrimary, padding: '12px 24px', fontSize: 13.5 }}>
              Download Confirmation
            </button>
            <a
              href={calendarLink(booking, roomNames)}
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
function calendarLink(booking: BookingState, aptNames: string): string {
  const stamp = (d: string) => d.replace(/-/g, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Perch//Booking//EN',
    'BEGIN:VEVENT',
    `SUMMARY:Stay at The Perch — ${aptNames || 'Rooms'}`,
    `DTSTART;VALUE=DATE:${stamp(booking.checkIn)}`,
    `DTEND;VALUE=DATE:${stamp(booking.checkOut)}`,
    `LOCATION:${CONTACT.address}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
