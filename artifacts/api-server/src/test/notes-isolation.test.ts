import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { createTestUser, destroyTestUsers, type TestUser } from "./helpers";

// Alcove notes: per-user isolation matrix (product-scaffold dry run).
let A: TestUser;
let B: TestUser;

beforeAll(async () => {
  A = await createTestUser("notes-a");
  B = await createTestUser("notes-b");
});

afterAll(async () => {
  await destroyTestUsers(A, B);
});

describe("notes auth gate", () => {
  it("rejects unauthenticated access with 401", async () => {
    expect((await request(app).get("/api/notes")).status).toBe(401);
    expect((await request(app).post("/api/notes").send({ title: "x" })).status).toBe(401);
  });
});

describe("notes isolation", () => {
  it("B cannot list, read, update, or delete A's note", async () => {
    const created = await request(app)
      .post("/api/notes")
      .set(A.auth)
      .send({ title: "A secret", body: "private thoughts" });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const bList = await request(app).get("/api/notes").set(B.auth);
    expect(bList.status).toBe(200);
    expect(bList.body.some((n: { id: number }) => n.id === id)).toBe(false);

    expect((await request(app).get(`/api/notes/${id}`).set(B.auth)).status).toBe(404);
    expect(
      (await request(app).patch(`/api/notes/${id}`).set(B.auth).send({ title: "hacked" })).status,
    ).toBe(404);
    expect((await request(app).delete(`/api/notes/${id}`).set(B.auth)).status).toBe(404);

    // A's record is untouched by B's attempts.
    const aRead = await request(app).get(`/api/notes/${id}`).set(A.auth);
    expect(aRead.status).toBe(200);
    expect(aRead.body.title).toBe("A secret");
  });

  it("full note CRUD works for the owner", async () => {
    const u = await createTestUser("notes-happy");
    try {
      const created = await request(app)
        .post("/api/notes")
        .set(u.auth)
        .send({ title: "first", body: "hello" });
      expect(created.status).toBe(201);
      const id = created.body.id;

      const read = await request(app).get(`/api/notes/${id}`).set(u.auth);
      expect(read.status).toBe(200);
      expect(read.body.body).toBe("hello");

      const patched = await request(app).patch(`/api/notes/${id}`).set(u.auth).send({ body: "edited" });
      expect(patched.status).toBe(200);
      expect(patched.body.body).toBe("edited");

      expect((await request(app).delete(`/api/notes/${id}`).set(u.auth)).status).toBe(204);
      expect((await request(app).get(`/api/notes/${id}`).set(u.auth)).status).toBe(404);
    } finally {
      await destroyTestUsers(u);
    }
  });
});
