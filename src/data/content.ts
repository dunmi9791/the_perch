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
    slotId: 'gal-hornbill-main',
    category: 'bedrooms',
    caption: 'Hornbill Room',
    rowSpan: 1,
    photo: '/assets/hornbill-main.jpg',
  },
  {
    slotId: 'gal-hornbill-bedroom',
    category: 'bedrooms',
    caption: 'Hornbill Room Bedroom',
    rowSpan: 1,
    photo: '/assets/hornbill-bedroom.jpg',
  },
  {
    slotId: 'gal-hornbill-bathroom',
    category: 'bathrooms',
    caption: 'Hornbill Room Bathroom',
    rowSpan: 1,
    photo: '/assets/hornbill-bathroom.jpg',
  },
  {
    slotId: 'gal-robin-main',
    category: 'bedrooms',
    caption: 'Robin Room',
    rowSpan: 1,
    photo: '/assets/robin-main.jpg',
  },
  {
    slotId: 'gal-robin-bedroom',
    category: 'bedrooms',
    caption: 'Robin Room Bedroom',
    rowSpan: 1,
    photo: '/assets/robin-bedroom.jpg',
  },
  {
    slotId: 'gal-robin-bathroom',
    category: 'bathrooms',
    caption: 'Robin Room Bathroom',
    rowSpan: 1,
    photo: '/assets/robin-bathroom.jpg',
  },
  {
    slotId: 'gal-weaver-main',
    category: 'bedrooms',
    caption: 'Weaver Room',
    rowSpan: 1,
    photo: '/assets/weaver-main.jpg',
  },
  {
    slotId: 'gal-weaver-bedroom',
    category: 'bedrooms',
    caption: 'Weaver Room Bedroom',
    rowSpan: 1,
    photo: '/assets/weaver-bedroom.jpg',
  },
  {
    slotId: 'gal-weaver-bathroom',
    category: 'bathrooms',
    caption: 'Weaver Room Bathroom',
    rowSpan: 1,
    photo: '/assets/weaver-bathroom.jpg',
  },
  {
    slotId: 'gal-kingfisher-main',
    category: 'bedrooms',
    caption: 'Kingfisher Room',
    rowSpan: 1,
    photo: '/assets/kingfisher-main.jpg',
  },
  {
    slotId: 'gal-kingfisher-bedroom',
    category: 'bedrooms',
    caption: 'Kingfisher Room Bedroom',
    rowSpan: 1,
    photo: '/assets/kingfisher-bedroom.jpg',
  },
  {
    slotId: 'gal-kingfisher-bathroom',
    category: 'bathrooms',
    caption: 'Kingfisher Room Bathroom',
    rowSpan: 1,
    photo: '/assets/kingfisher-bathroom.jpg',
  },
  {
    slotId: 'gal-turaco-main',
    category: 'bedrooms',
    caption: 'Turaco Room',
    rowSpan: 1,
    photo: '/assets/turaco-main.jpg',
  },
  {
    slotId: 'gal-turaco-bedroom',
    category: 'bedrooms',
    caption: 'Turaco Room Bedroom',
    rowSpan: 1,
    photo: '/assets/turaco-bedroom.jpg',
  },
  {
    slotId: 'gal-turaco-bathroom',
    category: 'bathrooms',
    caption: 'Turaco Room Bathroom',
    rowSpan: 1,
    photo: '/assets/turaco-bathroom.jpg',
  },
  {
    slotId: 'gal-sunbird-main',
    category: 'bedrooms',
    caption: 'Sunbird Room',
    rowSpan: 1,
    photo: '/assets/sunbird-main.jpg',
  },
  {
    slotId: 'gal-sunbird-bedroom',
    category: 'bedrooms',
    caption: 'Sunbird Room Bedroom',
    rowSpan: 1,
    photo: '/assets/sunbird-bedroom.jpg',
  },
  {
    slotId: 'gal-sunbird-bathroom',
    category: 'bathrooms',
    caption: 'Sunbird Room Bathroom',
    rowSpan: 1,
    photo: '/assets/sunbird-bathroom.jpg',
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
