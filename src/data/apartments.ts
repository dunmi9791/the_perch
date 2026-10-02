import { useMemo } from 'react';
import type { Apartment, PricingSettings } from '../types';
import { APARTMENTS, applyRates, findApartment as findIn } from '@shared/apartments.ts';
import { DEFAULT_PRICING } from '@shared/pricing.ts';
import { getStore, useStore } from '../lib/store';

// Room descriptions come from the shared layer; rates come live from the
// `room_rates` table and are laid over them here, and tax and deposit come
// from `pricing_settings`. Until they load, the values in the code are shown.

/** Every room with its live rates. Re-renders when staff change a rate. */
export function useApartments(): Apartment[] {
  const { rates } = useStore();
  return useMemo(() => applyRates(rates), [rates]);
}

/** The rooms with live rates, outside a component. */
export function getApartments(): Apartment[] {
  return applyRates(getStore().rates);
}

/** A room by id, with live rates. Pass `list` from useApartments() inside components. */
export function findApartment(id: number | null, list: Apartment[] = getApartments()): Apartment | undefined {
  return findIn(id, list);
}

/** Live tax rate and caution deposit, or the code's values until they load. */
export function usePricing(): PricingSettings {
  return useStore().pricing ?? DEFAULT_PRICING;
}

/** The live tax rate and caution deposit, outside a component. */
export function getPricing(): PricingSettings {
  return getStore().pricing ?? DEFAULT_PRICING;
}

/** Descriptions only; use for names and photos, never for prices. */
export { APARTMENTS };
