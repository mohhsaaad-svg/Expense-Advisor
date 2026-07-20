import express, { type Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { authMiddleware } from "./middlewares/authMiddleware";
import { logger } from "./lib/logger";

const app: Express = express();

// The app runs behind Replit's proxy; trust one hop so the client IP
// (X-Forwarded-For) is resolved correctly for rate limiting.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Restrict CORS to the app's own origins. Same-origin requests (the web app
// is served through the same proxy) send no Origin header and are unaffected.
const allowedOrigins = new Set<string>();
for (const domain of (process.env.REPLIT_DOMAINS ?? "").split(",")) {
  if (domain.trim()) allowedOrigins.add(`https://${domain.trim()}`);
}
if (process.env.REPLIT_DEV_DOMAIN) {
  allowedOrigins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
}
// Development only: the Expo web preview runs on a separate
// *.expo.<cluster>.replit.dev origin and calls the API with a Bearer token,
// so it needs CORS. Never enabled in production.
if (process.env.NODE_ENV !== "production" && process.env.REPLIT_EXPO_DEV_DOMAIN) {
  allowedOrigins.add(`https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`);
}
if (process.env.ALLOWED_ORIGIN) {
  allowedOrigins.add(process.env.ALLOWED_ORIGIN);
}

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser or same-origin requests have no Origin header.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, origin ?? false);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

// Global rate limit: caps request volume per client IP so a flood cannot
// exhaust the shared database connection pool. Skipped under test, where the
// whole suite shares one loopback IP and would otherwise trip the limit.
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
  }),
);

app.use("/api", router);

export default app;
