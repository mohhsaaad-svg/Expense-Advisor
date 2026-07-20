import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { createTestUser, destroyTestUsers, type TestUser } from "./helpers";

async function addExpense(
  u: TestUser,
  amount: number,
  date: string,
  category = "food",
  description = "x",
) {
  const res = await request(app)
    .post("/api/expenses")
    .set(u.auth)
    .send({ amount, category, description, date });
  expect(res.status).toBe(201);
  return res.body;
}

describe("insights are scoped per user", () => {
  it("one user's spending never shows up in another's stats", async () => {
    const a = await createTestUser("ins-a");
    const b = await createTestUser("ins-b");
    try {
      await request(app).put("/api/budget").set(a.auth).send({ dailyLimit: 100, monthlyLimit: 3000 });
      await addExpense(a, 40, "2026-03-10");
      await addExpense(a, 60, "2026-03-11");

      const aStats = await request(app).get("/api/insights/stats").set(a.auth).query({ date: "2026-03-15" });
      const bStats = await request(app).get("/api/insights/stats").set(b.auth).query({ date: "2026-03-15" });
      expect(aStats.body.monthToDate).toBe(100);
      expect(bStats.body.monthToDate).toBe(0);
    } finally {
      await destroyTestUsers(a, b);
    }
  });
});

describe("month windows exclude the future", () => {
  it("month-to-date ignores expenses dated after the query date", async () => {
    const u = await createTestUser("ins-future");
    try {
      await request(app).put("/api/budget").set(u.auth).send({ dailyLimit: 100, monthlyLimit: 3000 });
      await addExpense(u, 40, "2026-04-05");
      await addExpense(u, 60, "2026-04-10");
      // Same month but after the query date — must not be counted.
      await addExpense(u, 500, "2026-04-25", "shopping", "future rent");

      const stats = await request(app).get("/api/insights/stats").set(u.auth).query({ date: "2026-04-15" });
      expect(stats.body.monthToDate).toBe(100);

      const tips = await request(app).get("/api/insights/tips").set(u.auth).query({ date: "2026-04-15" });
      // 100 of 3000 is nowhere near 90%, so no "monthly nearly full" alert.
      expect(tips.body.alerts.some((al: { id: string }) => al.id === "monthly-warning")).toBe(false);
    } finally {
      await destroyTestUsers(u);
    }
  });
});

describe("weekly average", () => {
  it("divides the week total by 7 calendar days, not by days with data", async () => {
    const u = await createTestUser("ins-week");
    try {
      // A single 700 expense inside one week → 700 / 7 = 100 per calendar day.
      await addExpense(u, 700, "2026-02-04", "food", "one big buy");
      const res = await request(app)
        .get("/api/expenses/summary/weekly")
        .set(u.auth)
        .query({ date: "2026-02-04" });
      expect(res.body.weekTotal).toBe(700);
      expect(res.body.dailyAverage).toBe(100);
    } finally {
      await destroyTestUsers(u);
    }
  });
});

describe("under-budget streak", () => {
  it("counts only consecutive logged, on-budget days and breaks on a gap", async () => {
    const u = await createTestUser("ins-streak");
    try {
      await request(app).put("/api/budget").set(u.auth).send({ dailyLimit: 100, monthlyLimit: 3000 });
      // Logged & under limit on Aug 10 and 11; nothing logged on Aug 9.
      await addExpense(u, 10, "2026-08-10");
      await addExpense(u, 10, "2026-08-11");

      // As of Aug 11: 11 and 10 count, Aug 9 (no data) breaks it → 2.
      const s1 = await request(app).get("/api/insights/stats").set(u.auth).query({ date: "2026-08-11" });
      expect(s1.body.underBudgetStreak).toBe(2);

      // As of Aug 12 (nothing logged that day): the newest day has no data, so
      // the streak is 0 — an idle tracker can't accrue a streak.
      const s2 = await request(app).get("/api/insights/stats").set(u.auth).query({ date: "2026-08-12" });
      expect(s2.body.underBudgetStreak).toBe(0);
    } finally {
      await destroyTestUsers(u);
    }
  });

  it("a day over the daily limit breaks the streak", async () => {
    const u = await createTestUser("ins-streak2");
    try {
      await request(app).put("/api/budget").set(u.auth).send({ dailyLimit: 100, monthlyLimit: 3000 });
      await addExpense(u, 250, "2026-08-20"); // over limit
      const s = await request(app).get("/api/insights/stats").set(u.auth).query({ date: "2026-08-20" });
      expect(s.body.underBudgetStreak).toBe(0);
    } finally {
      await destroyTestUsers(u);
    }
  });
});

describe("currency formatting in generated messages", () => {
  it("uses the user's configured currency, not a hardcoded dollar sign", async () => {
    const u = await createTestUser("ins-cur");
    try {
      await request(app).put("/api/budget").set(u.auth).send({ dailyLimit: 100, monthlyLimit: 2000 });
      await request(app).put("/api/preferences").set(u.auth).send({ currency: "EUR", alertThreshold: 80 });
      await addExpense(u, 250, "2026-09-15", "food", "over budget");

      const res = await request(app).get("/api/insights/tips").set(u.auth).query({ date: "2026-09-15" });
      const over = res.body.alerts.find((a: { id: string }) => a.id === "daily-over");
      expect(over).toBeTruthy();
      expect(over.message).toContain("€");
      expect(over.message).not.toContain("$");
    } finally {
      await destroyTestUsers(u);
    }
  });
});

describe("recurring materialization isolation", () => {
  it("only creates expenses for the rule's owner", async () => {
    const owner = await createTestUser("mat-owner");
    const other = await createTestUser("mat-other");
    try {
      await request(app)
        .post("/api/recurring")
        .set(owner.auth)
        .send({
          description: "coffee",
          amount: 5,
          category: "coffee",
          frequency: "daily",
          startDate: "2026-07-01",
        });

      // Owner's read materializes their own occurrences (recurringId set).
      const ownerList = await request(app)
        .get("/api/expenses")
        .set(owner.auth)
        .query({ startDate: "2026-07-01", endDate: "2026-07-05" });
      const materialized = ownerList.body.filter((e: { recurringId: number | null }) => e.recurringId !== null);
      expect(materialized.length).toBeGreaterThan(0);

      // The other user's read triggers their own materialization and must see
      // nothing from the owner's rule.
      const otherList = await request(app).get("/api/expenses").set(other.auth);
      expect(otherList.body.length).toBe(0);
    } finally {
      await destroyTestUsers(owner, other);
    }
  });
});

describe("salary-cycle budgeting", () => {
  it("anchors stats to payday and maps quarterly obligations into the cycle", async () => {
    const u = await createTestUser("ins-cycle");
    try {
      // Salary lands on the 25th → on June 10 the cycle is May 25 – Jun 24.
      const put = await request(app)
        .put("/api/budget")
        .set(u.auth)
        .send({ dailyLimit: 100, monthlyLimit: 3000, salaryAmount: 1500, salaryDay: 25 });
      expect(put.status).toBe(200);
      expect(put.body.salaryAmount).toBe(1500);
      expect(put.body.salaryDay).toBe(25);

      // In-cycle spend (May 28) counts; pre-cycle spend (May 20) must not.
      await addExpense(u, 50, "2026-05-20");
      await addExpense(u, 80, "2026-05-28");

      // Quarterly rent anchored Mar 15 → occurrence Jun 15, inside the cycle and after Jun 10.
      const rec = await request(app)
        .post("/api/recurring")
        .set(u.auth)
        .send({ amount: 900, category: "Housing", description: "Quarterly rent", frequency: "quarterly", startDate: "2026-06-15" });
      expect(rec.status).toBe(201);

      const stats = await request(app).get("/api/insights/stats").set(u.auth).query({ date: "2026-06-10" });
      expect(stats.body.cycleAnchored).toBe(true);
      expect(stats.body.cycleStart).toBe("2026-05-25");
      expect(stats.body.cycleEnd).toBe("2026-06-24");
      expect(stats.body.nextPayday).toBe("2026-06-25");
      expect(stats.body.daysUntilPayday).toBe(15);
      expect(stats.body.daysInMonth).toBe(31); // cycle length May 25 – Jun 24
      expect(stats.body.daysElapsed).toBe(17);
      expect(stats.body.monthToDate).toBe(80);
      expect(stats.body.salaryAmount).toBe(1500);
      expect(stats.body.committedRemaining).toBe(900);
      expect(stats.body.upcomingObligations[0]).toMatchObject({
        description: "Quarterly rent",
        amount: 900,
        date: "2026-06-15",
        frequency: "quarterly",
      });
    } finally {
      await destroyTestUsers(u);
    }
  });

  it("falls back to the calendar month when no salary day is set", async () => {
    const u = await createTestUser("ins-nocycle");
    try {
      await request(app).put("/api/budget").set(u.auth).send({ dailyLimit: 100, monthlyLimit: 3000 });
      const stats = await request(app).get("/api/insights/stats").set(u.auth).query({ date: "2026-06-10" });
      expect(stats.body.cycleAnchored).toBe(false);
      expect(stats.body.cycleStart).toBe("2026-06-01");
      expect(stats.body.cycleEnd).toBe("2026-06-30");
      expect(stats.body.nextPayday).toBeNull();
    } finally {
      await destroyTestUsers(u);
    }
  });
});

describe("salary fields round-trip", () => {
  it("sets, then clears to null, and stats falls back to calendar month", async () => {
    const u = await createTestUser("ins-roundtrip");
    try {
      const set = await request(app)
        .put("/api/budget")
        .set(u.auth)
        .send({ dailyLimit: 100, monthlyLimit: 3000, salaryAmount: 1200, salaryDay: 28 });
      expect(set.body.salaryAmount).toBe(1200);
      expect(set.body.salaryDay).toBe(28);

      let stats = await request(app).get("/api/insights/stats").set(u.auth).query({ date: "2026-02-10" });
      expect(stats.body.cycleAnchored).toBe(true);
      expect(stats.body.cycleStart).toBe("2026-01-28");
      // Feb has 28 days, so payday day-28 stays as-is.
      expect(stats.body.nextPayday).toBe("2026-02-28");

      const clear = await request(app)
        .put("/api/budget")
        .set(u.auth)
        .send({ dailyLimit: 100, monthlyLimit: 3000, salaryAmount: null, salaryDay: null });
      expect(clear.status).toBe(200);
      expect(clear.body.salaryAmount).toBeNull();
      expect(clear.body.salaryDay).toBeNull();

      stats = await request(app).get("/api/insights/stats").set(u.auth).query({ date: "2026-02-10" });
      expect(stats.body.cycleAnchored).toBe(false);
      expect(stats.body.cycleStart).toBe("2026-02-01");
      expect(stats.body.salaryAmount).toBeNull();
    } finally {
      await destroyTestUsers(u);
    }
  });
});
