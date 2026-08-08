import type { GalleryImage } from '../types';

export type WhyStayIcon = 'shield' | 'bolt' | 'wifi' | 'pin' | 'sparkle' | 'chat';

export const WHY_STAY: { title: string; desc: string; icon: WhyStayIcon }[] = [
  {
    title: 'Serene & Secure',
    desc: 'A gated, guarded estate away from the noise of the city.',
    icon: 'shield',
  },
  { title: 'Reliable Power', desc: '24/7 backup power so your stay is never interrupted.', icon: 'bolt' },
  { title: 'Fast Wi-Fi', desc: 'Dependable connectivity for work and streaming.', icon: 'wifi' },
  { title: 'Convenient Location', desc: 'Minutes from Abuja Airport and central Abuja.', icon: 'pin' },
  {
    title: 'Attentive Housekeeping',
    desc: 'Professionally cleaned before every arrival.',
    icon: 'sparkle',
  },
  { title: 'Easy Booking Support', desc: 'Reach us anytime by phone or WhatsApp.', icon: 'chat' },
];

export const LANDMARKS = [
  { name: 'Nnamdi Azikiwe International Airport', distance: '15 mins' },
  { name: 'Lugbe Central Market', distance: '8 mins' },
  { name: 'Airport Road', distance: '5 mins' },
];

export const GALLERY_IMAGES: GalleryImage[] = [
  {
    slotId: 'gal-hornbill-2',
    category: 'bedrooms',
    caption: 'Hornbill Room',
    rowSpan: 1,
    photo: '/assets/gallery-hornbill-2.png',
  },
  {
    slotId: 'gal-hornbill-3',
    category: 'bedrooms',
    caption: 'Hornbill Room',
    rowSpan: 1,
    photo: '/assets/gallery-hornbill-3.png',
  },
  { slotId: 'gal-bed-1', category: 'bedrooms', caption: 'Master Bedroom, The Roost', rowSpan: 2 },
  { slotId: 'gal-bed-2', category: 'bedrooms', caption: 'Bedroom, The Aviary', rowSpan: 1 },
  { slotId: 'gal-living-1', category: 'living', caption: 'Living Area, The Nestled Suite', rowSpan: 1 },
  { slotId: 'gal-living-2', category: 'living', caption: 'Lounge, The Sanctuary', rowSpan: 2 },
  { slotId: 'gal-kitchen-1', category: 'kitchens', caption: 'Full Kitchen, The Aviary', rowSpan: 1 },
  { slotId: 'gal-bath-1', category: 'bathrooms', caption: 'Bathroom, The Roost', rowSpan: 1 },
  { slotId: 'gal-ext-1', category: 'exterior', caption: 'Building Exterior', rowSpan: 1 },
  { slotId: 'gal-fac-1', category: 'facilities', caption: 'Secure Parking', rowSpan: 1 },
  { slotId: 'gal-sur-1', category: 'surroundings', caption: 'River Park Estate Grounds', rowSpan: 1 },
  { slotId: 'gal-kitchen-2', category: 'kitchens', caption: 'Kitchenette, The Nest Studio', rowSpan: 1 },
];

export const GALLERY_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'bedrooms', label: 'Bedrooms' },
  { key: 'living', label: 'Living Areas' },
  { key: 'kitchens', label: 'Kitchens' },
  { key: 'bathrooms', label: 'Bathrooms' },
  { key: 'exterior', label: 'Exterior' },
  { key: 'facilities', label: 'Facilities' },
  { key: 'surroundings', label: 'Surroundings' },
];

export const FAQS = [
  {
    q: 'What time is check-in and check-out?',
    a: 'Check-in is from 2:00 PM and check-out is by 11:00 AM. Early check-in or late check-out may be arranged in advance, subject to availability.',
  },
  {
    q: 'Is a security deposit required?',
    a: 'Yes, a refundable security deposit is required for most apartments and is returned after a satisfactory check-out inspection.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept Paystack, Flutterwave, bank transfer, and pay-on-arrival where enabled for your booking.',
  },
  {
    q: 'Can I cancel or change my booking?',
    a: 'Yes. Cancellations made at least 48 hours before check-in receive a full refund. Contact us to make changes to your dates.',
  },
];

export const PAYMENT_OPTIONS = [
  { key: 'paystack', label: 'Pay with Paystack', desc: 'Secure card payment via Paystack' },
  { key: 'flutterwave', label: 'Pay with Flutterwave', desc: 'Secure card payment via Flutterwave' },
  {
    key: 'transfer',
    label: 'Bank Transfer',
    desc: 'Pay via bank transfer, upload evidence for verification',
  },
  { key: 'arrival', label: 'Pay on Arrival', desc: 'Available where enabled by management' },
] as const;

export const BANK_DETAILS = {
  bank: 'Sample Bank Plc',
  accountName: 'The Perch Apartments Ltd',
  accountNumber: '0123456789',
} as const;
