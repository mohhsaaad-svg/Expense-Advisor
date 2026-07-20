import { and, eq, isNull, lt, lte, or } from "drizzle-orm";
import { db, expensesTable, recurringExpensesTable } from "@workspace/db";

export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function addDays(dateStr: string, n: number): string {
  const dt = new Date(dateStr + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return toDateString(dt);
}

function daysInMonthOf(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/** k months after the anchor, clamping the day-of-month (Jan 31 + 1mo => Feb 28/29). */
export function addMonthsClamped(anchor: string, k: number): string {
  const [y, m, d] = anchor.split("-").map((p) => parseInt(p, 10));
  const total = m - 1 + k;
  const year = y + Math.floor(total / 12);
  const month0 = ((total % 12) + 12) % 12;
  const day = Math.min(d, daysInMonthOf(year, month0));
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * All occurrence dates of a rule strictly after `afterExclusive` and up to
 * `upToInclusive`, anchored at `startDate`. ISO date strings compare
 * lexicographically, so plain string comparison is safe.
 */
export function occurrencesBetween(
  frequency: Frequency,
  startDate: string,
  afterExclusive: string,
  upToInclusive: string,
  cap = 366,
): string[] {
  const out: string[] = [];
  if (upToInclusive < startDate) return out;

  if (frequency === "daily") {
    let d = startDate > afterExclusive ? startDate : addDays(afterExclusive, 1);
    while (d <= upToInclusive && out.length < cap) {
      out.push(d);
      d = addDays(d, 1);
    }
    return out;
  }

  const monthsPerStep = frequency === "quarterly" ? 3 : frequency === "yearly" ? 12 : 1;
  const step = (k: number): string =>
    frequency === "weekly" ? addDays(startDate, 7 * k) : addMonthsClamped(startDate, monthsPerStep * k);

  let k = 0;
  let d = startDate;
  while (d <= afterExclusive) {
    k += 1;
    d = step(k);
  }
  while (d <= upToInclusive && out.length < cap) {
    out.push(d);
    k += 1;
    d = step(k);
  }
  return out;
}

/**
 * Generate expenses for every active recurring rule OWNED BY `userId`, up to
 * `upTo` (inclusive). Materialization is strictly per-user: rules are
 * filtered by owner and every generated expense inherits the rule owner's
 * user_id, so one user's read can never create or touch another's data.
 * Idempotent: inserts use ON CONFLICT DO NOTHING against the unique
 * (recurring_id, date) index, and each rule tracks a high-water mark.
 * Returns the number of occurrences generated.
 */
export async function materializeDueRecurring(userId: string, upTo: string): Promise<number> {
  const rules = await db
    .select()
    .from(recurringExpensesTable)
    .where(
      and(
        eq(recurringExpensesTable.userId, userId),
        eq(recurringExpensesTable.active, true),
        lte(recurringExpensesTable.startDate, upTo),
      ),
    );

  const CAP = 366;
  let inserted = 0;
  for (const rule of rules) {
    if (rule.lastMaterializedDate && rule.lastMaterializedDate >= upTo) continue;

    const after = rule.lastMaterializedDate ?? addDays(rule.startDate, -1);
    const occurrences = occurrencesBetween(
      rule.frequency as Frequency,
      rule.startDate,
      after,
      upTo,
      CAP,
    );

    if (occurrences.length > 0) {
      await db
        .insert(expensesTable)
        .values(
          occurrences.map((date) => ({
            userId: rule.userId,
            amount: rule.amount,
            category: rule.category,
            description: rule.description,
            date,
            recurringId: rule.id,
          })),
        )
        .onConflictDoNothing({ target: [expensesTable.recurringId, expensesTable.date] });
      inserted += occurrences.length;
    }

    // Advance the high-water mark only as far as was actually processed: a
    // capped occurrence list means the window is not fully covered, so resume
    // from the last generated date on the next call instead of silently
    // skipping the remainder. The monotonic WHERE guard keeps concurrent
    // requests with an older `upTo` from regressing the mark.
    const highWater =
      occurrences.length >= CAP ? occurrences[occurrences.length - 1] : upTo;
    await db
      .update(recurringExpensesTable)
      .set({ lastMaterializedDate: highWater })
      .where(
        and(
          eq(recurringExpensesTable.id, rule.id),
          or(
            isNull(recurringExpensesTable.lastMaterializedDate),
            lt(recurringExpensesTable.lastMaterializedDate, highWater),
          ),
        ),
      );
  }
  return inserted;
}

/** Approximate monthly cost of a rule, for stats and UI hints. */
export function monthlyEquivalent(frequency: Frequency, amount: number): number {
  if (frequency === "daily") return amount * 30;
  if (frequency === "weekly") return amount * 4;
  if (frequency === "quarterly") return Math.round(amount / 3);
  if (frequency === "yearly") return Math.round(amount / 12);
  return amount;
}
