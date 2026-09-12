/**
 * Paystack REST client for the edge functions. The secret key never leaves
 * the server; the browser only ever sees an access code.
 */

const BASE = 'https://api.paystack.co';

function secretKey(): string {
  const key = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set');
  return key;
}

export interface PaystackTransaction {
  id: number;
  status: 'success' | 'failed' | 'abandoned' | 'reversed' | 'ongoing' | 'pending' | 'processing' | 'queued' | string;
  reference: string;
  /** Kobo. */
  amount: number;
  currency: string;
  channel: string | null;
  paid_at: string | null;
  gateway_response?: string;
  customer?: { email?: string };
  metadata?: Record<string, unknown> | string | null;
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => null)) as PaystackEnvelope<T> | null;
  if (!res.ok || !body || body.status !== true) {
    throw new Error(`Paystack ${path} failed: ${res.status} ${body?.message ?? res.statusText}`);
  }
  return body.data;
}

export interface InitializeInput {
  email: string;
  amountKobo: number;
  reference: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
}

export function initializeTransaction(input: InitializeInput) {
  return call<{ authorization_url: string; access_code: string; reference: string }>(
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        currency: 'NGN',
        reference: input.reference,
        metadata: input.metadata,
        channels: input.channels,
      }),
    },
  );
}

export function verifyTransaction(reference: string) {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Webhooks are signed with HMAC-SHA512 of the raw body using the secret key. */
export async function verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey()),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  return timingSafeEqual(hex(mac), signature.toLowerCase());
}
