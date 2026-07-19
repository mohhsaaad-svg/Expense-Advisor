import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface CategoryMeta {
  name: string;
  icon: IoniconName;
  color: string;
}

/**
 * Fixed category list — must stay in sync with the web app and API.
 * Colors come from the Ember chart palette (warm analogous tones).
 */
export const CATEGORIES: CategoryMeta[] = [
  { name: 'Food & Drink', icon: 'restaurant-outline', color: '#EE5C2B' },
  { name: 'Transport', icon: 'car-outline', color: '#E09952' },
  { name: 'Shopping', icon: 'bag-handle-outline', color: '#CC6633' },
  { name: 'Health', icon: 'medkit-outline', color: '#29A352' },
  { name: 'Entertainment', icon: 'film-outline', color: '#EDC95E' },
  { name: 'Housing', icon: 'home-outline', color: '#BD3B0F' },
  { name: 'Utilities', icon: 'flash-outline', color: '#F49D25' },
  { name: 'Other', icon: 'ellipsis-horizontal-circle-outline', color: '#847062' },
];

export function categoryMeta(name: string): CategoryMeta {
  return (
    CATEGORIES.find((c) => c.name === name) ?? CATEGORIES[CATEGORIES.length - 1]
  );
}

export function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateLabel(key: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (key === toDateKey(today)) return 'Today';
  if (key === toDateKey(yesterday)) return 'Yesterday';
  const [y, m, d] = key.split('-').map((p) => parseInt(p, 10));
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
