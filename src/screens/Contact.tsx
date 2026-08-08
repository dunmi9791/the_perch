import { useState } from 'react';
import { FAQS } from '../data/content';
import { c, CONTACT, eyebrow, field, pageTitle } from '../theme';
import { ImageSlot } from '../components/ImageSlot';
import { ClockIcon, PhoneIcon, PinIcon, WhatsAppIcon } from '../components/Icons';

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({});

  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSent(false);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 90px' }}>
      <p style={{ ...eyebrow, margin: '0 0 10px' }}>Contact Us</p>
      <h1 style={{ ...pageTitle, margin: '0 0 40px' }}>We&rsquo;d love to hear from you</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 36 }}
          >
            <input
              type="text"
              required
              placeholder="Full name"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              style={{ ...field, padding: 12 }}
            />
            <input
              type="email"
              required
              placeholder="Email address"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              style={{ ...field, padding: 12 }}
            />
            <input
              type="tel"
              placeholder="Telephone"
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
              style={{ ...field, padding: 12 }}
            />
            <textarea
              placeholder="Your message"
              rows={4}
              required
              value={form.message}
              onChange={(e) => set({ message: e.target.value })}
              style={{ ...field, padding: 12, fontFamily: 'inherit', resize: 'vertical' }}
            />
            <button
              type="submit"
              style={{
                background: c.navy,
                color: c.white,
                border: 'none',
                padding: 13,
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {sent ? 'Message Sent ✓' : 'Send Message'}
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <PhoneIcon size={16} />
              <a href={CONTACT.phoneHref} style={{ fontSize: 14.5, color: c.navy, fontWeight: 600 }}>
                {CONTACT.phone}
              </a>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <WhatsAppIcon size={16} />
              <a
                href={CONTACT.whatsapp}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 14.5, color: c.navy, fontWeight: 600 }}
              >
                WhatsApp Chat
              </a>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <PinIcon />
              <span style={{ fontSize: 14.5, color: c.navy }}>
                Plot 372 Vincent Azike Street, Cluster 1,
                <br />
                River Park Estate, Lugbe, Abuja
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <ClockIcon />
              <span style={{ fontSize: 14.5, color: c.navy }}>
                Guest Support: 8:00am – 9:00pm daily
              </span>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 15, color: c.navy, margin: '0 0 14px', fontWeight: 600 }}>
              Frequently Asked Questions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FAQS.map((faq, i) => {
                const open = Boolean(openFaq[i]);
                return (
                  <div
                    key={faq.q}
                    onClick={() => setOpenFaq((s) => ({ ...s, [i]: !s[i] }))}
                    style={{
                      border: `1px solid ${c.hairline}`,
                      borderRadius: 6,
                      padding: '14px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: c.navy }}>{faq.q}</span>
                      <span style={{ color: c.gold, fontSize: 16 }}>{open ? '−' : '+'}</span>
                    </div>
                    {open && (
                      <p style={{ fontSize: 13, color: c.body, margin: '10px 0 0', lineHeight: 1.6 }}>
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 300, height: 420, borderRadius: 10, overflow: 'hidden' }}>
          <ImageSlot placeholder="Map: River Park Estate, Lugbe, Abuja" />
        </div>
      </div>
    </div>
  );
}
