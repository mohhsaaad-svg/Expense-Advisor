import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { createTestUser, destroyTestUsers, type TestUser } from "./helpers";

let U: TestUser;

beforeAll(async () => {
  U = await createTestUser("lang-u");
});

afterAll(async () => {
  await destroyTestUsers(U);
});

describe("language preference", () => {
  it("defaults to English", async () => {
    const res = await request(app).get("/api/preferences").set(U.auth);
    expect(res.status).toBe(200);
    expect(res.body.language).toBe("en");
  });

  it("accepts a PUT without language (pre-language clients keep working)", async () => {
    const res = await request(app)
      .put("/api/preferences")
      .set(U.auth)
      .send({ currency: "USD", alertThreshold: 80 });
    expect(res.status).toBe(200);
    expect(res.body.language).toBe("en");
  });

  it("persists Arabic and returns it on subsequent reads", async () => {
    const put = await request(app)
      .put("/api/preferences")
      .set(U.auth)
      .send({ currency: "USD", alertThreshold: 80, language: "ar" });
    expect(put.status).toBe(200);
    expect(put.body.language).toBe("ar");

    const get = await request(app).get("/api/preferences").set(U.auth);
    expect(get.body.language).toBe("ar");
  });

  it("rejects unsupported languages", async () => {
    const res = await request(app)
      .put("/api/preferences")
      .set(U.auth)
      .send({ currency: "USD", alertThreshold: 80, language: "fr" });
    expect(res.status).toBe(400);
  });
});
