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
  // OwnerAccount exists only after prisma generate; guard for old client
  const ownerAccount = "ownerAccount" in db ? (db as { ownerAccount: { findUnique: (args: { where: { email: string } }) => Promise<{ id: string; email: string; password: string } | null> } }).ownerAccount : null;
  if (ownerAccount) {
    const owner = await ownerAccount.findUnique({
      where: { email },
    });
    if (owner) {
      const ok = await bcrypt.compare(password, owner.password);
      if (ok) {
        return { id: owner.id, email: owner.email, role: "owner" };
      }
      return null;
    }
  }

  const branchAccount = await db.branchAccount.findUnique({
    where: { email },
    include: { branch: true },
  });
  if (!branchAccount) return null;

  const ok = await bcrypt.compare(password, branchAccount.password);
  if (!ok) return null;

  return {
    id: branchAccount.id,
    email: branchAccount.email,
    role: "branch",
    branchId: branchAccount.branchId,
    branchName: branchAccount.branch.name,
  };
}
