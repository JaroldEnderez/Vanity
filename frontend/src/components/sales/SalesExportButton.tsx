"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

type Props = {
  startDate: Date | string;
  endDate: Date | string;
  staffId?: string;
  serviceId?: string;
  label?: string;
  className?: string;
};

function parseFilenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      return star[1].trim();
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd);
  if (quoted?.[1]) return quoted[1];
  return null;
}

export default function SalesExportButton({
  startDate,
  endDate,
  staffId,
  serviceId,
  label = "Export to Excel",
  className = "",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    const start = new Date(startDate);
    const end = new Date(endDate);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      if (staffId) params.set("staffId", staffId);
      if (serviceId) params.set("serviceId", serviceId);

      const res = await fetch(`/api/sales/export?${params.toString()}`);
      if (!res.ok) {
        console.error("Export failed:", await res.text());
        return;
      }

      const blob = await res.blob();
      const filename =
        parseFilenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
        "sales.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60 ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
      ) : (
        <Download className="h-4 w-4 shrink-0" aria-hidden />
      )}
      {label}
    </button>
  );
}
