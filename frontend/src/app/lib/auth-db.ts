import { db } from "./db";
import bcrypt from "bcryptjs";

/**
 * Verify credentials against the database
 * This file should only be imported in server-side code, NOT in middleware
 */
export async function verifyCredentials(email: string, password: string) {
  // Find branch account by email
  const account = await db.branchAccount.findUnique({
    where: { email },
    include: { branch: true },
  });

  if (!account) {
    return null;
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, account.password);

  if (!isValidPassword) {
    return null;
  }

  // Return user object with branchId
  return {
    id: account.id,
    email: account.email,
    branchId: account.branchId,
    branchName: account.branch.name,
  };
}
