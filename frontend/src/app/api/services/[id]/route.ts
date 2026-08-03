import { NextResponse } from "next/server";
import { getServiceById, updateService, deleteService } from "@/src/app/lib/services";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { logActivity } from "@/src/app/lib/activityLog";

/** Only allow access if service belongs to this branch or is shared (branchId null). */
function canAccessService(service: { branchId: string | null }, branchId: string) {
  return service.branchId === null || service.branchId === branchId;
}

/** Only allow modify/delete if service belongs to this branch (not shared). */
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

    return NextResponse.json(service);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch service";
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
    const service = await updateService(id, body);
    await logActivity({
      branchId,
      action: "service.updated",
      entityType: "Service",
      entityId: service.id,
      summary: `Updated service “${service.name}”`,
      before: {
        name: existing.name,
        price: existing.price,
        category: existing.category,
        durationMin: existing.durationMin,
        description: existing.description,
        hairColoringFlow: existing.hairColoringFlow,
        isActive: existing.isActive,
      },
      after: {
        name: service.name,
        price: service.price,
        category: service.category,
        durationMin: service.durationMin,
        description: service.description,
        hairColoringFlow: service.hairColoringFlow,
        isActive: service.isActive,
      },
    });
    return NextResponse.json(service);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update service";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const existing = await getServiceById(id);

    // Only soft-delete branch-owned services (not shared catalog).
    if (!existing || !canModifyService(existing, branchId)) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    await deleteService(id);
    await logActivity({
      branchId,
      action: "service.deleted",
      entityType: "Service",
      entityId: id,
      summary: `Deleted service “${existing.name}”`,
      before: {
        name: existing.name,
        price: existing.price,
        category: existing.category,
        durationMin: existing.durationMin,
        description: existing.description,
      },
    });
    return NextResponse.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to delete service";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
