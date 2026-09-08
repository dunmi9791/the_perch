import { c } from '../theme';
import type { DayStatus } from './occupancy';
import { isoDate } from './occupancy';

export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface CalendarCell {
  key: string;
  day: number | null;
  bg: string;
  color: string;
}

export const DAY_COLORS: Record<DayStatus, { bg: string; color: string }> = {
  available: { bg: c.sageBg, color: c.sageText },
  pending: { bg: c.gold, color: c.white },
  confirmed: { bg: c.navy, color: c.white },
  blocked: { bg: '#D8D3C6', color: c.body },
};

/** Month grid for the detail page, coloured by whatever `statusFor` says holds each night. */
export function monthCells(
  statusFor: (iso: string) => DayStatus,
  now = new Date(),
): CalendarCell[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ key: `pad-${i}`, day: null, bg: 'transparent', color: 'transparent' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const { bg, color } = DAY_COLORS[statusFor(isoDate(new Date(year, month, d)))];
    cells.push({ key: `d-${d}`, day: d, bg, color });
  }
  return cells;
}

export function monthLabel(now = new Date()): string {
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** The next `count` days as { iso, label } pairs, used by the admin timeline. */
export function upcomingDays(count: number, now = new Date()): { iso: string; label: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return {
      iso: isoDate(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
    };
  });
}
