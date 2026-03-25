"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Users } from "lucide-react";
import { WALK_IN_CUSTOMER_ID } from "@/src/app/lib/walkInCustomer";

export type CustomerRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  fb: string | null;
  dateOfBirth: string | null;
  createdAt?: string;
};

type FormState = {
  name: string;
  address: string;
  contact: string;
  fb: string;
  dateOfBirth: string;
};

const emptyForm: FormState = { name: "", address: "", contact: "", fb: "", dateOfBirth: "" };

function toRow(c: { id: string; name: string; address?: string | null; phone?: string | null; fb?: string | null; dateOfBirth?: string | Date | null; createdAt?: string }): CustomerRow {
  return {
    id: c.id,
    name: c.name,
    address: c.address ?? null,
    phone: c.phone ?? null,
    fb: c.fb ?? null,
    dateOfBirth: c.dateOfBirth ? (typeof c.dateOfBirth === "string" ? c.dateOfBirth : new Date(c.dateOfBirth).toISOString()) : null,
    createdAt: c.createdAt,
  };
}

export default function CustomersManager() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers?limit=500");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data.map(toRow) : []);
      setError(null);
    } catch (e) {
      setError("Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleEdit = (c: CustomerRow) => {
    setEditingId(c.id);
    setIsAddingNew(false);
    setFormData({
      name: c.name,
      address: c.address ?? "",
      contact: c.phone ?? "",
      fb: c.fb ?? "",
      dateOfBirth: c.dateOfBirth ? c.dateOfBirth.slice(0, 10) : "",
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
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address: formData.address.trim() || undefined,
          phone: formData.contact.trim() || undefined,
          fb: formData.fb.trim() || undefined,
          dateOfBirth: formData.dateOfBirth.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");
      setCustomers((prev) => [toRow(data), ...prev]);
      setIsAddingNew(false);
      setFormData(emptyForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create customer");
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
      const res = await fetch(`/api/customers/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address: formData.address.trim() || null,
          phone: formData.contact.trim() || null,
          fb: formData.fb.trim() || null,
          dateOfBirth: formData.dateOfBirth.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update customer");
      setCustomers((prev) =>
        prev.map((c) => (c.id === editingId ? toRow(data) : c))
      );
      setEditingId(null);
      setFormData(emptyForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete customer");
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirmId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete customer");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <Users size={22} />
          Customers
        </h1>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm"
        >
          <Plus size={18} />
          Add customer
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Add new form */}
      {isAddingNew && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <h3 className="font-medium text-slate-900 mb-3">New customer</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street, city, etc."
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Contact</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData((f) => ({ ...f, contact: e.target.value }))}
                placeholder="e.g. 09171234567"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Fb</label>
              <input
                type="text"
                value={formData.fb}
                onChange={(e) => setFormData((f) => ({ ...f, fb: e.target.value }))}
                placeholder="Facebook profile or link"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Date of birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData((f) => ({ ...f, dateOfBirth: e.target.value }))}
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

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No customers yet. Add one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Address</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Fb</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Date of birth</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-b-0">
                    {editingId === c.id ? (
                      <>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Name"
                            className="w-full min-w-[120px] px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
                            placeholder="Address"
                            className="w-full min-w-[120px] px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={formData.contact}
                            onChange={(e) => setFormData((f) => ({ ...f, contact: e.target.value }))}
                            placeholder="Contact"
                            className="w-full min-w-[100px] px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={formData.fb}
                            onChange={(e) => setFormData((f) => ({ ...f, fb: e.target.value }))}
                            placeholder="Fb"
                            className="w-full min-w-[100px] px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="py-2 px-4">
                          <input
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => setFormData((f) => ({ ...f, dateOfBirth: e.target.value }))}
                            className="w-full min-w-[120px] px-2 py-1.5 border border-slate-300 rounded text-sm"
                          />
                        </td>
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
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {c.name}
                          {c.id === WALK_IN_CUSTOMER_ID && (
                            <span className="ml-2 text-xs font-normal text-slate-500">(default for walk-in sales)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate" title={c.address ?? undefined}>{c.address ?? "—"}</td>
                        <td className="py-3 px-4 text-slate-600">{c.phone ?? "—"}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-[120px] truncate" title={c.fb ?? undefined}>{c.fb ?? "—"}</td>
                        <td className="py-3 px-4 text-slate-600">{c.dateOfBirth ? c.dateOfBirth.slice(0, 10) : "—"}</td>
                        <td className="py-3 px-4 text-right">
                          {c.id === WALK_IN_CUSTOMER_ID ? (
                            <span className="text-xs text-slate-400">System</span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(c)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition mr-1"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              {deleteConfirmId === c.id ? (
                                <span className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(c.id)}
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
                                  onClick={() => setDeleteConfirmId(c.id)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </>
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
