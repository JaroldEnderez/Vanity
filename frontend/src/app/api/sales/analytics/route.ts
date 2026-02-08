import { NextResponse } from "next/server";
import { getSalesByHour, getSalesByDay, getSalesByWeek, getSalesByMonth } from "@/src/app/lib/sales";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

type Interval = "hour" | "day" | "week" | "month";

// GET /api/sales/analytics?interval=hour&startDate=...&endDate=...
export async function GET(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    const { searchParams } = new URL(req.url);
    const interval = searchParams.get("interval") as Interval;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!interval || !["hour", "day", "week", "month"].includes(interval)) {
      return NextResponse.json(
        { error: "Invalid interval. Must be: hour, day, week, or month" },
        { status: 400 }
      );
    }

    let data;

    switch (interval) {
      case "hour": {
        data = await getSalesByHour(branchId);
        break;
      }
      case "day": {
        if (!startDateParam || !endDateParam) {
          return NextResponse.json(
            { error: "startDate and endDate required for day interval" },
            { status: 400 }
          );
        }
        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);
        data = await getSalesByDay(startDate, endDate, branchId);
        break;
      }
      case "week": {
        if (!startDateParam || !endDateParam) {
          return NextResponse.json(
            { error: "startDate and endDate required for week interval" },
            { status: 400 }
          );
        }
        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);
        data = await getSalesByWeek(startDate, endDate, branchId);
        break;
      }
      case "month": {
        if (!startDateParam || !endDateParam) {
          return NextResponse.json(
            { error: "startDate and endDate required for month interval" },
            { status: 400 }
          );
        }
        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);
        data = await getSalesByMonth(startDate, endDate, branchId);
        break;
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch analytics";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
