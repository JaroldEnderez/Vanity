"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, X, Check, Clock, Download, Loader2 } from "lucide-react";
import { formatPHP } from "@/src/app/lib/money";
import { formatStockDisplayText, hasPackageMaterial } from "@/src/app/lib/materialPackage";
import {
  DEFAULT_SERVICE_CATEGORY,
  SERVICE_CATEGORIES,
  labelServiceCategory,
} from "@/src/app/types/service";

type Service = {
  id: string;
  name: string;
  category?: string;
  hairColoringFlow?: boolean;
  description: string | null;
  durationMin: number | null;
  price: number;
  isActive: boolean;
  usesMaterials: boolean;
};

type Props = {
  initialServices: Service[];
};

type ServiceForm = {
  name: string;
  category: string;
  hairColoringFlow: boolean;
  description: string;
  durationMin: number;
  price: number;
};

const emptyForm: ServiceForm = {
  name: "",
  category: DEFAULT_SERVICE_CATEGORY,
  hairColoringFlow: false,
  description: "",
  durationMin: 30,
  price: 0,
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

export default function ServicesManager({ initialServices }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [materialsModalServiceId, setMaterialsModalServiceId] = useState<string | null>(null);
  const [materialsModalRows, setMaterialsModalRows] = useState<Array<{ id?: string; materialId: string; quantity: number; material?: any }>>([]);
  const [materialsModalLoading, setMaterialsModalLoading] = useState(false);
  const [materialsModalSaving, setMaterialsModalSaving] = useState(false);
  const [materialsOptions, setMaterialsOptions] = useState<Array<{ id: string; name: string; unit: string; sku?: string; stock?: number }>>([]);
  const [addServiceError, setAddServiceError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const sortedServices = useMemo(
    () => [...services].sort((a, b) => a.name.localeCompare(b.name)),
    [services]
  );

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData({ ...emptyForm });
    setAddServiceError(null);
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setIsAddingNew(false);
    setFormData({
      name: service.name,
      category: service.category || DEFAULT_SERVICE_CATEGORY,
      hairColoringFlow: service.hairColoringFlow ?? false,
      description: service.description || "",
      durationMin: service.durationMin || 30,
      price: service.price,
    });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData(emptyForm);
    setAddServiceError(null);
  };

  const handleSaveNew = async () => {
    if (!formData.name.trim()) return;

    setAddServiceError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data.error === "string" ? data.error : "Failed to create service";
        setAddServiceError(
          res.status === 409 || message.toLowerCase().includes("already exists")
            ? "This service already exists."
            : message
        );
        return;
      }

      const newService = data;
      setServices([...services, newService]);
      setIsAddingNew(false);
      setFormData(emptyForm);
      setAddServiceError(null);
    } catch (error) {
      console.error(error);
      setAddServiceError(error instanceof Error ? error.message : "Failed to create service");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !formData.name.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/services/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update service");

      const updatedService = await res.json();
      setServices(services.map((s) => (s.id === editingId ? updatedService : s)));
      setEditingId(null);
      setFormData(emptyForm);
    } catch (error) {
      console.error(error);
      alert("Failed to update service");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/services/export");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === "string" ? err.error : "Export failed");
      }
      const blob = await res.blob();
      const filename =
        parseFilenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
        "services.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete service");

      setServices(services.filter((s) => s.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error(error);
      alert("Failed to delete service");
    } finally {
      setIsLoading(false);
    }
  };

  const openMaterialsModal = async (serviceId: string) => {
    setMaterialsModalServiceId(serviceId);
    setMaterialsModalLoading(true);
    try {
      const [res, matRes] = await Promise.all([
        fetch(`/api/services/${serviceId}/materials`),
        fetch(`/api/materials`),
      ]);
      if (!res.ok) throw new Error("Failed to load materials");
      if (!matRes.ok) throw new Error("Failed to load material options");
      const data = await res.json();
      const matData = await matRes.json();
      setMaterialsOptions(Array.isArray(matData) ? matData : []);
      // Map to editable rows
      const rows = (Array.isArray(data) ? data : []).map((r: any) => ({ id: r.id, materialId: r.materialId, quantity: r.quantity || 0, material: r.material }));
      setMaterialsModalRows(rows);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to load materials");
      setMaterialsModalRows([]);
    } finally {
      setMaterialsModalLoading(false);
    }
  };

  const closeMaterialsModal = () => {
    setMaterialsModalServiceId(null);
    setMaterialsModalRows([]);
    setMaterialsModalLoading(false);
    setMaterialsModalSaving(false);
  };

  const saveMaterialsModal = async () => {
    if (!materialsModalServiceId) return;
    setMaterialsModalSaving(true);
    try {
      const payload = { materials: materialsModalRows.map((r) => ({ materialId: r.materialId, quantity: r.quantity })) };
      const res = await fetch(`/api/services/${materialsModalServiceId}/materials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save materials");
      const updated = await res.json();
      // Close modal and optionally refresh
      closeMaterialsModal();
      // Optionally notify user
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to save materials");
    } finally {
      setMaterialsModalSaving(false);
    }
  };

  const addMaterialsModalRow = () => {
    setMaterialsModalRows((s) => [...s, { materialId: "", quantity: 0 }]);
  };

  const updateMaterialsModalRow = (index: number, patch: Partial<{ materialId: string; quantity: number }>) => {
    setMaterialsModalRows((s) => s.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeMaterialsModalRow = (index: number) => {
    setMaterialsModalRows((s) => s.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Add New Button */}
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Services</h1>
          <p className="text-slate-500">Manage your salon services and pricing</p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={exportLoading}
            className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 bg-white text-slate-800 rounded-md hover:bg-slate-50 shadow-sm transition disabled:opacity-50"
          >
            {exportLoading ? (
              <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
            ) : (
              <Download size={16} className="shrink-0" aria-hidden />
            )}
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleAddNew}
            disabled={isAddingNew}
            className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <Plus size={16} />
            Add Service
          </button>
        </div>
      </div>

      <div className="space-y-6">
      {/* Add New Service — separate card when adding */}
      {isAddingNew && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-md">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">Add new service</h2>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Service Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Category</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Description</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Duration</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Price</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Required materials</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-emerald-50">
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (addServiceError) setAddServiceError(null);
                    }}
                    placeholder="Service name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const category = e.target.value;
                      setFormData({
                        ...formData,
                        category,
                        hairColoringFlow: category === "HAIR" ? formData.hairColoringFlow : false,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {SERVICE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {labelServiceCategory(category)}
                      </option>
                    ))}
                  </select>
                  {formData.category === "HAIR" && (
                    <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={formData.hairColoringFlow}
                        onChange={(e) =>
                          setFormData({ ...formData, hairColoringFlow: e.target.checked })
                        }
                        className="mt-0.5 rounded border-slate-300"
                      />
                      <span>Hair coloring line (color / developer)</span>
                    </label>
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      value={formData.durationMin}
                      onChange={(e) => setFormData({ ...formData, durationMin: parseInt(e.target.value) || 0 })}
                      className="w-20 px-3 py-2 border border-slate-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-slate-500 text-sm">min</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-slate-500">₱</span>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-3 py-2 border border-slate-300 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-slate-400 text-sm">Save first</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleSaveNew}
                      disabled={isLoading || !formData.name.trim()}
                      className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-md transition disabled:opacity-50"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          {addServiceError && (
            <p className="px-4 py-3 text-sm text-red-600 bg-red-50 border-t border-red-100" role="alert">
              {addServiceError}
            </p>
          )}
        </div>
      )}

      {/* All services — single table */}
      {(sortedServices.length > 0 || isAddingNew) && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-md">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">All services</h2>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Service Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Category</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Description</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Duration</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Price</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Required materials</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No services yet.
                  </td>
                </tr>
              ) : (
                sortedServices.map((service) => (
              <tr key={service.id} className={editingId === service.id ? "bg-blue-50" : "hover:bg-slate-50"}>
                {editingId === service.id ? (
                  // Edit Mode
                  <>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select
                        value={formData.category}
                        onChange={(e) => {
                          const category = e.target.value;
                          setFormData({
                            ...formData,
                            category,
                            hairColoringFlow: category === "HAIR" ? formData.hairColoringFlow : false,
                          });
                        }}
                        className="w-full min-w-[8rem] px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {SERVICE_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {labelServiceCategory(category)}
                          </option>
                        ))}
                      </select>
                      {formData.category === "HAIR" && (
                        <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={formData.hairColoringFlow}
                            onChange={(e) =>
                              setFormData({ ...formData, hairColoringFlow: e.target.checked })
                            }
                            className="mt-0.5 rounded border-slate-300"
                          />
                          <span>Hair coloring line (color / developer)</span>
                        </label>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={formData.durationMin}
                          onChange={(e) => setFormData({ ...formData, durationMin: parseInt(e.target.value) || 0 })}
                          className="w-20 px-3 py-2 border border-slate-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-slate-500 text-sm">min</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-slate-500">₱</span>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-3 py-2 border border-slate-300 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400">
                      Not used
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={isLoading || !formData.name.trim()}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition disabled:opacity-50"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={isLoading}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // View Mode
                  <>
                    <td className="px-4 py-3">
                      <span className="font-normal text-slate-600">{service.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {labelServiceCategory(service.category)}
                      {service.hairColoringFlow ? (
                        <span className="block text-xs text-slate-400">Coloring line</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {service.description || <span className="text-slate-400 italic">No description</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Clock size={14} className="text-slate-400" />
                        {service.durationMin} min
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-slate-900">{formatPHP(service.price)}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      <button
                        type="button"
                        onClick={() => void openMaterialsModal(service.id)}
                        disabled={isAddingNew || editingId !== null}
                        className="text-slate-600 hover:text-slate-900 underline decoration-dotted underline-offset-4 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        {service.usesMaterials ? "Edit materials" : "Add materials"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {deleteConfirm === service.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDelete(service.id)}
                            disabled={isLoading}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-md transition text-xs font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            disabled={isLoading}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(service)}
                            disabled={isAddingNew || editingId !== null}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition disabled:opacity-50"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(service.id)}
                            disabled={isAddingNew || editingId !== null}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-md transition disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </>
                )}
              </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Empty State — single card when no services */}
      {services.length === 0 && !isAddingNew && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-md">
          <div className="px-4 py-12 text-center text-slate-500">
            No services yet. Click "Add Service" to create one.
          </div>
        </div>
      )}
      </div>

      {/* Materials Modal */}
      {materialsModalServiceId ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/40" onClick={closeMaterialsModal} />
          <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Edit Service Materials</h3>
              <div className="flex items-center gap-2">
                <button onClick={closeMaterialsModal} className="p-1 text-slate-500 hover:bg-slate-100 rounded-md">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4">
              {materialsModalLoading ? (
                <div className="text-center py-8">Loading…</div>
              ) : (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col className="w-[55%]" />
                        <col className="w-[15%]" />
                        <col className="w-[15%]" />
                        <col className="w-[15%]" />
                      </colgroup>
                      <thead>
                        <tr className="text-xs text-slate-500">
                          <th className="text-left px-2 py-2">Material</th>
                          <th className="text-right px-2 py-2">Stock</th>
                          <th className="text-right px-2 py-2">Quantity</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {materialsModalRows.map((row, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-2 py-2">
                              <select
                                value={row.materialId}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  const mat = materialsOptions.find((m) => m.id === id);
                                  updateMaterialsModalRow(i, { materialId: id, quantity: row.quantity });
                                  setMaterialsModalRows((s) => s.map((r, idx) => (idx === i ? { ...r, material: mat ?? undefined } : r)));
                                }}
                                className="w-full px-2 py-1 border border-slate-300 rounded-md"
                              >
                                <option value="">— choose material —</option>
                                {materialsOptions.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}{m.unit ? ` — ${m.unit}` : ""}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-2 text-right text-slate-600 text-sm">
                              {(() => {
                                const selected = materialsOptions.find((m) => m.id === row.materialId);
                                const stock = selected?.stock ?? row.material?.stock;
                                const unit = selected?.unit ?? row.material?.unit;
                                const packageAmount = selected?.packageAmount ?? row.material?.packageAmount;
                                const packageMeasure = selected?.packageMeasure ?? row.material?.packageMeasure;
                                if (stock == null || unit == null) return "—";
                                if (hasPackageMaterial({ packageAmount, packageMeasure })) {
                                  const { secondary } = formatStockDisplayText({ stock, unit, packageAmount, packageMeasure });
                                  return secondary || "—";
                                }
                                return `${stock}${unit ? ` ${unit}` : ""}`;
                              })()}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <input
                                type="number"
                                value={row.quantity}
                                onChange={(e) => updateMaterialsModalRow(i, { quantity: Number(e.target.value) || 0 })}
                                className="w-24 px-2 py-1 border border-slate-300 rounded-md text-right"
                              />
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button onClick={() => removeMaterialsModalRow(i)} className="text-red-600 px-2 py-1 text-xs">Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <button onClick={addMaterialsModalRow} className="px-3 py-1 bg-emerald-600 text-white rounded-md">Add material</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={closeMaterialsModal} className="px-3 py-1 border rounded-md">Cancel</button>
                      <button onClick={saveMaterialsModal} disabled={materialsModalSaving} className="px-3 py-1 bg-emerald-600 text-white rounded-md">{materialsModalSaving ? 'Saving…' : 'Save'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
