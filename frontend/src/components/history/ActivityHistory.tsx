"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2, AlertCircle } from "lucide-react";
import { formatChangeLines } from "@/src/app/lib/activityLogFormat";

type ActivityRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string | null;
  before: unknown;
  after: unknown;
  actorType: string;
  createdAt: string;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    "service.created": "Service created",
    "service.updated": "Service updated",
    "service.deleted": "Service deleted",
    "service.exported": "Services exported",
    "material.created": "Material created",
    "material.updated": "Material updated",
    "material.deleted": "Material deleted",
    "material.imported": "Materials imported",
    "sale.created": "Sale created",
    "customer.created": "Customer created",
    "customer.updated": "Customer updated",
    "customer.deleted": "Customer deleted",
    "staff.created": "Staff created",
    "staff.updated": "Staff updated",
    "staff.deleted": "Staff deleted",
    "branch.updated": "Branch updated",
  };
  return map[action] ?? action;
}

/** Strip auto-appended " · Field: …" change details so we can show them as a list. */
function headlineSummary(summary: string | null, changeLines: string[]): string {
  if (!summary) return "—";
  if (changeLines.length === 0) return summary;
  let headline = summary;
  for (const line of changeLines) {
    const suffix = ` · ${line}`;
    if (headline.endsWith(suffix)) {
      headline = headline.slice(0, -suffix.length);
    } else {
      headline = headline.split(suffix).join("");
    }
  }
  return headline.trim() || summary;
}

function entityBadgeClass(entityType: string): string {
  switch (entityType) {
    case "Service":
      return "bg-violet-50 text-violet-700";
    case "Material":
      return "bg-amber-50 text-amber-800";
    case "Sale":
      return "bg-emerald-50 text-emerald-800";
    case "Customer":
      return "bg-sky-50 text-sky-800";
    case "Staff":
      return "bg-slate-100 text-slate-700";
    case "Branch":
      return "bg-indigo-50 text-indigo-800";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function ActivityHistory() {
  const [logs, setLogs] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/history?limit=150");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.error === "string" ? data.error : "Failed to load history"
          );
        }
        const data = (await res.json()) as ActivityRow[];
        if (!cancelled) setLogs(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load history");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="text-emerald-600" size={24} />
        <h1 className="text-2xl font-bold text-slate-900">History</h1>
      </div>
      <p className="text-sm text-slate-600">
        Changes made in this branch — services, inventory, sales, customers, staff, and branch details.
      </p>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="py-3 px-4 font-medium text-slate-700">When</th>
                <th className="py-3 px-4 font-medium text-slate-700">Type</th>
                <th className="py-3 px-4 font-medium text-slate-700">Action</th>
                <th className="py-3 px-4 font-medium text-slate-700">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((row) => {
                const changeLines = formatChangeLines(row.before, row.after);
                const headline = headlineSummary(row.summary, changeLines);
                return (
                  <tr key={row.id} className="hover:bg-slate-50 align-top">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${entityBadgeClass(row.entityType)}`}
                      >
                        {row.entityType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">
                      {actionLabel(row.action)}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{headline}</div>
                      {changeLines.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                          {changeLines.map((line) => (
                            <li key={line} className="font-mono">
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && (
          <p className="py-10 text-center text-slate-500">
            No activity logged yet. Changes will appear here as you work.
          </p>
        )}
      </div>
    </div>
  );
}
