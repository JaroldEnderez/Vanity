"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Building2,
  Receipt,
  Package,
  X,
} from "lucide-react";

type BranchDetail = {
  id: string;
  name: string;
  address: string;
  lastActiveAt: string | null;
  isOnline: boolean;
  salesCountToday: number;
  salesCountThisWeek: number;
  salesCountThisMonth: number;
  revenueToday: number;
  revenueThisWeek: number;
  revenueThisMonth: number;
};

type SaleItem = {
  id: string;
  name: string | null;
  total: number;
  cashReceived: number | null;
  changeGiven: number | null;
  endedAt: string;
  staff: { name: string | null } | null;
  saleServices: Array<{
    qty: number;
    price: number;
    service: { name: string };
  }>;
  saleMaterials: Array<{
    quantity: number;
    material: { name: string; unit: string };
  }>;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(n);
}

function formatDate(s: string) {
  return new Date(s).toLocaleString("en-PH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function OwnerBranchDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [inventory, setInventory] = useState<{ id: string; name: string; unit: string; stock: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerSale, setDrawerSale] = useState<SaleItem | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const [branchRes, salesRes, inventoryRes] = await Promise.all([
          fetch(`/api/owner/branches/${id}`),
          fetch(`/api/owner/branches/${id}/sales?limit=20`),
          fetch(`/api/owner/branches/${id}/inventory`),
        ]);

        if (!branchRes.ok) {
          if (branchRes.status === 401) {
            setError("Unauthorized");
            return;
          }
          if (branchRes.status === 404) {
            setError("Branch not found");
            return;
          }
          setError("Failed to load branch");
          return;
        }

        const branchData = await branchRes.json();
        const salesData = salesRes.ok ? await salesRes.json() : [];
        const inventoryData = inventoryRes.ok ? await inventoryRes.json() : [];
        if (!cancelled) {
          setBranch(branchData);
          setSales(salesData);
          setInventory(inventoryData);
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
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="space-y-4">
        <Link
          href="/owner/branches"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to branches
        </Link>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle size={20} />
          <span>{error ?? "Branch not found"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/owner/branches"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to branches
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={28} className="text-emerald-600" />
            {branch.name}
          </h1>
          <p className="text-slate-600 mt-1">{branch.address}</p>
          <span
            className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${
              branch.isOnline
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                branch.isOnline ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {branch.isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">Revenue today</p>
          <p className="text-xl font-bold text-slate-900">
            {formatMoney(branch.revenueToday)}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {branch.salesCountToday} transactions
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">
            Revenue this week
          </p>
          <p className="text-xl font-bold text-slate-900">
            {formatMoney(branch.revenueThisWeek)}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {branch.salesCountThisWeek} transactions
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-1">
            Revenue this month
          </p>
          <p className="text-xl font-bold text-slate-900">
            {formatMoney(branch.revenueThisMonth)}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {branch.salesCountThisMonth} transactions
          </p>
        </div>
      </div>

      {/* Recent sales */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Receipt size={20} />
          Recent sales
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-700">
                  Date
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">
                  Session name
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">
                  Staff
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDrawerSale(sale)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setDrawerSale(sale)
                  }
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-3 px-4 text-slate-700">
                    {formatDate(sale.endedAt)}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {sale.name?.trim() || "Session"}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {sale.staff?.name ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-900">
                    {formatMoney(sale.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && (
            <p className="py-8 text-center text-slate-500">No sales yet</p>
          )}
        </div>
      </div>

      {/* Sale detail drawer */}
      {drawerSale && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            aria-hidden
            onClick={() => setDrawerSale(null)}
          />
          <div
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
            role="dialog"
            aria-label="Sale details"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                Sale details
              </h3>
              <button
                type="button"
                onClick={() => setDrawerSale(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Sale ID
                </p>
                <p className="text-sm font-mono text-slate-900 mt-0.5 break-all">
                  {drawerSale.id}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Date & time
                </p>
                <p className="text-sm text-slate-900 mt-0.5">
                  {formatDate(drawerSale.endedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Staff
                </p>
                <p className="text-sm text-slate-900 mt-0.5">
                  {drawerSale.staff?.name ?? "—"}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Line items
                </p>
                <ul className="space-y-2">
                  {drawerSale.saleServices.map((ss, i) => (
                    <li key={i} className="text-sm text-slate-700">
                      <div className="flex justify-between">
                        <span>
                          {ss.service.name} × {ss.qty} @ {formatMoney(ss.price)}
                        </span>
                        <span className="font-medium">
                          {formatMoney(ss.qty * ss.price)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {drawerSale.saleMaterials && drawerSale.saleMaterials.length > 0 && (
                  <div className="mt-3 pl-2 border-l-2 border-slate-200 space-y-1">
                    {drawerSale.saleMaterials.map((sm, i) => (
                      <p key={i} className="text-xs text-slate-600">
                        {sm.material.name}: - {sm.quantity} {sm.material.unit}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(drawerSale.total)}
                  </span>
                </div>
                {drawerSale.cashReceived != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Cash received</span>
                    <span className="text-slate-900">
                      {formatMoney(drawerSale.cashReceived)}
                    </span>
                  </div>
                )}
                {drawerSale.changeGiven != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Change given</span>
                    <span className="text-slate-900">
                      {formatMoney(drawerSale.changeGiven)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
