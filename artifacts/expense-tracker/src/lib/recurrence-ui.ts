/** Client-side recurrence helpers (display only — the server is authoritative). */

export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export function addDays(dateStr: string, n: number): string {
  const dt = new Date(dateStr + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().split("T")[0];
}

function daysInMonthOf(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

export function addMonthsClamped(anchor: string, k: number): string {
  const [y, m, d] = anchor.split("-").map((p) => parseInt(p, 10));
  const total = m - 1 + k;
  const year = y + Math.floor(total / 12);
  const month0 = ((total % 12) + 12) % 12;
  const day = Math.min(d, daysInMonthOf(year, month0));
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** First occurrence strictly after `after` (occurrences up to today are already logged). */
export function nextOccurrence(frequency: string, startDate: string, after: string): string {
  if (frequency === "daily") {
    return startDate > after ? startDate : addDays(after, 1);
  }
  const monthsPerStep = frequency === "quarterly" ? 3 : frequency === "yearly" ? 12 : 1;
  const step = (k: number) =>
    frequency === "weekly" ? addDays(startDate, 7 * k) : addMonthsClamped(startDate, monthsPerStep * k);
  let k = 0;
  let d = startDate;
  while (d <= after && k < 5000) {
    k += 1;
    d = step(k);
  }
  return d;
}

/** Approximate monthly cost of a rule (mirrors the server's estimate). */
export function monthlyEquivalent(frequency: string, amount: number): number {
  if (frequency === "daily") return amount * 30;
  if (frequency === "weekly") return amount * 4;
  if (frequency === "quarterly") return Math.round((amount / 3) * 100) / 100;
  if (frequency === "yearly") return Math.round((amount / 12) * 100) / 100;
  return amount;
}

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};
