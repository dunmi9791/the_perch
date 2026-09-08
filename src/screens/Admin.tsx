import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ADMIN_ARRIVALS,
  ADMIN_GUESTS,
  ADMIN_PAYMENTS,
  ADMIN_STATS,
  ADMIN_TABS,
  CALENDAR_LEGEND,
  REPORT_LIST,
  timelineCellColor,
} from '../data/admin';
import type { AdminTab } from '../data/admin';
import { APARTMENTS } from '../data/apartments';
import { fmt } from '../lib/format';
import { monthLabel, upcomingDayLabels } from '../lib/calendar';
import { c, serif } from '../theme';

interface Props {
  onExit: () => void;
  onEditApartment: (id: number) => void;
}

const TIMELINE_DAYS = 14;

const h1: CSSProperties = {
  fontFamily: serif,
  fontSize: 24,
  color: c.navy,
  margin: '0 0 4px',
  fontWeight: 600,
};

const subtitle: CSSProperties = { fontSize: 13, color: c.faint, margin: '0 0 24px' };

const tableWrap: CSSProperties = {
  background: c.white,
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 2px 10px rgba(31,58,77,0.06)',
};

const headRow = (cols: string): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: cols,
  padding: '12px 18px',
  background: c.cream,
  fontSize: 11.5,
  fontWeight: 700,
  color: c.body,
  textTransform: 'uppercase',
});

const bodyRow = (cols: string): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: cols,
  padding: '14px 18px',
  borderTop: '1px solid rgba(31,58,77,0.06)',
  fontSize: 13.5,
  color: c.navySoft,
  alignItems: 'center',
});

const pill = (bg: string, color: string): CSSProperties => ({
  background: bg,
  color,
  padding: '4px 10px',
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 600,
  width: 'fit-content',
});

export function Admin({ onExit, onEditApartment }: Props) {
  const [tab, setTab] = useState<AdminTab>('overview');

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
        <div style={{ marginTop: 'auto', padding: '20px 24px 0' }}>
          <a onClick={onExit} style={{ color: c.onNavy, fontSize: 12.5, cursor: 'pointer' }}>
            ← Exit to Website
          </a>
        </div>
      </aside>

      <div style={{ flex: 1, padding: '36px 40px', overflow: 'auto' }}>
        {tab === 'overview' && (
          <>
            <h1 style={h1}>Dashboard Overview</h1>
            <p style={{ ...subtitle, margin: '0 0 28px' }}>Demo data — for illustration only</p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                gap: 16,
                marginBottom: 32,
              }}
            >
              {ADMIN_STATS.map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: c.white,
                    borderRadius: 8,
                    padding: 18,
                    boxShadow: '0 2px 10px rgba(31,58,77,0.06)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 11.5,
                      color: c.faint,
                      margin: '0 0 6px',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    {stat.label}
                  </p>
                  <p
                    style={{
                      fontFamily: serif,
                      fontSize: 24,
                      color: c.navy,
                      margin: 0,
                      fontWeight: 600,
                    }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <h3 style={{ fontSize: 15, color: c.navy, margin: '0 0 14px', fontWeight: 600 }}>
              Today&rsquo;s Arrivals &amp; Departures
            </h3>
            <div style={tableWrap}>
              <div style={headRow('1.2fr 1fr 1fr 0.8fr 0.8fr')}>
                <span>Guest</span>
                <span>Apartment</span>
                <span>Dates</span>
                <span>Type</span>
                <span>Status</span>
              </div>
              {ADMIN_ARRIVALS.map((row) => (
                <div key={`${row.guest}-${row.dates}`} style={bodyRow('1.2fr 1fr 1fr 0.8fr 0.8fr')}>
                  <span>{row.guest}</span>
                  <span>{row.apt}</span>
                  <span>{row.dates}</span>
                  <span>{row.type}</span>
                  <span style={pill(row.statusBg, row.statusColor)}>{row.status}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'calendar' && (
          <>
            <h1 style={h1}>Reservation Calendar</h1>
            <p style={subtitle}>{monthLabel()} · Timeline by unit</p>
            <div
              style={{
                background: c.white,
                borderRadius: 8,
                padding: 20,
                boxShadow: '0 2px 10px rgba(31,58,77,0.06)',
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `140px repeat(${TIMELINE_DAYS},1fr)`,
                  gap: 2,
                  minWidth: 900,
                }}
              >
                <div />
                {upcomingDayLabels(TIMELINE_DAYS).map((d, i) => (
                  <div
                    key={`hdr-${i}`}
                    style={{
                      textAlign: 'center',
                      fontSize: 11,
                      color: c.faint,
                      fontWeight: 600,
                      padding: '4px 0',
                    }}
                  >
                    {d}
                  </div>
                ))}
                {APARTMENTS.map((apt, ri) => (
                  <FragmentRow key={apt.id} name={apt.name} rowIndex={ri} />
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  flexWrap: 'wrap',
                  marginTop: 20,
                  fontSize: 11.5,
                  color: c.body,
                }}
              >
                {CALENDAR_LEGEND.map((lg) => (
                  <span key={lg.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: lg.color,
                        display: 'inline-block',
                      }}
                    />
                    {lg.label}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'apartments' && (
          <>
            <h1 style={h1}>Apartments</h1>
            <p style={subtitle}>Manage apartment types, units, rates and amenities</p>
            <div style={tableWrap}>
              <div style={headRow('1.6fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr')}>
                <span>Apartment</span>
                <span>Units</span>
                <span>Guests</span>
                <span>Nightly Rate</span>
                <span>Status</span>
                <span />
              </div>
              {APARTMENTS.map((apt) => (
                <div key={apt.id} style={bodyRow('1.6fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr')}>
                  <span style={{ fontWeight: 600, color: c.navy }}>{apt.name}</span>
                  <span>{apt.unitCount}</span>
                  <span>{apt.maxGuests}</span>
                  <span>{fmt(apt.nightly)}</span>
                  <span style={pill(c.sageBg, c.sageText)}>Active</span>
                  <a
                    onClick={() => onEditApartment(apt.id)}
                    style={{ fontSize: 12.5, color: c.gold, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Edit
                  </a>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'rates' && (
          <>
            <h1 style={h1}>Rates &amp; Pricing</h1>
            <p style={{ fontSize: 13, color: c.gold, margin: '0 0 24px', fontWeight: 600 }}>
              Rates shown are the current official rate card.
            </p>
            <div style={tableWrap}>
              <div style={headRow('1.4fr 1fr 1fr 1fr 1fr')}>
                <span>Apartment</span>
                <span>Nightly</span>
                <span>Weekend</span>
                <span>Weekly</span>
                <span>Cleaning Fee</span>
              </div>
              {APARTMENTS.map((apt) => (
                <div key={apt.id} style={bodyRow('1.4fr 1fr 1fr 1fr 1fr')}>
                  <span style={{ fontWeight: 600, color: c.navy }}>{apt.name}</span>
                  <span>{fmt(apt.nightly)}</span>
                  <span>{fmt(apt.weekend)}</span>
                  <span>{fmt(apt.weekly)}</span>
                  <span>{fmt(apt.cleaning)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'guests' && (
          <>
            <h1 style={h1}>Guests</h1>
            <p style={subtitle}>Guest profiles and booking history</p>
            <div style={tableWrap}>
              <div style={headRow('1.4fr 1.2fr 0.7fr 0.9fr')}>
                <span>Guest</span>
                <span>Contact</span>
                <span>Stays</span>
                <span>Balance</span>
              </div>
              {ADMIN_GUESTS.map((g) => (
                <div key={g.name} style={bodyRow('1.4fr 1.2fr 0.7fr 0.9fr')}>
                  <span style={{ fontWeight: 600, color: c.navy }}>{g.name}</span>
                  <span>{g.contact}</span>
                  <span>{g.stays}</span>
                  <span>{g.balance}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'payments' && (
          <>
            <h1 style={h1}>Payments</h1>
            <p style={subtitle}>Track payments, verification and refunds</p>
            <div style={tableWrap}>
              <div style={headRow('1fr 1.2fr 0.8fr 0.8fr 1fr')}>
                <span>Reference</span>
                <span>Guest</span>
                <span>Amount</span>
                <span>Method</span>
                <span>Status</span>
              </div>
              {ADMIN_PAYMENTS.map((p) => (
                <div key={p.ref} style={bodyRow('1fr 1.2fr 0.8fr 0.8fr 1fr')}>
                  <span>{p.ref}</span>
                  <span>{p.guest}</span>
                  <span>{p.amount}</span>
                  <span>{p.method}</span>
                  <span style={pill(p.statusBg, p.statusColor)}>{p.status}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'reports' && (
          <>
            <h1 style={h1}>Reports</h1>
            <p style={subtitle}>Export operational and financial reports</p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                gap: 16,
              }}
            >
              {REPORT_LIST.map((rep) => (
                <div
                  key={rep}
                  style={{
                    background: c.white,
                    borderRadius: 8,
                    padding: 18,
                    boxShadow: '0 2px 10px rgba(31,58,77,0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 13.5, color: c.navy, fontWeight: 600 }}>{rep}</span>
                  <button
                    style={{
                      background: c.cream,
                      color: c.navy,
                      border: 'none',
                      padding: '7px 12px',
                      borderRadius: 4,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flex: '0 0 auto',
                    }}
                  >
                    Export
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** One unit's label plus its 14 day cells, emitted flat into the parent grid. */
function FragmentRow({ name, rowIndex }: { name: string; rowIndex: number }) {
  return (
    <>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: c.navy,
          display: 'flex',
          alignItems: 'center',
          padding: '6px 0',
        }}
      >
        {name}
      </div>
      {Array.from({ length: TIMELINE_DAYS }, (_, ci) => (
        <div
          key={ci}
          style={{ height: 30, background: timelineCellColor(rowIndex, ci), borderRadius: 3 }}
        />
      ))}
    </>
  );
}
