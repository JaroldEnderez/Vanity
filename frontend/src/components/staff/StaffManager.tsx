"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";

export type StaffRow = {
  id: string;
  name: string;
  role: string | null;
  branchId: string | null;
  createdAt: string;
};

type FormState = {
  name: string;
  role: string;
};

const emptyForm: FormState = { name: "", role: "" };

function toRow(s: {
  id: string;
  name: string;
  role?: string | null;
  branchId?: string | null;
  createdAt: string | Date;
}): StaffRow {
  return {
    id: s.id,
    name: s.name,
    role: s.role ?? null,
    branchId: s.branchId ?? null,
    createdAt: typeof s.createdAt === "string" ? s.createdAt : new Date(s.createdAt).toISOString(),
  };
}

export default function StaffManager() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStaff(Array.isArray(data) ? data.map(toRow) : []);
      setError(null);
    } catch {
      setError("Failed to load staff");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleEdit = (s: StaffRow) => {
    setEditingId(s.id);
    setIsAddingNew(false);
    setFormData({
      name: s.name,
      role: s.role ?? "",
    });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSaveNew = async () => {
    const name = formData.name.trim();
    if (!name) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role: formData.role.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create staff");
      setStaff((prev) => [toRow(data), ...prev]);
      setIsAddingNew(false);
      setFormData(emptyForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create staff");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const name = formData.name.trim();
    if (!name) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role: formData.role.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update staff");
      setStaff((prev) => prev.map((s) => (s.id === editingId ? toRow(data) : s)));
      setEditingId(null);
      setFormData(emptyForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update staff");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete staff");
      setStaff((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirmId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete staff");
    }
  };

  const formatDate = (iso: string) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <UserCog size={22} />
          Staff
        </h1>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm"
        >
          <Plus size={18} />
          Add staff
        </button>
      </div>

      <p className="text-sm text-slate-600 max-w-2xl">
        Team members for this branch. New sessions use the first staff member by default on the orders
        page until you add more and wire per-session selection.
      </p>

      {error && (
        <div className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isAddingNew && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <h3 className="font-medium text-slate-900 mb-3">New staff member</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Maria Santos"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Senior stylist, Reception"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveNew}
              disabled={isSaving || !formData.name.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
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
          <div className="p-8 text-center text-slate-500">Loading staff...</div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No staff yet. Add team members to use them on sessions and sales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Added</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-b-0">
                    {editingId === s.id ? (
                      <>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                            className="w-full min-w-[120px] px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={formData.role}
                            onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value }))}
                            placeholder="Role"
                            className="w-full min-w-[120px] px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(s.createdAt)}</td>
                        <td className="py-2 px-4 text-right">
                          <button
                            onClick={handleSaveEdit}
                            disabled={isSaving || !formData.name.trim()}
                            className="text-emerald-600 hover:underline mr-2 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
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
                        <td className="py-3 px-4 font-medium text-slate-900">{s.name}</td>
                        <td className="py-3 px-4 text-slate-600">{s.role ?? "—"}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDate(s.createdAt)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleEdit(s)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition mr-1"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          {deleteConfirmId === s.id ? (
                            <span className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(s.id)}
                                className="text-xs text-red-600 font-medium hover:underline"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-xs text-slate-600 hover:underline"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(s.id)}
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
