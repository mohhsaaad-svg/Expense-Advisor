import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { createTestUser, destroyTestUsers, type TestUser } from "./helpers";
import { payCycleFor } from "../lib/safe-to-spend";
import { toMills, millsToNumber, sumMills, millsToDbString, formatMoney, currencyDecimals } from "../lib/money";

async function addExpense(u: TestUser, amount: number, date: string, category = "food", description = "x") {
  const res = await request(app).post("/api/expenses").set(u.auth).send({ amount, category, description, date });
  expect(res.status).toBe(201);
  return res.body;
}

describe("money helpers — 3-decimal precision", () => {
  it("round-trips thousandths exactly", () => {
    expect(toMills("12.345")).toBe(12345);
    expect(toMills(0.001)).toBe(1);
    expect(millsToNumber(12345)).toBe(12.345);
    expect(sumMills(["0.001", "0.002", 0.003])).toBe(6);
    expect(millsToDbString(12345)).toBe("12.345");
    expect(millsToDbString(5)).toBe("0.005");
  });
  it("knows currency exponents", () => {
    expect(currencyDecimals("JOD")).toBe(3);
    expect(currencyDecimals("KWD")).toBe(3);
    expect(currencyDecimals("BHD")).toBe(3);
    expect(currencyDecimals("USD")).toBe(2);
    expect(currencyDecimals("JPY")).toBe(0);
    expect(formatMoney(12345, "JOD")).toContain("12.345");
  });
});

describe("pay cycle boundaries", () => {
  it("uses the most recent salary day and clamps short months", () => {
    expect(payCycleFor("2026-03-15", 25)).toEqual({ cycleStart: "2026-02-25", nextPayday: "2026-03-25" });
    expect(payCycleFor("2026-03-25", 25)).toEqual({ cycleStart: "2026-03-25", nextPayday: "2026-04-25" });
    // Day 31 clamps: Feb cycle start lands on Feb 28 in 2026.
    expect(payCycleFor("2026-03-05", 31)).toEqual({ cycleStart: "2026-02-28", nextPayday: "2026-03-31" });
    // Year boundary.
    expect(payCycleFor("2026-01-02", 25)).toEqual({ cycleStart: "2025-12-25", nextPayday: "2026-01-25" });
  });
});

describe("GET /insights/safe-to-spend", () => {
  it("is unconfigured until salary and payday are set", async () => {
    const u = await createTestUser("sts-uncfg");
    try {
      const res = await request(app).get("/api/insights/safe-to-spend").set(u.auth).query({ date: "2026-06-10" });
      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
      expect(res.body.safeToSpend).toBeNull();
    } finally {
      await destroyTestUsers(u);
    }
  });

  it("computes salary − spent − upcoming commitments − goal buffers, at 3-decimal precision", async () => {
    const u = await createTestUser("sts-math");
    try {
      // Salary 850.500 JOD-style amount, landing on the 25th.
      const put = await request(app)
        .put("/api/budget")
        .set(u.auth)
        .send({ dailyLimit: 30, monthlyLimit: 900, salaryAmount: 850.5, salaryDay: 25 });
      expect(put.status).toBe(200);
      expect(put.body.salaryAmount).toBe(850.5);
      expect(put.body.salaryDay).toBe(25);

      // Spent this cycle (cycle: 2026-05-25 .. query date 2026-06-10): 10.125 + 5.375 = 15.500
      await addExpense(u, 10.125, "2026-05-28");
      await addExpense(u, 5.375, "2026-06-01");
      // Outside the cycle — before payday — must not count.
      await addExpense(u, 99, "2026-05-20");

      // Recurring rule due before next payday (monthly on the 15th): 12.250
      const rec = await request(app)
        .post("/api/recurring")
        .set(u.auth)
        .send({ description: "Internet", amount: 12.25, category: "bills", frequency: "monthly", startDate: "2026-01-15" });
      expect(rec.status).toBe(201);

      // Goal with a deadline 2 cycles away: remaining 100.000 → 50.000 per cycle.
      const goal = await request(app)
        .post("/api/goals")
        .set(u.auth)
        .send({ name: "Eid gifts", targetAmount: 150, deadline: "2026-08-10" });
      expect(goal.status).toBe(201);
      await request(app).post(`/api/goals/${goal.body.id}/contribute`).set(u.auth).send({ amount: 50 });

      const res = await request(app).get("/api/insights/safe-to-spend").set(u.auth).query({ date: "2026-06-10" });
      expect(res.status).toBe(200);
      const b = res.body;
      expect(b.configured).toBe(true);
      expect(b.cycleStart).toBe("2026-05-25");
      expect(b.nextPayday).toBe("2026-06-25");
      expect(b.daysUntilPayday).toBe(15);
      expect(b.salary).toBe(850.5);
      // 10.125 + 5.375 + the materialized recurring hits on 5/15? No: 5/15 is
      // before cycleStart? cycle starts 5/25 — but recurring materializes past
      // occurrences as real expenses. The 6/15 occurrence is upcoming (after
      // 6/10), 5/15 is outside the cycle. Materialized 5/15 & earlier fall
      // before cycleStart, 6/15 is future so not materialized into spent.
      expect(b.spentThisCycle).toBe(15.5);
      expect(b.upcomingCommitments).toEqual([{ description: "Internet", amount: 12.25, dueDate: "2026-06-15" }]);
      expect(b.upcomingCommitmentsTotal).toBe(12.25);
      expect(b.goalBuffers).toEqual([{ name: "Eid gifts", amount: 50, deadline: "2026-08-10" }]);
      expect(b.goalBuffersTotal).toBe(50);
      // 850.500 − 15.500 − 12.250 − 50.000 = 772.750
      expect(b.safeToSpend).toBe(772.75);
      // Floored to whole mills: 772750 / 15 = 51516.66 → 51.516
      expect(b.safePerDay).toBe(51.516);
    } finally {
      await destroyTestUsers(u);
    }
  });

  it("reserves per-payday amounts for open-ended goals, capped at remaining", async () => {
    const u = await createTestUser("sts-perpay");
    try {
      await request(app)
        .put("/api/budget")
        .set(u.auth)
        .send({ dailyLimit: 30, monthlyLimit: 900, salaryAmount: 1000, salaryDay: 25 });

      // Open-ended goal: no deadline, 25.500 set aside each payday.
      const rainy = await request(app)
        .post("/api/goals")
        .set(u.auth)
        .send({ name: "Rainy day", targetAmount: 500, perPaydayAmount: 25.5 });
      expect(rainy.status).toBe(201);
      expect(rainy.body.perPaydayAmount).toBe(25.5);

      // Nearly-funded goal: remaining 2.000 caps the 50 per-payday reservation.
      const nearly = await request(app)
        .post("/api/goals")
        .set(u.auth)
        .send({ name: "Nearly done", targetAmount: 100, perPaydayAmount: 50 });
      await request(app).post(`/api/goals/${nearly.body.id}/contribute`).set(u.auth).send({ amount: 98 });

      // Deadline goal (2 cycles → 50/cycle) with a smaller per-payday: larger wins.
      const both = await request(app)
        .post("/api/goals")
        .set(u.auth)
        .send({ name: "Eid", targetAmount: 100, deadline: "2026-08-10", perPaydayAmount: 10 });
      expect(both.status).toBe(201);

      const res = await request(app).get("/api/insights/safe-to-spend").set(u.auth).query({ date: "2026-06-10" });
      expect(res.status).toBe(200);
      expect(res.body.goalBuffers).toEqual([
        { name: "Rainy day", amount: 25.5, deadline: null },
        { name: "Nearly done", amount: 2, deadline: null },
        { name: "Eid", amount: 50, deadline: "2026-08-10" },
      ]);
      expect(res.body.goalBuffersTotal).toBe(77.5);

      // Clearing the per-payday amount removes the reservation.
      const patch = await request(app)
        .patch(`/api/goals/${rainy.body.id}`)
        .set(u.auth)
        .send({ perPaydayAmount: null });
      expect(patch.status).toBe(200);
      expect(patch.body.perPaydayAmount).toBeNull();
      const after = await request(app).get("/api/insights/safe-to-spend").set(u.auth).query({ date: "2026-06-10" });
      expect(after.body.goalBuffers.map((g: { name: string }) => g.name)).toEqual(["Nearly done", "Eid"]);
    } finally {
      await destroyTestUsers(u);
    }
  });

  it("stores and returns 3-decimal amounts exactly end to end", async () => {
    const u = await createTestUser("sts-3dp");
    try {
      const created = await addExpense(u, 0.125, "2026-06-02", "food", "falafel");
      expect(created.amount).toBe(0.125);
      const fetched = await request(app).get(`/api/expenses/${created.id}`).set(u.auth);
      expect(fetched.body.amount).toBe(0.125);
      const daily = await request(app)
        .get("/api/expenses/summary/daily")
        .set(u.auth)
        .query({ date: "2026-06-02" });
      expect(daily.body.totalSpent).toBe(0.125);
    } finally {
      await destroyTestUsers(u);
    }
  });

  it("never leaks another user's data into the breakdown", async () => {
    const a = await createTestUser("sts-a");
    const b = await createTestUser("sts-b");
    try {
      await request(app).put("/api/budget").set(a.auth).send({ dailyLimit: 30, monthlyLimit: 900, salaryAmount: 1000, salaryDay: 1 });
      await request(app).put("/api/budget").set(b.auth).send({ dailyLimit: 30, monthlyLimit: 900, salaryAmount: 1000, salaryDay: 1 });
      await addExpense(a, 200, "2026-06-05");
      const res = await request(app).get("/api/insights/safe-to-spend").set(b.auth).query({ date: "2026-06-10" });
      expect(res.body.spentThisCycle).toBe(0);
      expect(res.body.safeToSpend).toBe(1000);
    } finally {
      await destroyTestUsers(a, b);
    }
  });
});
