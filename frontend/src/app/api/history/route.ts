import { NextResponse } from "next/server";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { getActivityLogsForBranch } from "@/src/app/lib/activityLog";

/** GET /api/history — activity logs for the current branch */
export async function GET(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const limit = limitRaw ? Number(limitRaw) : 100;
    const offset = offsetRaw ? Number(offsetRaw) : 0;

    const logs = await getActivityLogsForBranch(branchId, { limit, offset });
    return NextResponse.json(logs);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to load history";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
