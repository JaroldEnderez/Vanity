import { auth } from "./auth";

/**
 * Get the current session's branchId (server-side)
 * Throws an error if not authenticated
 */
export async function getAuthBranchId(): Promise<string> {
  const session = await auth();
  
  if (!session?.user?.branchId) {
    throw new Error("Unauthorized - no branch session");
  }
  
  return session.user.branchId;
}

/**
 * Get the current session (server-side)
 * Returns null if not authenticated
 */
export async function getAuthSession() {
  return auth();
}
