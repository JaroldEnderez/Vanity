import { NextResponse } from "next/server";
import { createMaterial, getAllMaterials } from "@/src/app/lib/materials";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { logActivity } from "@/src/app/lib/activityLog";

export async function GET(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    const { searchParams } = new URL(req.url);
    const includeInactive =
      searchParams.get("includeInactive") === "1" ||
      searchParams.get("includeInactive") === "true";
    const materials = await getAllMaterials(branchId, { includeInactive });
    return NextResponse.json(materials);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch materials";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const branchId = await getAuthBranchId();
    const body = await req.json();
    const material = await createMaterial(branchId, body);
    await logActivity({
      branchId,
      action: "material.created",
      entityType: "Material",
      entityId: material.id,
      summary: `Created material “${material.name}”`,
      after: {
        name: material.name,
        unit: material.unit,
        stock: material.stock,
        category: material.category,
        sku: material.sku,
        packageAmount: material.packageAmount,
        packageMeasure: material.packageMeasure,
      },
    });
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to create material";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Package") || message.includes("package")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
