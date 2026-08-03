import { NextResponse } from "next/server";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { getServicesForBranch } from "@/src/app/lib/services";
import {
  buildServicesCsvBuffer,
  flattenServicesToRows,
  type ServiceForExport,
} from "@/src/app/lib/servicesExport";
import { logActivity } from "@/src/app/lib/activityLog";

function filenameForNow(): string {
  const d = new Date();
  const fmt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `services-${fmt}.csv`;
}

/** GET /api/services/export — active services visible to this branch (branch + shared catalog) */
export async function GET() {
  try {
    const branchId = await getAuthBranchId();
    const services = await getServicesForBranch(branchId);
    const forExport: ServiceForExport[] = services.map((s) => ({
      id: s.id,
      name: s.name,
      category: String(s.category),
      hairColoringFlow: s.hairColoringFlow,
      description: s.description,
      durationMin: s.durationMin,
      price: s.price,
      isActive: s.isActive,
      usesMaterials: s.usesMaterials,
      materials: s.materials?.map((sm) => ({
        quantity: sm.quantity,
        material: {
          name: sm.material.name,
          unit: sm.material.unit,
        },
      })),
    }));
    const rows = flattenServicesToRows(forExport);
    const buffer = buildServicesCsvBuffer(rows);
    const filename = filenameForNow();
    const disposition = `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

    await logActivity({
      branchId,
      action: "service.exported",
      entityType: "Service",
      entityId: branchId,
      summary: `Exported ${services.length} service${services.length === 1 ? "" : "s"} to CSV`,
      after: { count: services.length, filename },
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": disposition,
      },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Export failed";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
