import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Domain code shared with the Supabase edge functions.
      '@shared': new URL('./supabase/functions/_shared', import.meta.url).pathname,
    },
  },
});
