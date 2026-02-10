"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, Building2 } from "lucide-react";

type BranchStatus = {
  id: string;
  name: string;
  address: string;
  lastActiveAt: string | null;
  isOnline: boolean;
  salesCountToday: number;
  salesCountThisWeek: number;
  revenueToday: number;
  revenueThisWeek: number;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(n);
}

export default function OwnerBranchesPage() {
  const [branches, setBranches] = useState<BranchStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/owner/branches");
        if (!res.ok) {
          if (res.status === 401) {
            setError("Unauthorized");
            return;
          }
          setError("Failed to load branches");
          return;
        }
        const data = await res.json();
        if (!cancelled) setBranches(data);
      } catch {
        if (!cancelled) setError("Failed to load branches");
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
      <h1 className="text-2xl font-bold text-slate-900">Branches</h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-3 px-4 font-medium text-slate-700">
                Branch
              </th>
              <th className="text-left py-3 px-4 font-medium text-slate-700 hidden md:table-cell">
                Address
              </th>
              <th className="text-left py-3 px-4 font-medium text-slate-700">
                Status
              </th>
              <th className="text-right py-3 px-4 font-medium text-slate-700">
                Revenue today
              </th>
              <th className="text-right py-3 px-4 font-medium text-slate-700">
                Revenue this week
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr
                key={b.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-slate-400" />
                    <span className="font-medium text-slate-900">{b.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-600 hidden md:table-cell">
                  {b.address}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                      b.isOnline
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        b.isOnline ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {b.isOnline ? "Online" : "Offline"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-slate-700">
                  {formatMoney(b.revenueToday)}
                  <span className="text-slate-500 ml-1">({b.salesCountToday})</span>
                </td>
                <td className="py-3 px-4 text-right text-slate-700">
                  {formatMoney(b.revenueThisWeek)}
                  <span className="text-slate-500 ml-1">({b.salesCountThisWeek})</span>
                </td>
                <td className="py-3 px-4">
                  <Link
                    href={`/owner/branches/${b.id}`}
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {branches.length === 0 && (
          <p className="py-12 text-center text-slate-500">
            No branches yet
          </p>
        )}
      </div>
    </div>
  );
}
