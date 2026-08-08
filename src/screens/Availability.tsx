import type { AvailabilityState } from '../types';
import { APARTMENTS } from '../data/apartments';
import { bedroomsLabel, fmt } from '../lib/format';
import { priceBreakdown } from '../lib/pricing';
import { amenityChip, c, eyebrow, field, label, pageTitle, serif } from '../theme';
import { ImageSlot } from '../components/ImageSlot';

interface Props {
  avail: AvailabilityState;
  onAvailChange: (patch: Partial<AvailabilityState>) => void;
  onSelectApartment: (id: number) => void;
}

export function Availability({ avail, onAvailChange, onSelectApartment }: Props) {
  const rangeReversed =
    Boolean(avail.checkIn && avail.checkOut) && new Date(avail.checkOut) <= new Date(avail.checkIn);
  const error = rangeReversed ? 'Check-out date must be after check-in date.' : null;
  const validRange = Boolean(avail.checkIn && avail.checkOut) && !error;

  const totalGuests = Number(avail.adults || 1) + Number(avail.children || 0);
  const matches = APARTMENTS.filter((a) => a.maxGuests >= totalGuests);

  const resultsLabel = error
    ? ''
    : validRange
      ? `${matches.length} apartment(s) available for your dates`
      : 'Select your dates to see live availability';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 90px' }}>
      <p style={{ ...eyebrow, margin: '0 0 10px' }}>Check Availability</p>
      <h1 style={{ ...pageTitle, margin: '0 0 32px' }}>When would you like to stay?</h1>

      <div
        style={{
          background: c.cream,
          borderRadius: 8,
          padding: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'flex-end',
          marginBottom: 20,
        }}
      >
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={label} htmlFor="a-checkin">
            Check-in
          </label>
          <input
            id="a-checkin"
            type="date"
            value={avail.checkIn}
            onChange={(e) => onAvailChange({ checkIn: e.target.value })}
            style={field}
          />
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={label} htmlFor="a-checkout">
            Check-out
          </label>
          <input
            id="a-checkout"
            type="date"
            value={avail.checkOut}
            onChange={(e) => onAvailChange({ checkOut: e.target.value })}
            style={field}
          />
        </div>
        <div style={{ flex: 0.7, minWidth: 110 }}>
          <label style={label} htmlFor="a-adults">
            Adults
          </label>
          <select
            id="a-adults"
            value={avail.adults}
            onChange={(e) => onAvailChange({ adults: e.target.value })}
            style={field}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 0.7, minWidth: 110 }}>
          <label style={label} htmlFor="a-children">
            Children
          </label>
          <select
            id="a-children"
            value={avail.children}
            onChange={(e) => onAvailChange({ children: e.target.value })}
            style={field}
          >
            {[0, 1, 2, 3].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p style={{ color: c.danger, fontSize: 13, margin: '0 0 20px' }}>{error}</p>}

      <p style={{ fontSize: 13.5, color: c.bodyMuted, margin: '0 0 24px' }}>{resultsLabel}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {matches.map((apt) => {
          const bd = priceBreakdown(apt, avail.checkIn, avail.checkOut);
          return (
            <div
              key={apt.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                background: c.white,
                border: `1px solid ${c.hairlineSoft}`,
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(31,58,77,0.05)',
              }}
            >
              <div style={{ width: 220, flex: '0 0 220px', minHeight: 160 }}>
                <ImageSlot src={apt.photo} placeholder={`${apt.name} photo`} />
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 240,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: c.gold,
                    textTransform: 'uppercase',
                  }}
                >
                  {apt.type}
                </span>
                <h3 style={{ fontFamily: serif, fontSize: 18, color: c.navy, margin: 0, fontWeight: 600 }}>
                  {apt.name}
                </h3>
                <div style={{ fontSize: 13, color: c.bodyMuted }}>
                  {apt.maxGuests} Guests · {bedroomsLabel(apt.bedrooms)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                  {apt.amenities.slice(0, 3).map((am) => (
                    <span key={am} style={{ ...amenityChip, padding: '3px 8px' }}>
                      {am}
                    </span>
                  ))}
                </div>
              </div>
              <div
                style={{
                  width: 220,
                  flex: '0 0 220px',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  gap: 8,
                  borderLeft: '1px solid rgba(31,58,77,0.06)',
                }}
              >
                <div>
                  <span style={{ fontFamily: serif, fontSize: 19, color: c.navy, fontWeight: 600 }}>
                    {fmt(apt.nightly)}
                  </span>
                  <span style={{ fontSize: 12, color: c.faint }}> / night</span>
                </div>
                {validRange && (
                  <span style={{ fontSize: 12, color: c.body }}>
                    {bd.valid ? fmt(bd.stayOnlyTotal) : '—'} total
                  </span>
                )}
                <button
                  onClick={() => onSelectApartment(apt.id)}
                  style={{
                    background: c.navy,
                    color: c.white,
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Select &amp; Continue
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
