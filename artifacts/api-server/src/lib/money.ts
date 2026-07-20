/**
 * Money helpers.
 *
 * Amounts are stored as numeric(12,3) strings in Postgres so 3-decimal
 * currencies (JOD, KWD, BHD) round-trip exactly. All server-side aggregation
 * happens in integer MILLS (thousandths) so repeated float addition can never
 * drift (0.1 + 0.2 !== 0.3). Convert back to a number only at the JSON
 * boundary, where three-decimal values round-trip exactly (n / 1000 is exact
 * for |n| < 2^53 / 1000).
 */

/** Currencies with 3 minor-unit digits. Everything else renders per Intl. */
const THREE_DECIMAL_CURRENCIES = new Set(["JOD", "KWD", "BHD", "OMR", "TND"]);

/** Minor-unit digits used when formatting/rounding for a currency. */
export function currencyDecimals(currency: string): number {
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return 3;
  if (currency === "JPY" || currency === "KRW") return 0;
  return 2;
}

/** "12.345" | 12.345 -> 12345 (integer mills, i.e. thousandths). */
export function toMills(amount: string | number): number {
  const n = typeof amount === "number" ? amount : parseFloat(amount);
  return Math.round(n * 1000);
}

/** 12345 mills -> 12.345 for JSON responses. */
export function millsToNumber(mills: number): number {
  return mills / 1000;
}

/** Sum a list of numeric(12,3) strings/numbers exactly, in mills. */
export function sumMills(amounts: Array<string | number>): number {
  let total = 0;
  for (const a of amounts) total += toMills(a);
  return total;
}

/** 12345 mills -> "12.345" DB string (numeric(12,3) column value). */
export function millsToDbString(mills: number): string {
  const sign = mills < 0 ? "-" : "";
  const abs = Math.abs(mills);
  return `${sign}${Math.floor(abs / 1000)}.${String(abs % 1000).padStart(3, "0")}`;
}

/**
 * Format an amount (in mills) for user-facing message strings using the
 * user's selected currency. Mirrors the web client's formatCurrency (Intl,
 * en-US locale): USD -> "$12.34", JOD -> "JOD 12.345", JPY -> "¥1,235".
 */
export function formatMoney(mills: number, currency: string): string {
  const amount = mills / 1000;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    // Unknown/invalid code in stored preferences — fail soft, never crash a tips route.
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }
}
