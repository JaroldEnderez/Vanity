import { NextResponse } from "next/server";
import { getServicesForBranch, createService } from "@/src/app/lib/services";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

export async function GET() {
  try {
    const branchId = await getAuthBranchId();
    const services = await getServicesForBranch(branchId);
    return NextResponse.json(services);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch services";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function POST(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    const body = await req.json();
    const service = await createService({
      ...body,
      branchId, // New services belong to the current branch
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to create service";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
