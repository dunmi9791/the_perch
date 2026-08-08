import { c, eyebrow, serif } from '../theme';
import { ImageSlot } from '../components/ImageSlot';

const STORY = [
  {
    id: 'about-1',
    slot: 'The Perch living space',
    title: 'The Perch Experience',
    body: 'Every space is prepared to offer the convenience of home with the thoughtful service of a premium hospitality property. From arrival to departure, our team quietly attends to the details so your stay feels effortless.',
    imageFirst: true,
  },
  {
    id: 'about-2',
    slot: 'Housekeeping / hospitality',
    title: 'Hospitality Values',
    body: 'We hold ourselves to a standard of cleanliness, discretion and genuine care. Housekeeping, maintenance and guest support are managed closely so that every apartment is ready to receive you.',
    imageFirst: false,
  },
  {
    id: 'about-3',
    slot: 'River Park Estate, Lugbe',
    title: 'Location & Accessibility',
    body: 'Set within the secure, well-planned River Park Estate in Lugbe, The Perch is a short drive from the Nnamdi Azikiwe International Airport — convenient for arriving guests and easy to reach for local visitors.',
    imageFirst: true,
  },
];

const POLICIES = [
  { title: 'Secure Estate', body: 'Gated, guarded residential estate with controlled access.' },
  {
    title: 'Reliable Power & Water',
    body: 'Backup power and water supply maintained across the property.',
  },
  { title: 'Housekeeping Standards', body: 'Professional cleaning between every stay.' },
];

export function About() {
  return (
    <div>
      <section style={{ background: c.navy, padding: '80px 24px', textAlign: 'center' }}>
        <p style={eyebrow}>Our Story</p>
        <h1
          style={{
            fontFamily: serif,
            fontSize: 'clamp(28px,3.8vw,40px)',
            color: c.white,
            margin: '0 auto',
            maxWidth: 700,
            fontWeight: 600,
          }}
        >
          The Perch was created to provide visitors to Abuja with a peaceful, comfortable and private
          place to rest, work and reconnect.
        </h1>
      </section>

      <section
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '80px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 56,
        }}
      >
        {STORY.map((s) => {
          const image = (
            <div
              key={`${s.id}-img`}
              style={{ flex: 1, minWidth: 280, height: 280, borderRadius: 10, overflow: 'hidden' }}
            >
              <ImageSlot placeholder={s.slot} />
            </div>
          );
          const copy = (
            <div key={`${s.id}-copy`} style={{ flex: 1, minWidth: 280 }}>
              <h2
                style={{
                  fontFamily: serif,
                  fontSize: 24,
                  color: c.navy,
                  margin: '0 0 14px',
                  fontWeight: 600,
                }}
              >
                {s.title}
              </h2>
              <p style={{ color: c.body, fontSize: 15, lineHeight: 1.8, margin: 0 }}>{s.body}</p>
            </div>
          );
          return (
            <div
              key={s.id}
              style={{
                display: 'flex',
                // Reversing the wrap keeps the image below the copy on narrow screens
                // for the alternating rows, matching the mockup.
                flexWrap: s.imageFirst ? 'wrap' : 'wrap-reverse',
                gap: 32,
                alignItems: 'center',
              }}
            >
              {s.imageFirst ? [image, copy] : [copy, image]}
            </div>
          );
        })}

        <div>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 24,
              color: c.navy,
              margin: '0 0 20px',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            Safety, Comfort &amp; Property Policies
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
              gap: 24,
            }}
          >
            {POLICIES.map((p) => (
              <div key={p.title} style={{ background: c.cream, padding: 22, borderRadius: 8 }}>
                <h4 style={{ fontSize: 14.5, color: c.navy, margin: '0 0 8px', fontWeight: 600 }}>
                  {p.title}
                </h4>
                <p style={{ fontSize: 13.5, color: c.body, lineHeight: 1.6, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
