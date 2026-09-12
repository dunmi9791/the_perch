import type { CSSProperties } from 'react';
import type { Apartment, PriceBreakdown } from '../types';
import { c } from '../theme';
import { fmt } from '../lib/format';

interface Props {
  apartment: Apartment | undefined;
  breakdown: PriceBreakdown;
  checkIn: string;
  checkOut: string;
}

const row: CSSProperties = { display: 'flex', justifyContent: 'space-between' };

/** The sticky price panel shared by booking steps 3 and 4. */
export function BookingSummary({ apartment, breakdown, checkIn, checkOut }: Props) {
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

      {apartment ? (
        <>
          <p style={{ fontSize: 15, fontWeight: 600, color: c.navy, margin: '0 0 4px' }}>
            {apartment.name}
          </p>
          <p style={{ fontSize: 12.5, color: c.faint, margin: '0 0 16px' }}>
            {checkIn || '—'} → {checkOut || '—'}
          </p>
        </>
      ) : (
        <p style={{ fontSize: 13, color: c.faint, margin: 0 }}>Select an apartment to see pricing.</p>
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
          <div style={row}>
            <span>Stay subtotal</span>
            <span>{fmt(breakdown.stayOnlyTotal)}</span>
          </div>
          <div style={row}>
            <span>Cleaning fee</span>
            <span>{fmt(breakdown.cleaning)}</span>
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
            <span>Due before arrival</span>
            <span>{fmt(breakdown.dueOnline)}</span>
          </div>
          <div style={row}>
            <span>Deposit at check-in (refundable)</span>
            <span>{fmt(breakdown.deposit)}</span>
          </div>
          <div style={{ ...row, color: c.faint, fontSize: 12.5 }}>
            <span>Total stay value</span>
            <span>{fmt(breakdown.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
