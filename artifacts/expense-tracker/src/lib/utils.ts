import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Locale used for number/date formatting. We always keep Western (Latin)
 * digits — even in Arabic — via the `-u-nu-latn` numbering-system subtag.
 */
function intlLocale(lang: string): string {
  return lang === "ar" ? "ar-u-nu-latn" : "en-US";
}

export function formatCurrency(
  amount: number,
  currency: string = "USD",
  lang: string = "en",
) {
  return new Intl.NumberFormat(intlLocale(lang), {
    style: "currency",
    currency,
  }).format(amount);
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  CAD: "CA$",
  AUD: "A$",
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? "$";
}

/** Today's date in the user's local timezone as YYYY-MM-DD. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(dateString: string, lang: string = "en") {
  if (!dateString) return "";
  const date = new Date(dateString);
  // adjust for timezone issues if needed, but since it's YYYY-MM-DD
  // we can parse it carefully.
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const [year, month, day] = dateString.split('-');
  if (year && month && day) {
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return new Intl.DateTimeFormat(intlLocale(lang), opts).format(d);
  }
  return new Intl.DateTimeFormat(intlLocale(lang), opts).format(date);
}