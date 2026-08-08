import { c } from '../theme';

export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface CalendarCell {
  key: string;
  day: number | null;
  bg: string;
  color: string;
}

/**
 * Illustrative month grid for the detail page. Reserved/confirmed/blocked days
 * are hard-coded dates — swap this for real occupancy once a backend exists.
 */
const RESERVED = new Set([5, 12, 19]);
const CONFIRMED = new Set([8, 9, 15, 16]);
const BLOCKED = new Set([22, 23]);

export function monthCells(now = new Date()): CalendarCell[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ key: `pad-${i}`, day: null, bg: 'transparent', color: 'transparent' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    let bg: string = c.sageBg;
    let color: string = c.sageText;
    if (RESERVED.has(d)) {
      bg = c.gold;
      color = c.white;
    } else if (CONFIRMED.has(d)) {
      bg = c.navy;
      color = c.white;
    } else if (BLOCKED.has(d)) {
      bg = '#D8D3C6';
      color = c.body;
    }
    cells.push({ key: `d-${d}`, day: d, bg, color });
  }
  return cells;
}

export function monthLabel(now = new Date()): string {
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Day-of-month labels for the next `count` days, used by the admin timeline. */
export function upcomingDayLabels(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString('en-US', { day: 'numeric' });
  });
}
