import { useState } from 'react';
import type { CSSProperties } from 'react';
import { c } from '../theme';

interface Props {
  /** Photo path under /public. Omit for spots that have no photography yet. */
  src?: string;
  /** Caption shown when there is no photo, and the image's alt text when there is. */
  placeholder: string;
  radius?: number;
}

/**
 * Stands in for the mockup's `<image-slot>`. That element let a designer drop a
 * file onto the canvas; here it simply renders the photo when one exists and
 * falls back to a labelled placeholder when it doesn't — including when the file
 * is missing at runtime, so a not-yet-supplied asset degrades instead of breaking.
 */
export function ImageSlot({ src, placeholder, radius = 0 }: Props) {
  const [failed, setFailed] = useState(false);

  const base: CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: radius || undefined,
  };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={placeholder}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ ...base, objectFit: 'cover', display: 'block' }}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={placeholder}
      style={{
        ...base,
        minHeight: 80,
        background: c.cream,
        border: `1px dashed ${c.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        textAlign: 'center',
        fontSize: 12,
        lineHeight: 1.5,
        color: c.faint,
      }}
    >
      {placeholder}
    </div>
  );
}
