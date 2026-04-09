"use client";

import type { MaterialCategory, PackageMeasure } from "@prisma/client";
import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Package, AlertTriangle } from "lucide-react";
import {
  formatStockDisplayText,
  hasPackageMaterial,
  materialStockSeverity,
} from "@/src/app/lib/materialPackage";

type Material = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  category: MaterialCategory;
  packageAmount: number | null;
  packageMeasure: PackageMeasure | null;
};

type Props = {
  initialMaterials: Material[];
};

type MaterialForm = {
  name: string;
  unit: string;
  stock: number;
  stockUnits: number;
  category: MaterialCategory;
  packageAmount: number | "";
  packageMeasure: "" | PackageMeasure;
};

const emptyForm: MaterialForm = {
  name: "",
  unit: "pcs",
  stock: 0,
  stockUnits: 0,
  category: "OTHER",
  packageAmount: "",
  packageMeasure: "",
};

const CATEGORY_OPTIONS: { value: MaterialCategory; label: string }[] = [
  { value: "OTHER", label: "None (general)" },
  { value: "HAIR_COLOR", label: "Hair color" },
  { value: "DEVELOPER", label: "Developer" },
];

function categoryLabel(category: MaterialCategory): string {
  return CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;
}

const commonUnits = ["pcs", "ml", "g", "oz", "tube", "bottle", "box"];

function formHasCompletePackage(form: MaterialForm): boolean {
  return (
    form.packageAmount !== "" &&
    Number(form.packageAmount) > 0 &&
    form.packageMeasure !== ""
  );
}

function buildPayload(form: MaterialForm): Record<string, unknown> {
  const name = form.name.trim();
  if (formHasCompletePackage(form)) {
    const amt = Number(form.packageAmount);
    const units = Number(form.stockUnits);
    if (!Number.isFinite(units) || units < 0) {
      throw new Error("Units on hand must be zero or positive");
    }
    return {
      name,
      unit: form.unit,
      category: form.category,
      stock: units * amt,
      packageAmount: amt,
      packageMeasure: form.packageMeasure,
    };
  }
  if (form.packageAmount !== "" || form.packageMeasure !== "") {
    throw new Error("Set both package size and measure (ml or g), or leave both empty");
  }
  return {
    name,
    unit: form.unit,
    category: form.category,
    stock: form.stock,
    packageAmount: null,
    packageMeasure: null,
  };
}

function materialToForm(material: Material): MaterialForm {
  const pkg = hasPackageMaterial(material);
  return {
    name: material.name,
    unit: material.unit,
    stock: pkg ? 0 : material.stock,
    stockUnits:
      pkg && material.packageAmount
        ? material.stock / material.packageAmount
        : 0,
    category: material.category,
    packageAmount: material.packageAmount ?? "",
    packageMeasure: material.packageMeasure ?? "",
  };
}

export default function MaterialsManager({ initialMaterials }: Props) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MaterialForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleEdit = (material: Material) => {
    setEditingId(material.id);
    setIsAddingNew(false);
    setFormData(materialToForm(material));
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSaveNew = async () => {
    if (!formData.name.trim()) return;

    let payload: Record<string, unknown>;
    try {
      payload = buildPayload(formData);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Invalid form");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create material");
      }

      const newMaterial = await res.json();
      setMaterials([...materials, newMaterial]);
      setIsAddingNew(false);
      setFormData(emptyForm);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to create material");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !formData.name.trim()) return;

    let payload: Record<string, unknown>;
    try {
      payload = buildPayload(formData);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Invalid form");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/materials/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update material");
      }

      const updatedMaterial = await res.json();
      setMaterials(materials.map((m) => (m.id === editingId ? updatedMaterial : m)));
      setEditingId(null);
      setFormData(emptyForm);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to update material");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete material");

      setMaterials(materials.filter((m) => m.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error(error);
      alert("Failed to delete material");
    } finally {
      setIsLoading(false);
    }
  };

  const lowStockCount = materials.filter((m) => materialStockSeverity(m) !== "ok").length;

  const packageFormFields = (variant: "new" | "edit") => {
    const ring = variant === "new" ? "focus:ring-emerald-500" : "focus:ring-blue-500";
    return (
      <>
        <td className="px-4 py-3 align-top">
          <div className="flex flex-col gap-1.5 items-stretch max-w-[9rem] mx-auto">
            <input
              type="number"
              min={0}
              step="any"
              value={formData.packageAmount === "" ? "" : formData.packageAmount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setFormData({ ...formData, packageAmount: "" });
                  return;
                }
                const n = parseFloat(v);
                setFormData({
                  ...formData,
                  packageAmount: Number.isFinite(n) ? n : "",
                });
              }}
              placeholder="e.g. 1000"
              className={`w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 ${ring}`}
            />
            <select
              value={formData.packageMeasure}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  packageMeasure: e.target.value as "" | PackageMeasure,
                })
              }
              className={`w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 ${ring}`}
            >
              <option value="">No package tracking</option>
              <option value="ML">ml per {formData.unit || "unit"}</option>
              <option value="GRAM">g per {formData.unit || "unit"}</option>
            </select>
            <p className="text-[10px] text-slate-500 leading-tight">
              From packaging. Leave empty for simple count stock.
            </p>
          </div>
        </td>
        <td className="px-4 py-3 align-top">
          {formHasCompletePackage(formData) ? (
            <div className="flex flex-col items-center gap-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wide">Units on hand</label>
              <input
                type="number"
                min={0}
                step="any"
                value={formData.stockUnits}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stockUnits: parseFloat(e.target.value) || 0,
                  })
                }
                className={`w-24 px-2 py-2 border border-slate-300 rounded-md text-center text-sm focus:outline-none focus:ring-2 ${ring}`}
              />
            </div>
          ) : (
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
              className={`w-24 mx-auto block px-3 py-2 border border-slate-300 rounded-md text-center focus:outline-none focus:ring-2 ${ring}`}
            />
          )}
        </td>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500">Manage materials and supplies</p>
        </div>
        <button
          onClick={handleAddNew}
          disabled={isAddingNew}
          className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition disabled:opacity-50"
        >
          <Plus size={16} />
          Add Material
        </button>
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <AlertTriangle size={18} />
          <span className="text-sm">
            {lowStockCount} material{lowStockCount > 1 ? "s" : ""} running low on stock
          </span>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Material Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 min-w-[11rem]">Type</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Unit</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600 min-w-[10rem]">
                  Package size
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Stock</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isAddingNew && (
                <tr className="bg-emerald-50">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Material name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value as MaterialCategory })
                      }
                      className="w-full max-w-[13rem] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {commonUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </td>
                  {packageFormFields("new")}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveNew}
                        disabled={isLoading || !formData.name.trim()}
                        className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-md transition disabled:opacity-50"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {materials.map((material) => (
                <tr
                  key={material.id}
                  className={editingId === material.id ? "bg-blue-50" : "hover:bg-slate-50"}
                >
                  {editingId === material.id ? (
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
                      <td className="px-4 py-3">
                        <select
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({ ...formData, category: e.target.value as MaterialCategory })
                          }
                          className="w-full max-w-[13rem] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {commonUnits.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </td>
                      {packageFormFields("edit")}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={isLoading || !formData.name.trim()}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition disabled:opacity-50"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            type="button"
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
                    <>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package size={16} className="text-slate-400" />
                          <span className="font-medium text-slate-900">{material.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{categoryLabel(material.category)}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{material.unit}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">
                        {hasPackageMaterial(material) ? (
                          <span>
                            {material.packageAmount}{" "}
                            {material.packageMeasure === "ML" ? "ml" : "g"} / {material.unit}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const sev = materialStockSeverity(material);
                          const { primary, secondary } = formatStockDisplayText(material);
                          return (
                            <div>
                              <span
                                className={`font-medium ${
                                  sev === "red"
                                    ? "text-red-600"
                                    : sev === "amber"
                                      ? "text-amber-600"
                                      : "text-slate-900"
                                }`}
                              >
                                {primary}
                              </span>
                              {secondary ? (
                                <span className="block text-xs text-slate-500 mt-0.5">{secondary}</span>
                              ) : null}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {deleteConfirm === material.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(material.id)}
                              disabled={isLoading}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-md transition text-xs font-medium"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
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
                              type="button"
                              onClick={() => handleEdit(material)}
                              disabled={isAddingNew || editingId !== null}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition disabled:opacity-50"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(material.id)}
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
              ))}

              {materials.length === 0 && !isAddingNew && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No materials yet. Click &quot;Add Material&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
