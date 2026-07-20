import type { Request } from "express";

/**
 * The authenticated user's id, as set by authMiddleware from the server-side
 * session. Ownership is NEVER accepted from a client-supplied value.
 *
 * All data routes are mounted behind requireAuth, so req.user is always
 * present there; the throw is a loud programming-error guard for any future
 * route that forgets the middleware, not a user-facing path.
 */
export function userId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new Error("userId() called on an unauthenticated request — is requireAuth missing?");
  return id;
}
