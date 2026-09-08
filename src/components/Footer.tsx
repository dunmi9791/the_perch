import type { CSSProperties } from 'react';
import type { Screen } from '../types';
import { c, CONTACT, serif } from '../theme';
import { Logo } from './Logo';

const NAV_LINKS: { screen: Screen; label: string }[] = [
  { screen: 'home', label: 'Home' },
  { screen: 'apartments', label: 'Apartments' },
  { screen: 'gallery', label: 'Gallery' },
  { screen: 'about', label: 'About Us' },
  { screen: 'contact', label: 'Contact' },
];

const POLICIES = ['Terms & Conditions', 'Privacy Policy', 'Cancellation Policy', 'House Rules'];

const colHeading: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: c.white,
  margin: '0 0 16px',
};

export function Footer({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <footer style={{ background: c.navy, color: c.onNavyBody, padding: '64px 24px 28px' }}>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto 40px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 40,
        }}
      >
        <div style={{ flex: 1.4, minWidth: 240 }}>
          <div style={{ marginBottom: 12 }}>
            <Logo height={52} onDark />
          </div>
          <p style={{ fontFamily: serif, fontStyle: 'italic', color: c.gold, fontSize: 15, margin: '0 0 16px' }}>
            Slice of Paradise
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, color: c.onNavy }}>
            Plot 372 Vincent Azike Street, Cluster 1,
            <br />
            River Park Estate, Lugbe, Abuja, Nigeria
          </p>
        </div>

        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={colHeading}>Navigate</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.screen}
                href={`#/${link.screen}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(link.screen);
                }}
                style={{ fontSize: 13.5, color: c.onNavy, cursor: 'pointer' }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={colHeading}>Contact</p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: 13.5,
              color: c.onNavy,
            }}
          >
            <a href={CONTACT.phoneHref} style={{ color: c.onNavy }}>
              {CONTACT.phone}
            </a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" style={{ color: c.onNavy }}>
              WhatsApp Us
            </a>
            <span>{CONTACT.email}</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={colHeading}>Policies</p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: 13.5,
              color: c.onNavy,
            }}
          >
            {POLICIES.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          paddingTop: 20,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <p style={{ fontSize: 12, color: c.onNavyFaint, margin: 0 }}>
          © {new Date().getFullYear()} The Perch. All rights reserved.
        </p>
        <a
          href="#/admin"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('admin');
          }}
          style={{ fontSize: 11, color: '#5C7488', cursor: 'pointer' }}
        >
          Admin Login
        </a>
      </div>
    </footer>
  );
}
