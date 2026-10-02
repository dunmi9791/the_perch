import type { CSSProperties } from 'react';
import type { Apartment, PriceBreakdown } from '../types';
import { c } from '../theme';
import { fmt, nightsLabel } from '../lib/format';

interface Props {
  apartments: Apartment[];
  breakdown: PriceBreakdown;
  checkIn: string;
  checkOut: string;
}

const row: CSSProperties = { display: 'flex', justifyContent: 'space-between' };

/** The sticky price panel shared by booking steps 3 and 4. */
export function BookingSummary({ apartments, breakdown, checkIn, checkOut }: Props) {
  return (
    <div style={{ background: c.cream, borderRadius: 10, padding: 22, position: 'sticky', top: 100 }}>
      <p
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: c.navy,
          margin: '0 0 14px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Booking Summary
      </p>

      {apartments.length > 0 ? (
        <>
          <p style={{ fontSize: 15, fontWeight: 600, color: c.navy, margin: '0 0 4px' }}>
            {apartments.map((a) => a.name).join(', ')}
          </p>
          <p style={{ fontSize: 12.5, color: c.faint, margin: '0 0 16px' }}>
            {checkIn || '—'} → {checkOut || '—'}
          </p>
        </>
      ) : (
        <p style={{ fontSize: 13, color: c.faint, margin: 0 }}>Select your rooms to see pricing.</p>
      )}

      {breakdown.valid && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 13,
            color: c.body,
            borderTop: `1px solid ${c.hairline}`,
            paddingTop: 12,
          }}
        >
          {breakdown.lines.map((l) => (
            <div key={l.apartment.id} style={row}>
              <span>
                {l.apartment.name} · {nightsLabel(breakdown.nights)}
              </span>
              <span>{fmt(l.total)}</span>
            </div>
          ))}
          <div style={{ ...row, color: c.navy }}>
            <span>Subtotal</span>
            <span>{fmt(breakdown.subtotal)}</span>
          </div>
          <div style={row}>
            <span>Tax ({breakdown.taxRate}%)</span>
            <span>{fmt(breakdown.tax)}</span>
          </div>
          <div style={row}>
            <span>Caution deposit (refundable)</span>
            <span>{fmt(breakdown.deposit)}</span>
          </div>
          <div
            style={{
              ...row,
              fontWeight: 700,
              color: c.navy,
              borderTop: '1px solid rgba(31,58,77,0.15)',
              paddingTop: 8,
              marginTop: 2,
            }}
          >
            <span>Total due</span>
            <span>{fmt(breakdown.dueOnline)}</span>
          </div>
          <p style={{ fontSize: 12, color: c.faint, margin: '4px 0 0', lineHeight: 1.5 }}>
            The caution deposit is refunded 24–48 hours after checkout, provided there is no damage to the property.
          </p>
        </div>
      )}
    </div>
  );
}
