import { db } from "./db";
import bcrypt from "bcryptjs";

export type AuthUser =
  | { id: string; email: string; role: "owner" }
  | { id: string; email: string; role: "branch"; branchId: string; branchName: string };

/**
 * Verify credentials: OwnerAccount first, then BranchAccount.
 * This file should only be imported in server-side code, NOT in middleware.
 */
export async function verifyCredentials(email: string, password: string): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  
  // 1. Check Owner Table
  const owner = await db.ownerAccount.findUnique({
    where: { email: normalizedEmail }
  });

  if (owner) {
    const isMatch = await bcrypt.compare(password, owner.password);
    if (isMatch) return { id: owner.id, email: owner.email, role: "owner" };
    return null; 
  }

  // 2. Check Branch Table
  const branchAcc = await db.branchAccount.findUnique({
    where: { email: normalizedEmail },
    include: { branch: true }
  });

  if (branchAcc) {
    const isMatch = await bcrypt.compare(password, branchAcc.password);
    if (isMatch) {
      return {
        id: branchAcc.id,
        email: branchAcc.email,
        role: "branch",
        branchId: branchAcc.branchId,
        branchName: branchAcc.branch.name
      };
    }
  }

  return null;
}