import { createHash, randomBytes } from "crypto";
import { db } from "./db";

const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function hashActivationToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function generateRawActivationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function activationExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + ACTIVATION_TTL_MS);
}

export function buildActivationUrl(origin: string, rawToken: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/activate?token=${encodeURIComponent(rawToken)}`;
}

/** Revoke all unused (not yet used) activation codes for a branch. */
export async function revokeUnusedActivationCodes(branchId: string) {
  const now = new Date();
  await db.branchActivationCode.updateMany({
    where: {
      branchId,
      usedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: now },
  });
}

/**
 * Create a new activation code for a branch. Revokes prior unused codes.
 * Returns the raw token once — never store it.
 */
export async function createActivationCode(branchId: string) {
  await revokeUnusedActivationCodes(branchId);

  const rawToken = generateRawActivationToken();
  const tokenHash = hashActivationToken(rawToken);
  const expiresAt = activationExpiresAt();

  const code = await db.branchActivationCode.create({
    data: {
      branchId,
      tokenHash,
      expiresAt,
    },
  });

  return { code, rawToken, expiresAt };
}

export async function findValidActivationCode(rawToken: string) {
  const tokenHash = hashActivationToken(rawToken);
  const code = await db.branchActivationCode.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { branch: true },
  });
  return code;
}

/** Activate a terminal using a raw activation token. */
export async function activateTerminalWithToken(
  rawToken: string,
  terminalName = "POS Terminal"
) {
  const code = await findValidActivationCode(rawToken);
  if (!code) {
    return { ok: false as const, error: "Invalid or expired activation code" };
  }

  const now = new Date();

  const result = await db.$transaction(async (tx) => {
    const terminal = await tx.terminal.create({
      data: {
        branchId: code.branchId,
        name: terminalName,
        activatedAt: now,
        lastSeenAt: now,
      },
    });

    await tx.branchActivationCode.update({
      where: { id: code.id },
      data: {
        usedAt: now,
        terminalId: terminal.id,
      },
    });

    await tx.branch.update({
      where: { id: code.branchId },
      data: { lastActiveAt: now },
    });

    return terminal;
  });

  return {
    ok: true as const,
    terminal: result,
    branchId: code.branchId,
    branchName: code.branch.name,
  };
}

export async function revokeTerminal(terminalId: string) {
  const now = new Date();
  return db.terminal.update({
    where: { id: terminalId },
    data: { revokedAt: now },
  });
}

export async function getBranchActivationStatus(branchId: string) {
  const [activeTerminals, pendingCode] = await Promise.all([
    db.terminal.findMany({
      where: { branchId, revokedAt: null },
      orderBy: { activatedAt: "desc" },
      select: {
        id: true,
        name: true,
        activatedAt: true,
        lastSeenAt: true,
        revokedAt: true,
      },
    }),
    db.branchActivationCode.findFirst({
      where: {
        branchId,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
  ]);

  const isActivated = activeTerminals.length > 0;

  return {
    isActivated,
    status: isActivated ? ("Activated" as const) : ("Not Activated" as const),
    terminals: activeTerminals,
    pendingCode: pendingCode
      ? {
          id: pendingCode.id,
          expiresAt: pendingCode.expiresAt,
          createdAt: pendingCode.createdAt,
          // Raw token is never returned after generation
        }
      : null,
  };
}

export async function touchTerminal(terminalId: string) {
  const now = new Date();
  const existing = await db.terminal.findUnique({
    where: { id: terminalId },
    select: { branchId: true, revokedAt: true, lastSeenAt: true },
  });
  if (!existing || existing.revokedAt) return existing;

  // Throttle DB writes to about once per minute
  if (
    existing.lastSeenAt &&
    now.getTime() - existing.lastSeenAt.getTime() < 60_000
  ) {
    return existing;
  }

  await db.terminal.update({
    where: { id: terminalId },
    data: { lastSeenAt: now },
  });
  await db.branch.update({
    where: { id: existing.branchId },
    data: { lastActiveAt: now },
  });
  return existing;
}
