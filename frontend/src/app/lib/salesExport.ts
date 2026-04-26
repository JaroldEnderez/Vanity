import type { PackageMeasure } from "@prisma/client";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";

import {
  formatMeasureAbbrev,
  hasPackageMaterial,
} from "@/src/app/lib/materialPackage";
import { parseOptionalMaterialsJson } from "@/src/app/lib/optionalSessionMaterials";

export const saleExportInclude = Prisma.validator<Prisma.SaleInclude>()({
  staff: { select: { name: true } },
  saleServices: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      qty: true,
      price: true,
      serviceDisplayName: true,
      colorUsed: true,
      developer: true,
      itemStaffName: true,
      service: { select: { name: true } },
    },
  },
  saleMaterials: {
    include: {
      material: {
        select: {
          name: true,
          unit: true,
          packageAmount: true,
          packageMeasure: true,
        },
      },
    },
  },
});

export type SaleForExport = Prisma.SaleGetPayload<{
  include: typeof saleExportInclude;
}>;

export type SalesExportRow = {
  Date: string;
  Service: string;
  Staff: string;
  Total: number;
  Materials: string;
};

function formatUsageQuantity(
  quantity: number,
  material: {
    unit: string;
    packageAmount: number | null;
    packageMeasure: PackageMeasure | null;
  }
): string {
  if (hasPackageMaterial(material)) {
    const q = quantity % 1 === 0 ? String(quantity) : quantity.toFixed(1);
    return `${q} ${formatMeasureAbbrev(material.packageMeasure!)}`;
  }
  const q = quantity % 1 === 0 ? String(quantity) : quantity.toFixed(2);
  return `${q} ${material.unit}`;
}

function formatEndedDateShort(endedAt: Date | null): string {
  if (!endedAt) return "";
  const d = new Date(endedAt);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Session-level materials + optional hair-color line hints from service lines. */
export function buildMaterialsSummary(sale: SaleForExport): string {
  const parts: string[] = [];

  for (const row of parseOptionalMaterialsJson(sale.optionalMaterials)) {
    parts.push(
      `${row.name} (${formatUsageQuantity(row.quantity, {
        unit: row.unit,
        packageAmount: row.packageAmount ?? null,
        packageMeasure: row.packageMeasure ?? null,
      })})`
    );
  }

  for (const sm of sale.saleMaterials) {
    parts.push(
      `${sm.material.name} (${formatUsageQuantity(sm.quantity, sm.material)})`
    );
  }

  const colorParts: string[] = [];
  for (const ss of sale.saleServices) {
    const c = ss.colorUsed?.trim();
    const dev = ss.developer?.trim();
    if (c) colorParts.push(`Hair color: ${c}`);
    if (dev) colorParts.push(`Developer: ${dev}`);
  }
  if (colorParts.length > 0) {
    parts.push([...new Set(colorParts)].join("; "));
  }

  return parts.join(", ");
}

export function flattenSalesToRows(sales: SaleForExport[]): SalesExportRow[] {
  const rows: SalesExportRow[] = [];

  for (const sale of sales) {
    const materialsStr = buildMaterialsSummary(sale);
    const dateStr = formatEndedDateShort(sale.endedAt);
    const defaultStaff = sale.staff?.name?.trim() ?? "";

    sale.saleServices.forEach((ss, index) => {
      const serviceName =
        ss.serviceDisplayName?.trim() || ss.service.name;
      const staffName = ss.itemStaffName?.trim() || defaultStaff;
      rows.push({
        Date: index === 0 ? dateStr : "",
        Service: serviceName,
        Staff: staffName,
        Total: ss.qty * ss.price,
        Materials: index === 0 ? materialsStr : "",
      });
    });
  }

  return rows;
}

export function buildSalesXlsxBuffer(rows: SalesExportRow[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const ref = ws["!ref"];
  if (ref) {
    ws["!autofilter"] = { ref };
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sales");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
