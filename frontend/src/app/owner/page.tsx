"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Receipt,
  Building2,
  TrendingUp,
  Loader2,
  AlertCircle,
} from "lucide-react";

type Summary = {
  totalRevenueToday: number;
  totalRevenueThisWeek: number;
  totalRevenueThisMonth: number;
  transactionCountToday: number;
  transactionCountThisWeek: number;
  transactionCountThisMonth: number;
  branchCount: number;
};

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

export default function OwnerOverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [branches, setBranches] = useState<BranchStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [summaryRes, branchesRes] = await Promise.all([
          fetch("/api/owner/summary"),
          fetch("/api/owner/branches"),
        ]);

        if (!summaryRes.ok || !branchesRes.ok) {
          if (summaryRes.status === 401 || branchesRes.status === 401) {
            setError("Unauthorized");
            return;
          }
          setError("Failed to load data");
          return;
        }

        const [s, b] = await Promise.all([
          summaryRes.json(),
          branchesRes.json(),
        ]);
        if (!cancelled) {
          setSummary(s);
          setBranches(b);
        }
      } catch {
        if (!cancelled) setError("Failed to load data");
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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-1">
            <DollarSign size={16} />
            Revenue today
          </div>
          <p className="text-xl font-bold text-slate-900">
            {summary ? formatMoney(summary.totalRevenueToday) : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-1">
            <TrendingUp size={16} />
            Revenue this week
          </div>
          <p className="text-xl font-bold text-slate-900">
            {summary ? formatMoney(summary.totalRevenueThisWeek) : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-1">
            <Receipt size={16} />
            Transactions today
          </div>
          <p className="text-xl font-bold text-slate-900">
            {summary?.transactionCountToday ?? "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-1">
            <Building2 size={16} />
            Branches
          </div>
          <p className="text-xl font-bold text-slate-900">
            {summary?.branchCount ?? "—"}
          </p>
        </div>
      </div>

      {/* Branch status */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Branches</h2>
          <Link
            href="/owner/branches"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View all
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-700">
                  Branch
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">
                  Status
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-700">
                  Today
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-700">
                  This week
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{b.name}</span>
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
                    {formatMoney(b.revenueToday)} ({b.salesCountToday})
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700">
                    {formatMoney(b.revenueThisWeek)} ({b.salesCountThisWeek})
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
            <p className="py-8 text-center text-slate-500 text-sm">
              No branches yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
