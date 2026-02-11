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

    // Allow saving materials for any service this branch can access (own or shared)
    if (!existing || !canAccessService(existing, branchId)) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const raw = Array.isArray(body.materials) ? body.materials : [];
    const materials = raw.map((m: { materialId?: string; quantity?: unknown }) => ({
      materialId: String(m.materialId ?? ""),
      quantity: Number(m.quantity) || 0,
    })).filter((m: { materialId: string; quantity: number }) => m.materialId);
    const result = await setServiceMaterials(id, materials);
    return NextResponse.json(result);
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
