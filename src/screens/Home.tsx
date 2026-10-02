import { useState } from 'react';
import type { Apartment, AvailabilityState, Screen } from '../types';
import { useApartments } from '../data/apartments';
import { LANDMARKS, WHY_STAY } from '../data/content';
import { bedroomsLabel, fmt } from '../lib/format';
import { amenityChip, c, CONTACT, eyebrow, field, label, sectionTitle, serif } from '../theme';
import { ImageSlot } from '../components/ImageSlot';
import { WhyStayGlyph } from '../components/Icons';

interface Props {
  avail: AvailabilityState;
  onAvailChange: (patch: Partial<AvailabilityState>) => void;
  onNavigate: (screen: Screen) => void;
  onViewApartment: (id: number) => void;
}

const GALLERY_PREVIEW = [
  { id: 'gal-prev-1', caption: 'Living area', span: true, src: '/assets/glimpse-living.jpg' },
  { id: 'gal-prev-2', caption: 'Bedroom', span: false, src: '/assets/glimpse-bedroom.jpg' },
  { id: 'gal-prev-3', caption: 'Kitchen', span: false, src: '/assets/glimpse-kitchen.jpg' },
  { id: 'gal-prev-4', caption: 'Bathroom', span: false, src: '/assets/glimpse-bathroom.jpg' },
  { id: 'gal-prev-5', caption: 'Dinning', span: false, src: '/assets/glimpse-dinning.jpg' },
];

export function Home({ avail, onAvailChange, onNavigate, onViewApartment }: Props) {
  const apartments = useApartments();
  const [addressCopied, setAddressCopied] = useState(false);

  const copyAddress = () => {
    void navigator.clipboard?.writeText(CONTACT.address);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 1800);
  };

  return (
    <div>
      {/* HERO */}
      <section
        style={{
          position: 'relative',
          minHeight: 640,
          display: 'flex',
          alignItems: 'center',
          background: c.navy,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
          <ImageSlot src="/assets/hero-living.jpg" placeholder="Drop hero photo of The Perch exterior or living room" />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg,rgba(31,58,77,0.55) 0%,rgba(31,58,77,0.75) 100%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            maxWidth: 1280,
            margin: '0 auto',
            padding: '100px 24px 60px',
            width: '100%',
          }}
        >
          <p style={{ ...eyebrow, fontSize: 13, margin: '0 0 16px', animation: 'fadeUp 0.6s ease' }}>
            Slice of Paradise · Airport, Abuja
          </p>
          <h1
            style={{
              fontFamily: serif,
              color: c.white,
              fontSize: 'clamp(34px,5.5vw,60px)',
              lineHeight: 1.1,
              margin: '0 0 18px',
              maxWidth: 720,
              fontWeight: 600,
              animation: 'fadeUp 0.7s ease',
            }}
          >
            Your Slice of Paradise in Abuja
          </h1>
          <p
            style={{
              color: '#F0EBE0',
              fontSize: 17,
              lineHeight: 1.6,
              maxWidth: 560,
              margin: '0 0 40px',
              animation: 'fadeUp 0.8s ease',
            }}
          >
            Experience comfort, privacy and thoughtful hospitality at The Perch, located in the peaceful
            River Park Estate, Lugbe, Abuja.
          </p>

          <div
            style={{
              background: c.white,
              borderRadius: 8,
              padding: 22,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              alignItems: 'flex-end',
              maxWidth: 920,
            }}
          >
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={label} htmlFor="hero-checkin">
                Check-in
              </label>
              <input
                id="hero-checkin"
                type="date"
                value={avail.checkIn}
                onChange={(e) => onAvailChange({ checkIn: e.target.value })}
                style={field}
              />
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={label} htmlFor="hero-checkout">
                Check-out
              </label>
              <input
                id="hero-checkout"
                type="date"
                value={avail.checkOut}
                onChange={(e) => onAvailChange({ checkOut: e.target.value })}
                style={field}
              />
            </div>
            <div style={{ flex: 0.6, minWidth: 110 }}>
              <label style={label} htmlFor="hero-guests">
                Guests
              </label>
              <select
                id="hero-guests"
                value={avail.adults}
                onChange={(e) => onAvailChange({ adults: e.target.value })}
                style={field}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} Guest{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => onNavigate('availability')}
              style={{
                background: c.navy,
                color: c.white,
                border: 'none',
                padding: '12px 26px',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                height: 44,
              }}
            >
              Check Availability
            </button>
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noreferrer"
              style={{
                background: c.sageBg,
                color: c.sageText,
                padding: '12px 22px',
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section style={{ maxWidth: 820, margin: '0 auto', padding: '90px 24px', textAlign: 'center' }}>
        <p style={eyebrow}>Welcome to The Perch</p>
        <h2 style={{ ...sectionTitle, margin: '0 0 20px' }}>A premium home away from home</h2>
        <p style={{ color: '#4A5C67', fontSize: 16, lineHeight: 1.8, margin: 0 }}>
          The Perch offers premium short-let accommodation designed for business travellers, families,
          couples, and visitors seeking comfort and privacy in Abuja. Every apartment is thoughtfully
          furnished and quietly set within the secure River Park Estate in Lugbe — close to the airport,
          calm, and always ready to welcome you.
        </p>
      </section>

      {/* FEATURED APARTMENTS */}
      <section style={{ background: c.cream, padding: '90px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={eyebrow}>Our Apartments</p>
            <h2 style={sectionTitle}>Find your perch</h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center' }}>
            {apartments.map((apt) => (
              <ApartmentCard
                key={apt.id}
                apt={apt}
                onView={() => onViewApartment(apt.id)}
                onCheck={() => onNavigate('availability')}
              />
            ))}
          </div>
        </div>
      </section>

      {/* WHY STAY */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '90px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={eyebrow}>Why Stay With Us</p>
          <h2 style={sectionTitle}>Why Stay at The Perch?</h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
            gap: 36,
          }}
        >
          {WHY_STAY.map((w) => (
            <div
              key={w.title}
              style={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: c.cream,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <WhyStayGlyph name={w.icon} />
              </div>
              <h4 style={{ fontSize: 15.5, color: c.navy, margin: 0, fontWeight: 600 }}>{w.title}</h4>
              <p
                style={{
                  fontSize: 13.5,
                  color: c.bodyMuted,
                  lineHeight: 1.6,
                  margin: 0,
                  maxWidth: 220,
                }}
              >
                {w.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* GALLERY PREVIEW */}
      <section style={{ background: c.navy, padding: '90px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 36,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <h2
              style={{
                fontFamily: serif,
                fontSize: 'clamp(24px,3vw,32px)',
                color: c.white,
                margin: 0,
                fontWeight: 600,
              }}
            >
              A Glimpse Inside
            </h2>
            <a
              onClick={() => onNavigate('gallery')}
              style={{ color: c.gold, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              View Full Gallery →
            </a>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gridTemplateRows: 'repeat(2,160px)',
              gap: 14,
            }}
          >
            {GALLERY_PREVIEW.map((g) => (
              <div
                key={g.id}
                style={g.span ? { gridColumn: 'span 2', gridRow: 'span 2' } : undefined}
              >
                <ImageSlot src={g.src} placeholder={g.caption} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '90px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 48,
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1, minWidth: 300 }}>
          <p style={eyebrow}>Location</p>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 'clamp(24px,3vw,32px)',
              color: c.navy,
              margin: '0 0 18px',
              fontWeight: 600,
            }}
          >
            Peacefully placed in River Park Estate
          </h2>
          <p style={{ color: c.body, fontSize: 15, lineHeight: 1.8, margin: '0 0 24px' }}>
            {CONTACT.address}, Nigeria. Minutes from the Nnamdi Azikiwe International Airport, within a
            quiet, secure residential estate.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            <a
              href={CONTACT.mapsUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                background: c.navy,
                color: c.white,
                padding: '11px 20px',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Get Directions
            </a>
            <button
              onClick={copyAddress}
              style={{
                background: c.white,
                color: c.navy,
                border: `1px solid ${c.navy}`,
                padding: '11px 20px',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {addressCopied ? 'Copied!' : 'Copy Address'}
            </button>
          </div>
          <div style={{ borderTop: `1px solid ${c.hairline}`, paddingTop: 18 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: c.navy,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 10px',
              }}
            >
              Nearby Landmarks
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {LANDMARKS.map((lm) => (
                <div
                  key={lm.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13.5,
                    color: c.body,
                    maxWidth: 340,
                  }}
                >
                  <span>{lm.name}</span>
                  <span>{lm.distance}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 300,
            height: 340,
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: '0 6px 24px rgba(31,58,77,0.1)',
          }}
        >
          <ImageSlot src="/assets/location-map.png" placeholder="Map: River Park Estate, Lugbe, Abuja" />
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ background: c.cream, padding: '80px 24px', textAlign: 'center' }}>
        <h2
          style={{
            fontFamily: serif,
            fontSize: 'clamp(26px,3.6vw,38px)',
            color: c.navy,
            margin: '0 0 16px',
            fontWeight: 600,
          }}
        >
          Ready for your Slice of Paradise?
        </h2>
        <p style={{ color: c.body, fontSize: 15, margin: '0 0 30px' }}>
          Reserve your stay in a few simple steps.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate('booking')}
            style={{
              background: c.navy,
              color: c.white,
              border: 'none',
              padding: '14px 30px',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Book Your Stay
          </button>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noreferrer"
            style={{
              background: c.white,
              color: c.navy,
              border: `1px solid ${c.navy}`,
              padding: '14px 30px',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Chat on WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}

function ApartmentCard({
  apt,
  onView,
  onCheck,
}: {
  apt: Apartment;
  onView: () => void;
  onCheck: () => void;
}) {
  return (
    <div
      style={{
        width: 340,
        background: c.white,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 6px 24px rgba(31,58,77,0.08)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 220, position: 'relative' }}>
        <ImageSlot src={apt.photo} placeholder={`${apt.name} photo`} />
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'rgba(255,255,255,0.92)',
            padding: '5px 10px',
            borderRadius: 3,
            fontSize: 11,
            fontWeight: 600,
            color: c.navy,
          }}
        >
          {apt.type}
        </div>
      </div>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <h3 style={{ fontFamily: serif, fontSize: 19, color: c.navy, margin: 0, fontWeight: 600 }}>
          {apt.name}
        </h3>
        <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: c.bodyMuted }}>
          <span>{apt.maxGuests} Guests</span>
          <span>·</span>
          <span>{bedroomsLabel(apt.bedrooms)}</span>
          <span>·</span>
          <span>{apt.beds}</span>
        </div>
        <p style={{ color: c.body, fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{apt.shortDesc}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
          {apt.amenities.slice(0, 3).map((am) => (
            <span key={am} style={amenityChip}>
              {am}
            </span>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginTop: 'auto',
            paddingTop: 12,
            borderTop: `1px solid ${c.hairlineSoft}`,
          }}
        >
          <div>
            <span style={{ fontFamily: serif, fontSize: 20, color: c.navy, fontWeight: 600 }}>
              {fmt(apt.nightly)}
            </span>
            <span style={{ fontSize: 12, color: c.faint }}> / night</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button
            onClick={onView}
            style={{
              flex: 1,
              background: c.white,
              color: c.navy,
              border: `1px solid ${c.navy}`,
              padding: 10,
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View Apartment
          </button>
          <button
            onClick={onCheck}
            style={{
              flex: 1,
              background: c.navy,
              color: c.white,
              border: 'none',
              padding: 10,
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
  );
}
