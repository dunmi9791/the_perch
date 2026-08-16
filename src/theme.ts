import type { CSSProperties } from 'react';

/** Palette lifted from the design canvas so screens stop repeating raw hex. */
export const c = {
  navy: '#1F3A4D',
  navySoft: '#3F4F58',
  gold: '#B8934F',
  cream: '#F8F3EA',
  sageBg: '#EAF1E8',
  sageText: '#3E5233',
  sageIcon: '#5C7A52',
  body: '#5C6E78',
  bodyMuted: '#6B7F8C',
  faint: '#8A97A0',
  onNavy: '#B8CBD6',
  onNavyBody: '#DCE4E8',
  onNavyFaint: '#8CA3AF',
  danger: '#B84F4F',
  disabled: '#B9C3C8',
  border: 'rgba(31,58,77,0.2)',
  hairline: 'rgba(31,58,77,0.1)',
  hairlineSoft: 'rgba(31,58,77,0.08)',
  white: '#FFFFFF',
} as const;

export const serif = "'Playfair Display', serif";

/** Business facts the design hard-codes in more than one place. */
export const CONTACT = {
  phone: '0707 331 8012',
  phoneHref: 'tel:07073318012',
  whatsapp: 'https://wa.me/2347073318012',
  email: 'reservations@theperch.example',
  address: 'Plot 372 Vincent Azike Street, Cluster 1, River Park Estate, Lugbe, Abuja',
  mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=8.975972,7.346278',
} as const;

/** Shared control styling — every date/select/text input in the mockup is identical. */
export const field: CSSProperties = {
  width: '100%',
  border: `1px solid ${c.border}`,
  borderRadius: 4,
  padding: 10,
  fontSize: 14,
  color: c.navy,
};

export const label: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: c.navy,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
};

export const eyebrow: CSSProperties = {
  color: c.gold,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  margin: '0 0 14px',
};

export const btnPrimary: CSSProperties = {
  background: c.navy,
  color: c.white,
  border: 'none',
  padding: '12px 28px',
  borderRadius: 4,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

export const btnGhost: CSSProperties = {
  background: c.white,
  color: c.navy,
  border: `1px solid ${c.navy}`,
  padding: '12px 24px',
  borderRadius: 4,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

export const card: CSSProperties = {
  background: c.white,
  border: `1px solid ${c.hairline}`,
  borderRadius: 10,
};

export const amenityChip: CSSProperties = {
  fontSize: 11,
  background: c.cream,
  color: c.navy,
  padding: '4px 9px',
  borderRadius: 3,
};

export const pageTitle: CSSProperties = {
  fontFamily: serif,
  fontSize: 'clamp(28px,3.6vw,38px)',
  color: c.navy,
  fontWeight: 600,
};

export const sectionTitle: CSSProperties = {
  fontFamily: serif,
  fontSize: 'clamp(26px,3.4vw,36px)',
  color: c.navy,
  margin: 0,
  fontWeight: 600,
};
