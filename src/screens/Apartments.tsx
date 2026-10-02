import type { FilterState } from '../types';
import { useApartments } from '../data/apartments';
import { bedroomsLabel, fmt } from '../lib/format';
import { amenityChip, c, eyebrow, field, label, pageTitle, serif } from '../theme';
import { ImageSlot } from '../components/ImageSlot';

interface Props {
  filters: FilterState;
  onFilterChange: (patch: Partial<FilterState>) => void;
  onResetFilters: () => void;
  onViewApartment: (id: number) => void;
  onCheckAvailability: () => void;
}

const EMPTY_FILTERS: FilterState = {
  checkIn: '',
  checkOut: '',
  guests: '0',
  bedrooms: '-1',
  maxPrice: '0',
};

export { EMPTY_FILTERS };

export function Apartments({
  filters,
  onFilterChange,
  onResetFilters,
  onViewApartment,
  onCheckAvailability,
}: Props) {
  const apartments = useApartments();
  const matches = apartments.filter((a) => {
    if (Number(filters.guests) > 0 && a.maxGuests < Number(filters.guests)) return false;
    if (Number(filters.bedrooms) >= 0 && a.bedrooms !== Number(filters.bedrooms)) return false;
    if (Number(filters.maxPrice) > 0 && a.nightly > Number(filters.maxPrice)) return false;
    return true;
  });

  // Without a date range there is nothing to check against, so the badge asks for one.
  const hasRange = Boolean(filters.checkIn && filters.checkOut);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px 90px' }}>
      <p style={{ ...eyebrow, margin: '0 0 10px' }}>All Apartments</p>
      <h1 style={{ ...pageTitle, margin: '0 0 32px' }}>Choose your apartment</h1>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          background: c.cream,
          padding: 20,
          borderRadius: 8,
          marginBottom: 40,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ minWidth: 140 }}>
          <label style={label} htmlFor="f-checkin">
            Check-in
          </label>
          <input
            id="f-checkin"
            type="date"
            value={filters.checkIn}
            onChange={(e) => onFilterChange({ checkIn: e.target.value })}
            style={{ ...field, padding: 9, fontSize: 13 }}
          />
        </div>
        <div style={{ minWidth: 140 }}>
          <label style={label} htmlFor="f-checkout">
            Check-out
          </label>
          <input
            id="f-checkout"
            type="date"
            value={filters.checkOut}
            onChange={(e) => onFilterChange({ checkOut: e.target.value })}
            style={{ ...field, padding: 9, fontSize: 13 }}
          />
        </div>
        <div style={{ minWidth: 110 }}>
          <label style={label} htmlFor="f-guests">
            Guests
          </label>
          <select
            id="f-guests"
            value={filters.guests}
            onChange={(e) => onFilterChange({ guests: e.target.value })}
            style={{ ...field, padding: 9, fontSize: 13 }}
          >
            <option value="0">Any</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 130 }}>
          <label style={label} htmlFor="f-bedrooms">
            Bedrooms
          </label>
          <select
            id="f-bedrooms"
            value={filters.bedrooms}
            onChange={(e) => onFilterChange({ bedrooms: e.target.value })}
            style={{ ...field, padding: 9, fontSize: 13 }}
          >
            <option value="-1">Any</option>
            <option value="0">Studio</option>
            <option value="1">1 Bedroom</option>
            <option value="2">2 Bedrooms</option>
            <option value="3">3 Bedrooms</option>
          </select>
        </div>
        <div style={{ minWidth: 150 }}>
          <label style={label} htmlFor="f-price">
            Max Price / Night
          </label>
          <select
            id="f-price"
            value={filters.maxPrice}
            onChange={(e) => onFilterChange({ maxPrice: e.target.value })}
            style={{ ...field, padding: 9, fontSize: 13 }}
          >
            <option value="0">Any</option>
            {[60000, 100000, 150000, 250000].map((p) => (
              <option key={p} value={String(p)}>
                Up to {fmt(p)}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onResetFilters}
          style={{
            background: c.white,
            border: `1px solid ${c.navy}`,
            color: c.navy,
            padding: '9px 16px',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>

      <p style={{ fontSize: 13.5, color: c.bodyMuted, margin: '0 0 24px' }}>
        {matches.length} of {apartments.length} apartments match your filters
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {matches.map((apt) => (
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
            <div style={{ width: 320, flex: '0 0 320px', minHeight: 220, position: 'relative' }}>
              <ImageSlot src={apt.photo} placeholder={`${apt.name} photo`} />
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  background: hasRange ? c.sageBg : c.cream,
                  padding: '5px 10px',
                  borderRadius: 3,
                  fontSize: 11,
                  fontWeight: 600,
                  color: hasRange ? c.sageText : c.faint,
                }}
              >
                {hasRange ? 'Available' : 'Check Dates'}
              </div>
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 280,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: c.gold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {apt.type}
                  </span>
                  <h3
                    style={{
                      fontFamily: serif,
                      fontSize: 20,
                      color: c.navy,
                      margin: '4px 0 0',
                      fontWeight: 600,
                    }}
                  >
                    {apt.name}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>
                    <span style={{ fontFamily: serif, fontSize: 22, color: c.navy, fontWeight: 600 }}>
                      {fmt(apt.nightly)}
                    </span>
                    <span style={{ fontSize: 12, color: c.faint }}> / night</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: c.bodyMuted }}>
                <span>{apt.maxGuests} Guests</span>
                <span>·</span>
                <span>{bedroomsLabel(apt.bedrooms)}</span>
                <span>·</span>
                <span>{apt.bathrooms}</span>
                <span>·</span>
                <span>{apt.size}</span>
              </div>
              <p style={{ color: c.body, fontSize: 13.5, lineHeight: 1.6, margin: '2px 0' }}>
                {apt.shortDesc}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {apt.amenities.slice(0, 3).map((am) => (
                  <span key={am} style={amenityChip}>
                    {am}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 10 }}>
                <button
                  onClick={() => onViewApartment(apt.id)}
                  style={{
                    background: c.white,
                    color: c.navy,
                    border: `1px solid ${c.navy}`,
                    padding: '9px 18px',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View Apartment
                </button>
                <button
                  onClick={onCheckAvailability}
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
                  Check Availability
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
