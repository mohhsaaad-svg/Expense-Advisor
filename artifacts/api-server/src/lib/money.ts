/**
 * Money helpers.
 *
 * Amounts are stored as numeric(10,2) strings in Postgres. All server-side
 * aggregation happens in integer cents so repeated float addition can never
 * drift (0.1 + 0.2 !== 0.3). Convert back to a number only at the JSON
 * boundary, where two-decimal values round-trip exactly.
 */

/** "12.34" | 12.34 -> 1234 (integer cents). */
export function toCents(amount: string | number): number {
  const n = typeof amount === "number" ? amount : parseFloat(amount);
  return Math.round(n * 100);
}

/** 1234 -> 12.34 for JSON responses. */
export function centsToNumber(cents: number): number {
  return cents / 100;
}

/** Sum a list of numeric(10,2) strings/numbers exactly, in cents. */
export function sumCents(amounts: Array<string | number>): number {
  let total = 0;
  for (const a of amounts) total += toCents(a);
  return total;
}

/**
 * Format an amount for user-facing message strings using the user's selected
 * currency. Mirrors the web client's formatCurrency (Intl, en-US locale):
 * USD -> "$12.34", EUR -> "€12.34", JPY -> "¥1,235" (no decimals).
 */
export function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    // Unknown/invalid code in stored preferences — fail soft, never crash a tips route.
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }
}
