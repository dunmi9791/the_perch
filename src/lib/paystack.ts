/**
 * Paystack Popup (inline.js v2). Loaded only when a guest reaches payment,
 * and driven with an access code the server obtained, so the page never
 * needs a Paystack key of its own.
 */

interface PaystackCallbacks {
  onSuccess?: (tx: { reference: string }) => void;
  onCancel?: () => void;
  onError?: (err: unknown) => void;
  onLoad?: () => void;
}

interface PaystackPopup {
  resumeTransaction(accessCode: string, callbacks?: PaystackCallbacks): void;
}

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopup;
  }
}

const SCRIPT_SRC = 'https://js.paystack.co/v2/inline.js';
let loading: Promise<void> | null = null;

export function loadPaystack(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.PaystackPop ? resolve() : reject(new Error('Paystack did not initialise.')));
    script.onerror = () => {
      loading = null;
      reject(new Error('Could not load Paystack. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export type PopupOutcome = 'success' | 'closed';

/**
 * Opens the popup for an already-initialised transaction and resolves when
 * the guest finishes or closes it. The result is only a hint: the caller must
 * still verify with the server before treating the booking as paid.
 */
export async function openPaystack(accessCode: string): Promise<PopupOutcome> {
  await loadPaystack();
  const Popup = window.PaystackPop;
  if (!Popup) throw new Error('Paystack is unavailable.');
  return new Promise<PopupOutcome>((resolve, reject) => {
    let settled = false;
    const done = (outcome: PopupOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };
    try {
      new Popup().resumeTransaction(accessCode, {
        onSuccess: () => done('success'),
        onCancel: () => done('closed'),
        onError: (err) => {
          if (settled) return;
          settled = true;
          reject(err instanceof Error ? err : new Error('Paystack reported an error.'));
        },
      });
    } catch (err) {
      if (!settled) {
        settled = true;
        reject(err instanceof Error ? err : new Error('Could not open Paystack.'));
      }
    }
  });
}
