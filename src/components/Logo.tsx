import { useState } from 'react';
import { c, serif } from '../theme';

interface Props {
  height: number;
  /** Footer sits on navy, so the logo gets a white plate there. */
  onDark?: boolean;
}

/**
 * Falls back to a wordmark if `perch-logo.jpeg` hasn't been dropped into
 * `public/assets/` yet, so the header never renders a broken image.
 */
export function Logo({ height, onDark = false }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        style={{
          fontFamily: serif,
          fontSize: height * 0.42,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: onDark ? c.white : c.navy,
          lineHeight: `${height}px`,
          display: 'inline-block',
        }}
      >
        The Perch
      </span>
    );
  }

  return (
    <img
      src="/assets/perch-logo.jpeg"
      alt="The Perch"
      onError={() => setFailed(true)}
      style={{
        height,
        width: 'auto',
        objectFit: 'contain',
        ...(onDark ? { background: c.white, borderRadius: 6, padding: '4px 8px' } : {}),
      }}
    />
  );
}
