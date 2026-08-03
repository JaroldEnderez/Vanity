import { NextResponse } from "next/server";
import {
  getMaterialById,
  updateMaterial,
  deleteMaterial,
} from "@/src/app/lib/materials";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { logActivity } from "@/src/app/lib/activityLog";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const material = await getMaterialById(id, branchId);
    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(material);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch material";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const branchId = await getAuthBranchId();
    const existing = await getMaterialById(id, branchId);
    const material = await updateMaterial(branchId, id, body);
    await logActivity({
      branchId,
      action: "material.updated",
      entityType: "Material",
      entityId: material.id,
      summary: `Updated material “${material.name}”`,
      before: existing
        ? {
            name: existing.name,
            unit: existing.unit,
            stock: existing.stock,
            category: existing.category,
            sku: existing.sku,
            packageAmount: existing.packageAmount,
            packageMeasure: existing.packageMeasure,
            isActive: existing.isActive,
          }
        : undefined,
      after: {
        name: material.name,
        unit: material.unit,
        stock: material.stock,
        category: material.category,
        sku: material.sku,
        packageAmount: material.packageAmount,
        packageMeasure: material.packageMeasure,
        isActive: material.isActive,
      },
    });
    return NextResponse.json(material);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update material";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Package") || message.includes("package")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const branchId = await getAuthBranchId();
    const { id } = await params;
    const existing = await getMaterialById(id, branchId);
    const material = await deleteMaterial(branchId, id);
    await logActivity({
      branchId,
      action: "material.deleted",
      entityType: "Material",
      entityId: id,
      summary: `Deleted material “${existing?.name ?? material?.name ?? id}”`,
      before: existing
        ? {
            name: existing.name,
            unit: existing.unit,
            stock: existing.stock,
            category: existing.category,
            sku: existing.sku,
          }
        : undefined,
    });
    return NextResponse.json({ success: true, material });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to delete material";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
