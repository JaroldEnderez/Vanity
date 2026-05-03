"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, Wallet, Download, Loader2 } from "lucide-react";
import { formatPHP } from "@/src/app/lib/money";

export type ExpenseRow = {
  id: string;
  branchId: string;
  date: string;
  item: string;
  amount: number;
  remarks: string | null;
  createdAt: string;
};

type FormState = {
  date: string;
  item: string;
  amount: string;
  remarks: string;
};

function todayDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const emptyForm = (): FormState => ({
  date: todayDateInput(),
  item: "",
  amount: "",
  remarks: "",
});

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

function toRow(e: {
  id: string;
  branchId: string;
  date: string | Date;
  item: string;
  amount: number;
  remarks: string | null;
  createdAt: string | Date;
}): ExpenseRow {
  return {
    id: e.id,
    branchId: e.branchId,
    item: e.item,
    amount: e.amount,
    remarks: e.remarks,
    date: typeof e.date === "string" ? e.date : new Date(e.date).toISOString(),
    createdAt: typeof e.createdAt === "string" ? e.createdAt : new Date(e.createdAt).toISOString(),
  };
}

export default function ExpensesManager() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalListed = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data.map(toRow) : []);
      setError(null);
    } catch {
      setError("Failed to load expenses");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleExportCsv = async () => {
    setExportLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/expenses/export");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : "Export failed");
      }
      const blob = await res.blob();
      const filename =
        parseFilenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
        "expenses.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData(emptyForm());
  };

  const handleEdit = (e: ExpenseRow) => {
    setEditingId(e.id);
    setIsAddingNew(false);
    const d = new Date(e.date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setFormData({
      date: `${y}-${m}-${day}`,
      item: e.item,
      amount: String(e.amount),
      remarks: e.remarks ?? "",
    });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData(emptyForm());
  };

  const parseAmount = (): number | null => {
    const n = Number.parseFloat(formData.amount.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };

  const itemOk = formData.item.trim().length > 0;

  const handleSaveNew = async () => {
    const amount = parseAmount();
    if (amount === null || !itemOk) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(`${formData.date}T12:00:00`).toISOString(),
          item: formData.item.trim(),
          amount,
          remarks: formData.remarks.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create expense");
      setExpenses((prev) => [toRow(data), ...prev]);
      setIsAddingNew(false);
      setFormData(emptyForm());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create expense");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const amount = parseAmount();
    if (amount === null || !itemOk) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(`${formData.date}T12:00:00`).toISOString(),
          item: formData.item.trim(),
          amount,
          remarks: formData.remarks.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update expense");
      setExpenses((prev) => prev.map((x) => (x.id === editingId ? toRow(data) : x)));
      setEditingId(null);
      setFormData(emptyForm());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update expense");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete expense");
      setExpenses((prev) => prev.filter((x) => x.id !== id));
      setDeleteConfirmId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete expense");
    }
  };

  const formatExpenseDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const saveDisabled = isSaving || parseAmount() === null || !itemOk;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <Wallet size={22} />
          Finance — Expenses
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={exportLoading || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 shadow-sm"
          >
            {exportLoading ? (
              <Loader2 size={18} className="animate-spin shrink-0" aria-hidden />
            ) : (
              <Download size={18} className="shrink-0" aria-hidden />
            )}
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm"
          >
            <Plus size={18} />
            Add expense
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-600 max-w-2xl">
        Record branch expenses as date, item, and amount. Optional remarks for extra detail. Export
        matches this full list. Sales History uses the same rows for profit (by expense date in your
        selected range).
      </p>

      {!loading && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          <span className="text-slate-600">Total recorded (this list): </span>
          <span className="font-semibold tabular-nums">{formatPHP(totalListed)}</span>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isAddingNew && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <h3 className="font-medium text-slate-900 mb-3">New expense</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Amount *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={formData.amount}
                onChange={(e) => setFormData((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Item *</label>
              <input
                type="text"
                value={formData.item}
                onChange={(e) => setFormData((f) => ({ ...f, item: e.target.value }))}
                placeholder="e.g. Water bill, Color supplies, Delivery fee"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Remarks (optional)</label>
              <input
                type="text"
                value={formData.remarks}
                onChange={(e) => setFormData((f) => ({ ...f, remarks: e.target.value }))}
                placeholder="Additional notes"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={handleSaveNew}
              disabled={saveDisabled}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No expenses yet. Add costs for this branch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Item</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-700">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Remarks</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-b-0">
                    {editingId === e.id ? (
                      <>
                        <td className="py-2 px-4 align-top">
                          <input
                            type="date"
                            value={formData.date}
                            onChange={(ev) =>
                              setFormData((f) => ({ ...f, date: ev.target.value }))
                            }
                            className="w-full min-w-[9rem] px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-2 px-4 align-top">
                          <input
                            type="text"
                            value={formData.item}
                            onChange={(ev) =>
                              setFormData((f) => ({ ...f, item: ev.target.value }))
                            }
                            className="w-full min-w-[10rem] px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-2 px-4 align-top">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={formData.amount}
                            onChange={(ev) =>
                              setFormData((f) => ({ ...f, amount: ev.target.value }))
                            }
                            className="w-full min-w-[5rem] px-2 py-1.5 border border-slate-300 rounded text-sm text-right tabular-nums"
                          />
                        </td>
                        <td className="py-2 px-4 align-top">
                          <input
                            type="text"
                            value={formData.remarks}
                            onChange={(ev) =>
                              setFormData((f) => ({ ...f, remarks: ev.target.value }))
                            }
                            className="w-full min-w-[8rem] px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-2 px-4 text-right align-top">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={saveDisabled}
                            className="text-emerald-600 hover:underline mr-2 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="text-slate-600 hover:underline"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 text-slate-800 whitespace-nowrap">
                          {formatExpenseDate(e.date)}
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-medium">{e.item}</td>
                        <td className="py-3 px-4 text-right font-medium tabular-nums text-slate-900">
                          {formatPHP(e.amount)}
                        </td>
                        <td
                          className="py-3 px-4 text-slate-600 max-w-[14rem] truncate"
                          title={e.remarks ?? ""}
                        >
                          {e.remarks?.trim() ? e.remarks : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleEdit(e)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition mr-1"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          {deleteConfirmId === e.id ? (
                            <span className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(e.id)}
                                className="text-xs text-red-600 font-medium hover:underline"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-xs text-slate-600 hover:underline"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(e.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
