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
 * Throws if not authenticated or not a branch account.
 */
export async function getAuthBranchId(): Promise<string> {
  const session = await auth();
  if (!session?.user || session.user.role !== "branch" || !session.user.branchId) {
    throw new Error("Unauthorized - no branch session");
  }
  return session.user.branchId;
}

/**
 * Get the current session (server-side)
 */
export async function getAuthSession() {
  return auth();
}
