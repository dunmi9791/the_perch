import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Vite bakes VITE_* values in at build time, so a bundle built without them
  // can never recover at runtime. Say so on the page instead of going blank.
  const root = typeof document !== 'undefined' ? document.getElementById('root') : null;
  if (root) {
    root.innerHTML = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 15vh auto; padding: 0 24px; color: #1F3A4D; line-height: 1.6">
        <h1 style="font-family: 'Playfair Display', serif; font-size: 26px; margin: 0 0 12px">Bookings are temporarily unavailable</h1>
        <p style="margin: 0 0 8px">This copy of the site was built without its booking service settings.</p>
        <p style="margin: 0; font-size: 13.5px; color: #5C6E78">
          For the person deploying it: set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>
          in the hosting provider's build environment (or in <code>.env.local</code> for a local build) and rebuild.
        </p>
      </div>`;
  }
  throw new Error(
    'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY where the site is built (hosting env vars, or .env.local locally).',
  );
}

/** The one client for the whole app. The anon key is public by design; row-level security does the guarding. */
export const supabase = createClient(url, anonKey);
