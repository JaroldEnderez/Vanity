"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Package, AlertTriangle } from "lucide-react";

type Material = {
  id: string;
  name: string;
  unit: string;
  stock: number;
};

type Props = {
  initialMaterials: Material[];
};

type MaterialForm = {
  name: string;
  unit: string;
  stock: number;
};

const emptyForm: MaterialForm = {
  name: "",
  unit: "pcs",
  stock: 0,
};

const commonUnits = ["pcs", "ml", "g", "oz", "tube", "bottle", "box"];

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
    setFormData({
      name: material.name,
      unit: material.unit,
      stock: material.stock,
    });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSaveNew = async () => {
    if (!formData.name.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to create material");

      const newMaterial = await res.json();
      setMaterials([...materials, newMaterial]);
      setIsAddingNew(false);
      setFormData(emptyForm);
    } catch (error) {
      console.error(error);
      alert("Failed to create material");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !formData.name.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/materials/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update material");

      const updatedMaterial = await res.json();
      setMaterials(materials.map((m) => (m.id === editingId ? updatedMaterial : m)));
      setEditingId(null);
      setFormData(emptyForm);
    } catch (error) {
      console.error(error);
      alert("Failed to update material");
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

  const lowStockCount = materials.filter((m) => m.stock <= 10).length;

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Low Stock Warning */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <AlertTriangle size={18} />
          <span className="text-sm">
            {lowStockCount} material{lowStockCount > 1 ? "s" : ""} running low on stock
          </span>
        </div>
      )}

      {/* Materials Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">
                Material Name
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                Unit
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                Stock
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-slate-600 w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {/* Add New Row */}
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
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                    className="w-24 mx-auto block px-3 py-2 border border-slate-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </td>
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
            )}

            {/* Existing Materials */}
            {materials.map((material) => (
              <tr key={material.id} className={editingId === material.id ? "bg-blue-50" : "hover:bg-slate-50"}>
                {editingId === material.id ? (
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
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                        className="w-24 mx-auto block px-3 py-2 border border-slate-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-slate-400" />
                        <span className="font-medium text-slate-900">{material.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {material.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-medium ${
                          material.stock <= 10
                            ? "text-red-600"
                            : material.stock <= 25
                            ? "text-amber-600"
                            : "text-slate-900"
                        }`}
                      >
                        {material.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {deleteConfirm === material.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDelete(material.id)}
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
                            onClick={() => handleEdit(material)}
                            disabled={isAddingNew || editingId !== null}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition disabled:opacity-50"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
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

            {/* Empty State */}
            {materials.length === 0 && !isAddingNew && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                  No materials yet. Click "Add Material" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
