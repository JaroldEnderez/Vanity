"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  activationStatus?: string;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(n);
}

export default function OwnerOverviewPage() {
  const router = useRouter();
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
          if (Array.isArray(b) && b.length === 0) {
            router.replace("/owner/onboarding");
            return;
          }
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
  }, [router]);

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

  if (!summary) return null;

  const cards = [
    {
      label: "Revenue today",
      value: formatMoney(summary.totalRevenueToday),
      sub: `${summary.transactionCountToday} transactions`,
      icon: DollarSign,
    },
    {
      label: "Revenue this week",
      value: formatMoney(summary.totalRevenueThisWeek),
      sub: `${summary.transactionCountThisWeek} transactions`,
      icon: TrendingUp,
    },
    {
      label: "Revenue this month",
      value: formatMoney(summary.totalRevenueThisMonth),
      sub: `${summary.transactionCountThisMonth} transactions`,
      icon: Receipt,
    },
    {
      label: "Branches",
      value: String(summary.branchCount),
      sub: "Active locations",
      icon: Building2,
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-500 text-sm font-medium">{label}</p>
              <Icon size={18} className="text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-slate-500 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Branches</h2>
          <Link
            href="/owner/branches"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
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
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                >
                  <td className="py-3 px-4">
                    <Link
                      href={`/owner/branches/${b.id}`}
                      className="font-medium text-slate-900 hover:text-emerald-700"
                    >
                      {b.name}
                    </Link>
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
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700">
                    {formatMoney(b.revenueThisWeek)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
