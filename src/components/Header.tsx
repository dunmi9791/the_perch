import type { Screen } from '../types';
import { c, CONTACT } from '../theme';
import { Logo } from './Logo';
import { MenuIcon, PhoneIcon, WhatsAppIcon } from './Icons';

const NAV_ITEMS: { screen: Screen; label: string }[] = [
  { screen: 'home', label: 'Home' },
  { screen: 'apartments', label: 'Apartments' },
  { screen: 'availability', label: 'Availability' },
  { screen: 'gallery', label: 'Gallery' },
  { screen: 'about', label: 'About Us' },
  { screen: 'contact', label: 'Contact' },
];

interface Props {
  screen: Screen;
  menuOpen: boolean;
  onNavigate: (screen: Screen) => void;
  onToggleMenu: () => void;
}

export function Header({ screen, menuOpen, onNavigate, onToggleMenu }: Props) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(6px)',
        borderBottom: `1px solid ${c.hairlineSoft}`,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <a
          href="#/home"
          aria-label="The Perch home"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <Logo height={46} />
        </a>

        <nav style={{ display: 'none', alignItems: 'center', gap: 28 }} data-desktop-nav="1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.screen}
              href={`#/${item.screen}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.screen);
              }}
              style={{
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                color: screen === item.screen ? c.gold : c.navy,
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a
            href={CONTACT.phoneHref}
            data-desktop-only="1"
            style={{
              display: 'none',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: c.navy,
            }}
          >
            <PhoneIcon />
            {CONTACT.phone}
          </a>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noreferrer"
            title="Chat on WhatsApp"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: c.sageBg,
            }}
          >
            <WhatsAppIcon />
          </a>
          <button
            onClick={() => onNavigate('booking')}
            style={{
              background: c.navy,
              color: c.cream,
              border: 'none',
              padding: '11px 22px',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.02em',
              cursor: 'pointer',
            }}
          >
            Book Your Stay
          </button>
          <button
            onClick={onToggleMenu}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            data-mobile-only="1"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              background: 'none',
              border: '1px solid rgba(31,58,77,0.15)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          style={{
            padding: '8px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            borderTop: `1px solid ${c.hairlineSoft}`,
          }}
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.screen}
              href={`#/${item.screen}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.screen);
              }}
              style={{ fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
            >
              {item.label}
            </a>
          ))}
          <a href={CONTACT.phoneHref} style={{ fontSize: 15, fontWeight: 600, color: c.gold }}>
            Call {CONTACT.phone}
          </a>
        </div>
      )}
    </header>
  );
}
