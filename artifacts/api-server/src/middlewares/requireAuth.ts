import { type NextFunction, type Request, type Response } from "express";

/**
 * Rejects unauthenticated requests with 401. Mount after authMiddleware.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
