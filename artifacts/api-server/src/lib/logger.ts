import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
// The pretty-print transport spins up a worker thread; skip it under test so
// the vitest worker can exit cleanly (and so LOG_LEVEL=silent stays quiet).
const isTest = process.env.NODE_ENV === "test";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction || isTest
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
