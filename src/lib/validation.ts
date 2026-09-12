// Validation is shared with the create-booking edge function; the implementation lives in the shared layer.
export { fitsCapacity, guestError, stayError, totalGuests } from '@shared/validation.ts';
