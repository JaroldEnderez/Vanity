import { auth } from "./auth";

/**
 * Require owner session (server-side). Use in owner-only API routes.
 * Throws if not authenticated or not owner.
 */
export async function requireOwner() {
  const session = await auth();
  if (!session?.user || session.user.role !== "owner") {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Get the current session's branchId (server-side). Use in branch/POS API routes.
 * Accepts legacy BranchAccount (`branch`) or Terminal (`terminal`) sessions.
 * Throws if not authenticated or not a branch/terminal session with branchId.
 */
export async function getAuthBranchId(): Promise<string> {
  const session = await auth();
  const role = session?.user?.role;
  if (
    !session?.user ||
    (role !== "branch" && role !== "terminal") ||
    !session.user.branchId
  ) {
    throw new Error("Unauthorized - no branch session");
  }

  // Terminal was revoked — JWT callback clears branchId, but double-check if present without id
  if (role === "terminal" && !session.user.terminalId) {
    throw new Error("Unauthorized - no branch session");
  }

  if (role === "terminal" && session.user.terminalId) {
    try {
      const { touchTerminal } = await import("./activation");
      await touchTerminal(session.user.terminalId);
    } catch {
      // non-fatal
    }
  }

  return session.user.branchId;
}

/**
 * Any signed-in user (owner, branch, or terminal).
 */
export async function requireAuthenticatedUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  // Terminal without branchId means revoked
  if (
    session.user.role === "terminal" &&
    (!session.user.branchId || !session.user.terminalId)
  ) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Get the current session (server-side)
 */
export async function getAuthSession() {
  return auth();
}
