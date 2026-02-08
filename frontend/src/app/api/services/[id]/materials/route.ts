import { NextResponse } from "next/server";
import {
  getServiceMaterials,
  setServiceMaterials,
} from "@/src/app/lib/materials";
import { getServiceById } from "@/src/app/lib/services";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";

function canAccessService(service: { branchId: string | null }, branchId: string) {
  return service.branchId === null || service.branchId === branchId;
}

function canModifyService(service: { branchId: string | null }, branchId: string) {
  return service.branchId === branchId;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const service = await getServiceById(id);

    if (!service || !canAccessService(service, branchId)) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    const materials = await getServiceMaterials(id);
    return NextResponse.json(materials);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch service materials";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const existing = await getServiceById(id);

    if (!existing || !canModifyService(existing, branchId)) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const materials = await setServiceMaterials(id, body.materials || []);
    return NextResponse.json(materials);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update service materials";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
