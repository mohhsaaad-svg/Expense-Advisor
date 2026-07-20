import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Canonical category ids — the English names stored in the API/DB and shared
 * with the web app. This union is the single source of truth: adding a category
 * here forces an Arabic label (see AR_CATEGORY_NAMES in lib/i18n.tsx) via an
 * exhaustive Record, so a missing translation breaks `tsc`.
 */
export const CATEGORY_NAMES = [
  'Food & Drink',
  'Transport',
  'Shopping',
  'Health',
  'Entertainment',
  'Housing',
  'Utilities',
  'Remittances',
  'Family support',
  'Installments',
  'Other',
] as const;

export type CategoryName = (typeof CATEGORY_NAMES)[number];

export interface CategoryMeta {
  name: CategoryName;
  icon: IoniconName;
  color: string;
}

/**
 * Fixed category list — names must stay in sync (exact string equality) with
 * the web app's canonical list in
 * artifacts/expense-tracker/src/lib/categories.ts. Server-side challenge
 * violation counting compares these strings exactly, so drift breaks it.
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
  { name: 'Remittances', icon: 'paper-plane-outline', color: '#3E7CB1' },
  { name: 'Family support', icon: 'people-outline', color: '#8E5BA6' },
  { name: 'Installments', icon: 'card-outline', color: '#5B8A72' },
  { name: 'Other', icon: 'ellipsis-horizontal-circle-outline', color: '#847062' },
];

export function categoryMeta(name: string): CategoryMeta {
  return (
    CATEGORIES.find((c) => c.name === name) ?? CATEGORIES[CATEGORIES.length - 1]
  );
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'A$',
};

export function currencySymbol(currency: string = 'USD'): string {
  return CURRENCY_SYMBOLS[currency] ?? '$';
}

export type Lang = 'en' | 'ar';

/**
 * DIGITS DECISION: numbers stay in Western (Latin) digits even in Arabic.
 * We use the "ar-u-nu-latn" locale so month/day names render in Arabic while
 * the digits stay Latin. Money amounts, dates and percentages must remain
 * Latin per product requirement. Everything is wrapped in try/catch because
 * some Hermes/ICU builds don't ship the Arabic locale data.
 */
function intlLocale(lang: Lang): string {
  return lang === 'ar' ? 'ar-u-nu-latn' : 'en-US';
}

export function formatMoney(
  n: number,
  currency: string = 'USD',
  lang: Lang = 'en',
): string {
  const decimals = currency === 'JPY' ? 0 : 2;
  try {
    return new Intl.NumberFormat(intlLocale(lang), {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  } catch {
    // Fallback: our own symbol + Latin-digit amount.
    return `${currencySymbol(currency)}${n.toFixed(decimals)}`;
  }
}

export function formatPercent(n: number, lang: Lang = 'en'): string {
  const rounded = Math.round(n);
  return lang === 'ar' ? `${rounded}٪` : `${rounded}%`;
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateLabel(key: string, lang: Lang = 'en'): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (key === toDateKey(today)) return lang === 'ar' ? 'اليوم' : 'Today';
  if (key === toDateKey(yesterday))
    return lang === 'ar' ? 'أمس' : 'Yesterday';
  const [y, m, d] = key.split('-').map((p) => parseInt(p, 10));
  const dt = new Date(y, m - 1, d);
  try {
    return dt.toLocaleDateString(intlLocale(lang), {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dt.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
}

/** Longer date used for goal deadlines & challenge start dates. */
export function fullDayLabel(key: string, lang: Lang = 'en'): string {
  const [y, m, d] = key.split('-').map((p) => parseInt(p, 10));
  const dt = new Date(y, m - 1, d);
  try {
    return dt.toLocaleDateString(intlLocale(lang), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
