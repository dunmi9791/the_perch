import { useEffect, useState } from 'react';
import { GALLERY_CATEGORIES, GALLERY_IMAGES } from '../data/content';
import { c, eyebrow, pageTitle } from '../theme';
import { ImageSlot } from '../components/ImageSlot';

export function Gallery() {
  const [filter, setFilter] = useState('all');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const images = GALLERY_IMAGES.filter((g) => filter === 'all' || g.category === filter);
  const lightboxImage = lightboxIdx !== null ? (images[lightboxIdx] ?? null) : null;

  // Escape closes the lightbox, matching the click-outside affordance.
  useEffect(() => {
    if (!lightboxImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxImage]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px 90px' }}>
      <p style={{ ...eyebrow, margin: '0 0 10px' }}>Gallery</p>
      <h1 style={{ ...pageTitle, margin: '0 0 28px' }}>A Glimpse Inside The Perch</h1>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
        {GALLERY_CATEGORIES.map((cat) => {
          const active = filter === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => {
                setFilter(cat.key);
                setLightboxIdx(null);
              }}
              style={{
                background: active ? c.navy : c.white,
                color: active ? c.white : c.navy,
                border: `1px solid ${active ? c.navy : c.border}`,
                padding: '9px 18px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 14,
          gridAutoRows: '180px',
        }}
      >
        {images.map((img, i) => (
          <div
            key={img.slotId}
            onClick={() => setLightboxIdx(i)}
            style={{
              gridRow: `span ${img.rowSpan}`,
              position: 'relative',
              cursor: 'pointer',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <ImageSlot src={img.photo} placeholder={img.caption} />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '10px 12px',
                background: 'linear-gradient(0deg,rgba(31,58,77,0.65),transparent)',
                fontSize: 12,
                color: c.white,
                fontWeight: 500,
              }}
            >
              {img.caption}
            </div>
          </div>
        ))}
      </div>

      {lightboxImage && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,25,32,0.92)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(900px,88vw)', height: 'min(620px,80vh)' }}
          >
            <ImageSlot src={lightboxImage.photo} placeholder={lightboxImage.caption} />
          </div>
          <button
            onClick={() => setLightboxIdx(null)}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 24,
              right: 28,
              background: 'none',
              border: 'none',
              color: c.white,
              fontSize: 28,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
