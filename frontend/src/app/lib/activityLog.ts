import { Prisma } from "@prisma/client";
import { db } from "./db";
import { withChangeDetails } from "./activityLogFormat";

export type ActivityAction =
  | "service.created"
  | "service.updated"
  | "service.deleted"
  | "service.exported"
  | "material.created"
  | "material.updated"
  | "material.deleted"
  | "material.imported"
  | "sale.created"
  | "customer.created"
  | "customer.updated"
  | "customer.deleted"
  | "staff.created"
  | "staff.updated"
  | "staff.deleted"
  | "branch.updated";

export type LogActivityInput = {
  branchId: string;
  actorType?: string;
  actorId?: string | null;
  action: ActivityAction | string;
  entityType: string;
  entityId: string;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  /** When true (default), append before→after field details to summary. */
  enrichSummary?: boolean;
};

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

/** Append an activity log row. Failures are swallowed so logging never breaks the main action. */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const enrich = input.enrichSummary !== false;
    const summary =
      enrich && input.summary
        ? withChangeDetails(input.summary, input.before, input.after)
        : input.summary ?? null;

    await db.activityLog.create({
      data: {
        branchId: input.branchId,
        actorType: input.actorType ?? "branch",
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary,
        before: toJson(input.before),
        after: toJson(input.after),
      },
    });
  } catch (error) {
    console.error("Failed to write activity log:", error);
  }
}

export async function getActivityLogsForBranch(
  branchId: string,
  opts?: { limit?: number; offset?: number }
) {
  const limit = Math.max(1, Math.min(200, opts?.limit ?? 100));
  const offset = Math.max(0, opts?.offset ?? 0);

  return db.activityLog.findMany({
    where: { branchId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      summary: true,
      before: true,
      after: true,
      actorType: true,
      createdAt: true,
    },
  });
}
