import { NextResponse } from "next/server";
import { getAllStaff, getStylists } from "@/src/app/lib/staff";

// GET /api/staff - Get all staff or stylists only
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId") || undefined;
    const stylistsOnly = searchParams.get("stylists") === "true";

    const staff = stylistsOnly 
      ? await getStylists(branchId)
      : await getAllStaff(branchId);

    return NextResponse.json(staff);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}
