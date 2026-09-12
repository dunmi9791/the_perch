import type { BookingState } from '../types';
import { APARTMENTS, findApartment } from '../data/apartments';
import { bedroomsLabel, fmt, nightsLabel } from '../lib/format';
import { priceBreakdown } from '../lib/pricing';
import { monthCells, monthLabel, WEEKDAYS } from '../lib/calendar';
import { dayStatus, isAvailable } from '../lib/occupancy';
import { useStore } from '../lib/store';
import { c, CONTACT, field, label, serif } from '../theme';
import { ImageSlot } from '../components/ImageSlot';
import { CheckIcon } from '../components/Icons';

interface Props {
  apartmentId: number;
  booking: BookingState;
  onBookingChange: (patch: Partial<BookingState>) => void;
  onViewApartment: (id: number) => void;
  onBackToList: () => void;
  onReserve: () => void;
}

const LEGEND = [
  { label: 'Available', color: c.sageBg },
  { label: 'Reserved (awaiting confirmation)', color: c.gold },
  { label: 'Confirmed', color: c.navy },
  { label: 'Blocked / Maintenance', color: '#D8D3C6' },
];

export function ApartmentDetail({
  apartmentId,
  booking,
  onBookingChange,
  onViewApartment,
  onBackToList,
  onReserve,
}: Props) {
  const apt = findApartment(apartmentId) ?? APARTMENTS[0];
  const breakdown = priceBreakdown(apt, booking.checkIn, booking.checkOut);
  const related = APARTMENTS.filter((a) => a.id !== apt.id).slice(0, 3);
  const { holds, blocks } = useStore();
  const cells = monthCells((iso) => dayStatus(apt.id, iso, holds, blocks));
  const datesFree = isAvailable(apt.id, booking.checkIn, booking.checkOut, holds, blocks);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 90px' }}>
      <div style={{ fontSize: 13, color: c.faint, marginBottom: 20 }}>
        <a onClick={onBackToList} style={{ cursor: 'pointer', color: c.faint }}>
          Apartments
        </a>{' '}
        / <span style={{ color: c.navy }}>{apt.name}</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 8,
          marginBottom: 36,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div style={{ gridRow: 'span 2', minHeight: 420 }}>
          <ImageSlot src={apt.photo} placeholder={`${apt.name} photo`} />
        </div>
        <div style={{ minHeight: 206 }}>
          <ImageSlot src={apt.bedroomPhoto} placeholder="Bedroom" />
        </div>
        <div style={{ minHeight: 206 }}>
          <ImageSlot src={apt.bathroomPhoto} placeholder="Bathroom" />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
        <div style={{ flex: 2, minWidth: 320 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: c.gold,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {apt.type}
          </span>
          <h1
            style={{
              fontFamily: serif,
              fontSize: 'clamp(28px,3.4vw,36px)',
              color: c.navy,
              margin: '6px 0 14px',
              fontWeight: 600,
            }}
          >
            {apt.name}
          </h1>
          <div
            style={{
              display: 'flex',
              gap: 20,
              fontSize: 14,
              color: c.body,
              marginBottom: 20,
              flexWrap: 'wrap',
            }}
          >
            <span>{apt.maxGuests} Guests</span>
            <span>·</span>
            <span>{bedroomsLabel(apt.bedrooms)}</span>
            <span>·</span>
            <span>{apt.bathrooms}</span>
            <span>·</span>
            <span>{apt.beds}</span>
            <span>·</span>
            <span>{apt.size}</span>
          </div>
          <p style={{ color: c.body, fontSize: 15, lineHeight: 1.8, margin: '0 0 32px' }}>
            {apt.longDesc}
          </p>

          <h3 style={{ fontSize: 16, color: c.navy, margin: '0 0 16px', fontWeight: 600 }}>Amenities</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
              gap: 12,
              marginBottom: 36,
            }}
          >
            {apt.amenities.map((am) => (
              <div
                key={am}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13.5,
                  color: c.navySoft,
                }}
              >
                <CheckIcon />
                {am}
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 16, color: c.navy, margin: '0 0 16px', fontWeight: 600 }}>
            House Rules &amp; Policies
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
              gap: 16,
              marginBottom: 36,
              background: c.cream,
              padding: 20,
              borderRadius: 8,
            }}
          >
            <Policy title="Check-in" value={apt.checkinTime} />
            <Policy title="Check-out" value={apt.checkoutTime} />
            <Policy title="Minimum Stay" value={nightsLabel(apt.minStay)} />
            <Policy title="Cancellation" value="Free up to 48h before check-in" />
          </div>

          <h3 style={{ fontSize: 16, color: c.navy, margin: '0 0 16px', fontWeight: 600 }}>
            Availability Calendar
          </h3>
          <div
            style={{
              background: c.white,
              border: `1px solid ${c.hairline}`,
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <p style={{ fontSize: 13, color: c.faint, margin: '0 0 14px' }}>{monthLabel()}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: c.faint,
                    fontWeight: 600,
                    padding: '4px 0',
                  }}
                >
                  {wd}
                </div>
              ))}
              {cells.map((cell) => (
                <div
                  key={cell.key}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    borderRadius: 4,
                    background: cell.bg,
                    color: cell.color,
                  }}
                >
                  {cell.day ?? ''}
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                marginTop: 16,
                fontSize: 11.5,
                color: c.body,
              }}
            >
              {LEGEND.map((l) => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: l.color,
                      display: 'inline-block',
                    }}
                  />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          <div
            style={{
              position: 'sticky',
              top: 100,
              background: c.white,
              border: `1px solid ${c.hairline}`,
              borderRadius: 10,
              padding: 26,
              boxShadow: '0 6px 24px rgba(31,58,77,0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <div>
                <span style={{ fontFamily: serif, fontSize: 24, color: c.navy, fontWeight: 600 }}>
                  {fmt(apt.nightly)}
                </span>
                <span style={{ fontSize: 13, color: c.faint }}> / night</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={label} htmlFor="d-checkin">
                  Check-in
                </label>
                <input
                  id="d-checkin"
                  type="date"
                  value={booking.checkIn}
                  onChange={(e) => onBookingChange({ checkIn: e.target.value })}
                  style={{ ...field, padding: 9, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={label} htmlFor="d-checkout">
                  Check-out
                </label>
                <input
                  id="d-checkout"
                  type="date"
                  value={booking.checkOut}
                  onChange={(e) => onBookingChange({ checkOut: e.target.value })}
                  style={{ ...field, padding: 9, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={label} htmlFor="d-guests">
                  Guests
                </label>
                <select
                  id="d-guests"
                  value={booking.adults}
                  onChange={(e) => onBookingChange({ adults: e.target.value })}
                  style={{ ...field, padding: 9, fontSize: 13 }}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {breakdown.valid && (
              <div
                style={{
                  borderTop: `1px solid ${c.hairline}`,
                  paddingTop: 14,
                  marginBottom: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 13.5,
                }}
              >
                <LineItem
                  label={`${breakdown.standardNights} standard night(s)`}
                  value={fmt(breakdown.standardTotal)}
                />
                {breakdown.hasWeekend && (
                  <LineItem
                    label={`${breakdown.weekendNights} weekend night(s)`}
                    value={fmt(breakdown.weekendTotal)}
                  />
                )}
                <LineItem label="Cleaning fee" value={fmt(breakdown.cleaning)} />
                <LineItem label="Security deposit (refundable)" value={fmt(breakdown.deposit)} />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    color: c.navy,
                    borderTop: `1px solid ${c.hairline}`,
                    paddingTop: 8,
                    marginTop: 4,
                  }}
                >
                  <span>Total</span>
                  <span>{fmt(breakdown.total)}</span>
                </div>
              </div>
            )}
            {!breakdown.valid && breakdown.tooShort && (
              <p style={{ fontSize: 12.5, color: c.danger, margin: '0 0 14px' }}>
                Minimum stay is {nightsLabel(apt.minStay)}.
              </p>
            )}

            {!datesFree && (
              <p style={{ fontSize: 12.5, color: c.danger, margin: '0 0 14px' }}>
                {apt.name} is not available for these dates. Try another room or date range.
              </p>
            )}

            <button
              onClick={onReserve}
              disabled={!datesFree}
              style={{
                width: '100%',
                background: datesFree ? c.navy : c.disabled,
                color: c.white,
                border: 'none',
                padding: 13,
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                cursor: datesFree ? 'pointer' : 'not-allowed',
                marginBottom: 10,
              }}
            >
              Reserve Now
            </button>
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                width: '100%',
                background: c.sageBg,
                color: c.sageText,
                padding: 12,
                borderRadius: 4,
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              Enquire on WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 60 }}>
        <h3
          style={{
            fontSize: 18,
            color: c.navy,
            margin: '0 0 20px',
            fontWeight: 600,
            fontFamily: serif,
          }}
        >
          Related Apartments
        </h3>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {related.map((r) => (
            <div
              key={r.id}
              onClick={() => onViewApartment(r.id)}
              style={{ width: 260, cursor: 'pointer' }}
            >
              <div style={{ height: 150, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                <ImageSlot src={r.photo} placeholder={`${r.name} photo`} />
              </div>
              <p style={{ fontSize: 14, color: c.navy, fontWeight: 600, margin: '0 0 2px' }}>{r.name}</p>
              <p style={{ fontSize: 12.5, color: c.faint, margin: 0 }}>{fmt(r.nightly)} / night</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Policy({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p
        style={{
          fontSize: 11,
          color: c.faint,
          textTransform: 'uppercase',
          margin: '0 0 4px',
          fontWeight: 600,
        }}
      >
        {title}
      </p>
      <p style={{ fontSize: 14, color: c.navy, margin: 0 }}>{value}</p>
    </div>
  );
}

function LineItem({ label: text, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: c.body }}>
      <span>{text}</span>
      <span>{value}</span>
    </div>
  );
}
