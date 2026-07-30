"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Building2, Plus } from "lucide-react";

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
  isActivated?: boolean;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(n);
}

export default function OwnerBranchesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = async () => {
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
      setBranches(data);
      if (Array.isArray(data) && data.length === 0) {
        router.replace("/owner/onboarding");
      }
    } catch {
      setError("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/owner/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error || "Failed to create branch");
        return;
      }
      setShowCreate(false);
      setName("");
      router.push(`/owner/branches/${data.id}`);
    } catch {
      setCreateError("Failed to create branch");
    } finally {
      setCreating(false);
    }
  };

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
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
        >
          <Plus size={16} />
          Add branch
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Create branch
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Branch name"
              required
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setCreateError(null);
                }}
                className="px-3 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
          {createError && (
            <p className="text-sm text-red-600 mt-2">{createError}</p>
          )}
        </div>
      )}

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
              <th className="text-left py-3 px-4 font-medium text-slate-700 hidden sm:table-cell">
                POS
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
                  {b.address || "—"}
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
                <td className="py-3 px-4 hidden sm:table-cell">
                  <span
                    className={`text-xs font-medium ${
                      b.isActivated ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {b.activationStatus ?? "Not Activated"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-slate-700">
                  {formatMoney(b.revenueToday)}
                  <span className="text-slate-500 ml-1">
                    ({b.salesCountToday})
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-slate-700">
                  {formatMoney(b.revenueThisWeek)}
                  <span className="text-slate-500 ml-1">
                    ({b.salesCountThisWeek})
                  </span>
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
          <p className="py-12 text-center text-slate-500">No branches yet</p>
        )}
      </div>
    </div>
  );
}
