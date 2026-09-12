import { createClient } from 'npm:@supabase/supabase-js@2';

/** A client with the service role: bypasses row-level security, so only server code may hold it. */
export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
