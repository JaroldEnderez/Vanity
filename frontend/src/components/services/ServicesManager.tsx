"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, Clock, Package, ChevronUp, ChevronDown } from "lucide-react";

type Material = {
  id: string;
  name: string;
  unit: string;
  stock: number;
};

type ServiceMaterial = {
  id: string;
  materialId: string;
  quantity: number;
  material: Material;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number | null;
  price: number;
  isActive: boolean;
  usesMaterials: boolean;
  materials?: ServiceMaterial[];
};

type Props = {
  initialServices: Service[];
  initialMaterials?: Material[];
};

type ServiceForm = {
  name: string;
  description: string;
  durationMin: number;
  price: number;
};

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  durationMin: 30,
  price: 0,
};

export default function ServicesManager({ initialServices, initialMaterials = [] }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Materials modal state
  const [materialsModalServiceId, setMaterialsModalServiceId] = useState<string | null>(null);
  const [serviceMaterials, setServiceMaterials] = useState<Array<{ materialId: string; quantity: number }>>([]);
  const [isSavingMaterials, setIsSavingMaterials] = useState(false);

  // Fetch materials on mount if not provided
  useEffect(() => {
    if (initialMaterials.length === 0) {
      fetch("/api/materials")
        .then((res) => res.json())
        .then(setMaterials)
        .catch(console.error);
    }
  }, [initialMaterials.length]);

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setIsAddingNew(false);
    setFormData({
      name: service.name,
      description: service.description || "",
      durationMin: service.durationMin || 30,
      price: service.price,
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
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to create service");

      const newService = await res.json();
      setServices([...services, { ...newService, materials: [] }]);
      setIsAddingNew(false);
      setFormData(emptyForm);
    } catch (error) {
      console.error(error);
      alert("Failed to create service");
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
      setServices(services.map((s) => (s.id === editingId ? { ...updatedService, materials: s.materials } : s)));
      setEditingId(null);
      setFormData(emptyForm);
    } catch (error) {
      console.error(error);
      alert("Failed to update service");
    } finally {
      setIsLoading(false);
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

  // Materials modal handlers
  const openMaterialsModal = async (serviceId: string) => {
    setMaterialsModalServiceId(serviceId);
    try {
      const res = await fetch(`/api/services/${serviceId}/materials`);
      const data = await res.json();
      setServiceMaterials(
        data.map((sm: ServiceMaterial) => ({
          materialId: sm.materialId,
          quantity: sm.quantity,
        }))
      );
    } catch (error) {
      console.error(error);
      setServiceMaterials([]);
    }
  };

  const closeMaterialsModal = () => {
    setMaterialsModalServiceId(null);
    setServiceMaterials([]);
  };

  const addMaterialToService = () => {
    // Find first material not already added
    const availableMaterial = materials.find(
      (m) => !serviceMaterials.some((sm) => sm.materialId === m.id)
    );
    if (availableMaterial) {
      setServiceMaterials([
        ...serviceMaterials,
        { materialId: availableMaterial.id, quantity: 1 },
      ]);
    }
  };

  const updateMaterialQuantity = (materialId: string, delta: number) => {
    setServiceMaterials(
      serviceMaterials.map((sm) =>
        sm.materialId === materialId
          ? { ...sm, quantity: Math.max(1, sm.quantity + delta) }
          : sm
      )
    );
  };

  const setMaterialQuantity = (materialId: string, quantity: number) => {
    setServiceMaterials(
      serviceMaterials.map((sm) =>
        sm.materialId === materialId
          ? { ...sm, quantity: Math.max(1, quantity) }
          : sm
      )
    );
  };

  const removeMaterialFromService = (materialId: string) => {
    setServiceMaterials(serviceMaterials.filter((sm) => sm.materialId !== materialId));
  };

  const changeMaterial = (oldMaterialId: string, newMaterialId: string) => {
    setServiceMaterials(
      serviceMaterials.map((sm) =>
        sm.materialId === oldMaterialId ? { ...sm, materialId: newMaterialId } : sm
      )
    );
  };

  const saveMaterials = async () => {
    if (!materialsModalServiceId) return;

    setIsSavingMaterials(true);
    try {
      const res = await fetch(`/api/services/${materialsModalServiceId}/materials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materials: serviceMaterials }),
      });

      if (!res.ok) throw new Error("Failed to save materials");

      const updatedMaterials = await res.json();

      // Update local service state
      setServices(
        services.map((s) =>
          s.id === materialsModalServiceId
            ? { ...s, usesMaterials: serviceMaterials.length > 0, materials: updatedMaterials }
            : s
        )
      );

      closeMaterialsModal();
    } catch (error) {
      console.error(error);
      alert("Failed to save materials");
    } finally {
      setIsSavingMaterials(false);
    }
  };

  const getServiceMaterialCount = (service: Service) => {
    return service.materials?.length || 0;
  };

  return (
    <div className="space-y-4">
      {/* Add New Button */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Services</h1>
          <p className="text-slate-500">Manage your salon services and pricing</p>
        </div>
        <button
          onClick={handleAddNew}
          disabled={isAddingNew}
          className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition disabled:opacity-50"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">
                Service Name
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">
                Description
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                Duration
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">
                Price
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                Materials
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
                    placeholder="Service name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
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
                <td className="px-4 py-3 text-center text-slate-400 text-sm">
                  Save first
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

            {/* Existing Services */}
            {services.map((service) => (
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
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openMaterialsModal(service.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded transition"
                      >
                        <Package size={14} />
                        {getServiceMaterialCount(service)}
                      </button>
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
                      <span className="font-medium text-slate-900">{service.name}</span>
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
                      <span className="font-medium text-slate-900">₱{service.price.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openMaterialsModal(service.id)}
                        disabled={isAddingNew || editingId !== null}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition disabled:opacity-50 ${
                          getServiceMaterialCount(service) > 0
                            ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                            : "text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        <Package size={14} />
                        {getServiceMaterialCount(service) > 0
                          ? `${getServiceMaterialCount(service)} item${getServiceMaterialCount(service) > 1 ? "s" : ""}`
                          : "None"}
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
            ))}

            {/* Empty State */}
            {services.length === 0 && !isAddingNew && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No services yet. Click "Add Service" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


      {/* Materials Modal */}
      {materialsModalServiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                Materials for {services.find((s) => s.id === materialsModalServiceId)?.name}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Set default materials and quantities used per service
              </p>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {serviceMaterials.length === 0 ? (
                <p className="text-center text-slate-500 py-4">
                  No materials assigned. Add materials below.
                </p>
              ) : (
                serviceMaterials.map((sm) => {
                  const material = materials.find((m) => m.id === sm.materialId);
                  return (
                    <div
                      key={sm.materialId}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      {/* Material Select */}
                      <select
                        value={sm.materialId}
                        onChange={(e) => changeMaterial(sm.materialId, e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {materials.map((m) => (
                          <option
                            key={m.id}
                            value={m.id}
                            disabled={serviceMaterials.some(
                              (existing) => existing.materialId === m.id && existing.materialId !== sm.materialId
                            )}
                          >
                            {m.name} ({m.unit})
                          </option>
                        ))}
                      </select>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-slate-300 rounded-md">
                        <button
                          onClick={() => updateMaterialQuantity(sm.materialId, -1)}
                          className="p-1.5 hover:bg-slate-100 transition"
                        >
                          <ChevronDown size={16} className="text-slate-600" />
                        </button>
                        <input
                          type="number"
                          value={sm.quantity}
                          onChange={(e) => setMaterialQuantity(sm.materialId, parseFloat(e.target.value) || 1)}
                          step="1"
                          min="1"
                          className="w-14 text-center text-sm border-x border-slate-300 py-1.5 focus:outline-none"
                        />
                        <button
                          onClick={() => updateMaterialQuantity(sm.materialId, 1)}
                          className="p-1.5 hover:bg-slate-100 transition"
                        >
                          <ChevronUp size={16} className="text-slate-600" />
                        </button>
                      </div>

                      {/* Unit Label */}
                      <span className="text-sm text-slate-500 w-10">{material?.unit}</span>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeMaterialFromService(sm.materialId)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })
              )}

              {/* Add Material Button */}
              {materials.length > serviceMaterials.length && (
                <button
                  onClick={addMaterialToService}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-emerald-400 hover:text-emerald-600 transition"
                >
                  <Plus size={18} />
                  Add Material
                </button>
              )}

              {materials.length === 0 && (
                <p className="text-center text-amber-600 text-sm py-2">
                  No materials in inventory. Add materials in the Inventory page first.
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={closeMaterialsModal}
                disabled={isSavingMaterials}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition"
              >
                Cancel
              </button>
              <button
                onClick={saveMaterials}
                disabled={isSavingMaterials}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isSavingMaterials ? "Saving..." : "Save Materials"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
