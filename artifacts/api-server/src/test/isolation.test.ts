import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { createTestUser, destroyTestUsers, type TestUser } from "./helpers";

// Two long-lived users for the cross-user matrix. "A owns it, B is denied."
let A: TestUser;
let B: TestUser;

beforeAll(async () => {
  A = await createTestUser("iso-a");
  B = await createTestUser("iso-b");
});

afterAll(async () => {
  await destroyTestUsers(A, B);
});

describe("authentication gate", () => {
  const endpoints: Array<{ method: "get" | "post" | "put"; path: string }> = [
    { method: "get", path: "/api/expenses" },
    { method: "post", path: "/api/expenses" },
    { method: "get", path: "/api/budget" },
    { method: "put", path: "/api/budget" },
    { method: "get", path: "/api/preferences" },
    { method: "put", path: "/api/preferences" },
    { method: "get", path: "/api/recurring" },
    { method: "get", path: "/api/goals" },
    { method: "get", path: "/api/challenges" },
    { method: "get", path: "/api/insights/stats" },
    { method: "get", path: "/api/insights/tips" },
    { method: "get", path: "/api/expenses/summary/daily" },
    { method: "get", path: "/api/expenses/summary/weekly" },
    { method: "get", path: "/api/anthropic/conversations" },
  ];

  for (const { method, path } of endpoints) {
    it(`rejects ${method.toUpperCase()} ${path} with 401`, async () => {
      const res = await (request(app) as unknown as Record<string, (p: string) => Promise<{ status: number }>>)[
        method
      ](path);
      expect(res.status).toBe(401);
    });
  }

  it("rejects an unknown bearer token with 401", async () => {
    const res = await request(app).get("/api/expenses").set("Authorization", "Bearer does-not-exist");
    expect(res.status).toBe(401);
  });
});

describe("expenses isolation", () => {
  it("B cannot list, read, update, or delete A's expense", async () => {
    const created = await request(app)
      .post("/api/expenses")
      .set(A.auth)
      .send({ amount: 12.5, category: "food", description: "A lunch", date: "2026-05-10" });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const bList = await request(app).get("/api/expenses").set(B.auth);
    expect(bList.status).toBe(200);
    expect(bList.body.some((e: { id: number }) => e.id === id)).toBe(false);

    expect((await request(app).get(`/api/expenses/${id}`).set(B.auth)).status).toBe(404);
    expect(
      (await request(app).patch(`/api/expenses/${id}`).set(B.auth).send({ amount: 1 })).status,
    ).toBe(404);
    expect((await request(app).delete(`/api/expenses/${id}`).set(B.auth)).status).toBe(404);

    // A's record is untouched by B's attempts.
    const aRead = await request(app).get(`/api/expenses/${id}`).set(A.auth);
    expect(aRead.status).toBe(200);
    expect(aRead.body.amount).toBe(12.5);
  });
});

describe("budget isolation", () => {
  it("each user reads and writes an independent budget row", async () => {
    await request(app).put("/api/budget").set(A.auth).send({ dailyLimit: 50, monthlyLimit: 1500 });
    await request(app).put("/api/budget").set(B.auth).send({ dailyLimit: 77, monthlyLimit: 999 });

    const a = await request(app).get("/api/budget").set(A.auth);
    const b = await request(app).get("/api/budget").set(B.auth);
    expect(a.body.dailyLimit).toBe(50);
    expect(a.body.monthlyLimit).toBe(1500);
    expect(b.body.dailyLimit).toBe(77);
    expect(b.body.monthlyLimit).toBe(999);
    expect(a.body.id).not.toBe(b.body.id);
  });
});

describe("preferences isolation", () => {
  it("each user reads and writes an independent preferences row", async () => {
    await request(app).put("/api/preferences").set(A.auth).send({ currency: "GBP", alertThreshold: 60 });
    await request(app).put("/api/preferences").set(B.auth).send({ currency: "JPY", alertThreshold: 95 });

    const a = await request(app).get("/api/preferences").set(A.auth);
    const b = await request(app).get("/api/preferences").set(B.auth);
    expect(a.body.currency).toBe("GBP");
    expect(a.body.alertThreshold).toBe(60);
    expect(b.body.currency).toBe("JPY");
    expect(b.body.alertThreshold).toBe(95);
    expect(a.body.id).not.toBe(b.body.id);
  });
});

describe("recurring isolation", () => {
  it("B cannot list, patch, or delete A's recurring rule", async () => {
    const created = await request(app)
      .post("/api/recurring")
      .set(A.auth)
      .send({
        description: "A netflix",
        amount: 15,
        category: "subscriptions",
        frequency: "monthly",
        startDate: "2026-05-01",
      });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const bList = await request(app).get("/api/recurring").set(B.auth);
    expect(bList.body.some((r: { id: number }) => r.id === id)).toBe(false);
    expect(
      (await request(app).patch(`/api/recurring/${id}`).set(B.auth).send({ amount: 1 })).status,
    ).toBe(404);
    expect((await request(app).delete(`/api/recurring/${id}`).set(B.auth)).status).toBe(404);
  });
});

describe("goals isolation", () => {
  it("B cannot list, patch, contribute to, or delete A's goal", async () => {
    const created = await request(app)
      .post("/api/goals")
      .set(A.auth)
      .send({ name: "A vacation", targetAmount: 1000 });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const bList = await request(app).get("/api/goals").set(B.auth);
    expect(bList.body.some((g: { id: number }) => g.id === id)).toBe(false);
    expect((await request(app).patch(`/api/goals/${id}`).set(B.auth).send({ name: "hacked" })).status).toBe(404);
    expect(
      (await request(app).post(`/api/goals/${id}/contribute`).set(B.auth).send({ amount: 50 })).status,
    ).toBe(404);
    expect((await request(app).delete(`/api/goals/${id}`).set(B.auth)).status).toBe(404);

    // Confirm B's failed contribute did not move A's savedAmount.
    const aList = await request(app).get("/api/goals").set(A.auth);
    const goal = aList.body.find((g: { id: number }) => g.id === id);
    expect(goal.name).toBe("A vacation");
    expect(goal.savedAmount).toBe(0);
  });
});

describe("challenges isolation", () => {
  it("B cannot list or delete A's challenge", async () => {
    const created = await request(app)
      .post("/api/challenges")
      .set(A.auth)
      .send({ name: "A no coffee", category: "coffee", startDate: "2026-05-01", durationDays: 30 });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const bList = await request(app).get("/api/challenges").set(B.auth);
    expect(bList.body.some((c: { id: number }) => c.id === id)).toBe(false);
    expect((await request(app).delete(`/api/challenges/${id}`).set(B.auth)).status).toBe(404);
  });

  it("only the owner's own expenses can break their no-spend challenge", async () => {
    const created = await request(app)
      .post("/api/challenges")
      .set(A.auth)
      .send({ name: "A no food", category: "food", startDate: "2026-06-01", durationDays: 10 });
    const id = created.body.id;

    // B spends on the blocked category inside the window — must not count.
    await request(app)
      .post("/api/expenses")
      .set(B.auth)
      .send({ amount: 20, category: "food", description: "B food", date: "2026-06-02" });

    const aList = await request(app).get("/api/challenges").set(A.auth).query({ today: "2026-06-03" });
    const challenge = aList.body.find((c: { id: number }) => c.id === id);
    expect(challenge.violations).toBe(0);
    expect(challenge.status).toBe("active");
  });
});

describe("conversations isolation", () => {
  it("B cannot list, read, delete A's conversation or its messages", async () => {
    const created = await request(app)
      .post("/api/anthropic/conversations")
      .set(A.auth)
      .send({ title: "A private chat" });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const bList = await request(app).get("/api/anthropic/conversations").set(B.auth);
    expect(bList.body.some((c: { id: number }) => c.id === id)).toBe(false);
    expect((await request(app).get(`/api/anthropic/conversations/${id}`).set(B.auth)).status).toBe(404);
    expect(
      (await request(app).get(`/api/anthropic/conversations/${id}/messages`).set(B.auth)).status,
    ).toBe(404);
    expect((await request(app).delete(`/api/anthropic/conversations/${id}`).set(B.auth)).status).toBe(404);

    // A can still read it.
    expect((await request(app).get(`/api/anthropic/conversations/${id}`).set(A.auth)).status).toBe(200);
  });

  it("posting a message to a foreign or missing conversation is 404 before any model call", async () => {
    const created = await request(app)
      .post("/api/anthropic/conversations")
      .set(A.auth)
      .send({ title: "A chat" });
    const id = created.body.id;

    // B → A's conversation: ownership 404 happens before the Anthropic call.
    const foreign = await request(app)
      .post(`/api/anthropic/conversations/${id}/messages`)
      .set(B.auth)
      .send({ content: "let me in" });
    expect(foreign.status).toBe(404);

    // Nonexistent id for the caller: also 404, still pre-model.
    const missing = await request(app)
      .post("/api/anthropic/conversations/999999999/messages")
      .set(A.auth)
      .send({ content: "hello?" });
    expect(missing.status).toBe(404);
  });
});

describe("owner happy paths still work", () => {
  it("full expense CRUD for the owner", async () => {
    const u = await createTestUser("happy-exp");
    try {
      const created = await request(app)
        .post("/api/expenses")
        .set(u.auth)
        .send({ amount: 9.99, category: "food", description: "lunch", date: "2026-01-05" });
      expect(created.status).toBe(201);
      const id = created.body.id;

      const read = await request(app).get(`/api/expenses/${id}`).set(u.auth);
      expect(read.status).toBe(200);
      expect(read.body.amount).toBe(9.99);

      const patched = await request(app).patch(`/api/expenses/${id}`).set(u.auth).send({ amount: 12 });
      expect(patched.status).toBe(200);
      expect(patched.body.amount).toBe(12);

      expect((await request(app).delete(`/api/expenses/${id}`).set(u.auth)).status).toBe(204);
      expect((await request(app).get(`/api/expenses/${id}`).set(u.auth)).status).toBe(404);
    } finally {
      await destroyTestUsers(u);
    }
  });

  it("goal contribution increments the owner's savedAmount", async () => {
    const u = await createTestUser("happy-goal");
    try {
      const created = await request(app)
        .post("/api/goals")
        .set(u.auth)
        .send({ name: "car", targetAmount: 500 });
      const id = created.body.id;

      const contrib = await request(app)
        .post(`/api/goals/${id}/contribute`)
        .set(u.auth)
        .send({ amount: 120 });
      expect(contrib.status).toBe(200);
      expect(contrib.body.savedAmount).toBe(120);
    } finally {
      await destroyTestUsers(u);
    }
  });
});
