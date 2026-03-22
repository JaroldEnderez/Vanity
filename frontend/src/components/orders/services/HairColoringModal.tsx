"use client";

import { useEffect, useState } from "react";
import { Service } from "@/src/app/types/service";
import type { ColoringDetails } from "@/src/app/store/saleStore";
import { X } from "lucide-react";

type Staff = { id: string; name: string; role: string | null };

type Props = {
  service: Service;
  onConfirm: (details: ColoringDetails) => void;
  onCancel: () => void;
};

const LABELS: Record<keyof ColoringDetails, string> = {
  serviceDisplayName: "Service",
  colorUsed: "Color",
  developer: "Developer",
  itemStaffName: "Staff",
  remarks: "Remarks",
};

type Material = {
  id: string;
  name: string;
  brand?: string | null;
  productName?: string | null;
  category?: string | null;
  unit: string;
  stock: number;
};

export default function HairColoringModal({ service, onConfirm, onCancel }: Props) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [colorUsed, setColorUsed] = useState("");
  const [developer, setDeveloper] = useState("");
  const [itemStaffName, setItemStaffName] = useState("");
  const [remarks, setRemarks] = useState("");

  const colorVariants = materials.filter((m) => m.category === "HAIR_COLOR");
  const developerVariants = materials.filter((m) => m.category === "DEVELOPER");

  const formatVariantLabel = (m: Material) =>
    `${m.brand ? m.brand + " " : ""}${m.productName ? m.productName + " " : ""}${m.name}`;

  useEffect(() => {
    Promise.all([
      fetch("/api/staff?stylists=true").then((res) => res.json()),
      fetch("/api/materials").then((res) => res.json()),
    ])
      .then(([staffData, materialsData]) => {
        setStaff(Array.isArray(staffData) ? staffData : []);
        setMaterials(Array.isArray(materialsData) ? materialsData : []);
      })
      .catch(() => {
        setStaff([]);
        setMaterials([]);
      });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      serviceDisplayName: service.name,
      colorUsed: colorUsed.trim() || undefined,
      developer: developer.trim() || undefined,
      itemStaffName: itemStaffName.trim() || undefined,
      remarks: remarks.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hair-coloring-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="hair-coloring-title" className="text-lg font-semibold text-slate-900">
            Hair Coloring Details
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {LABELS.serviceDisplayName}
            </label>
            <div className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700">
              {service.name}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {LABELS.colorUsed}
            </label>
            <select
              value={colorUsed}
              onChange={(e) => setColorUsed(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select color...</option>
              {colorVariants.map((m) => (
                <option key={m.id} value={formatVariantLabel(m)}>
                  {formatVariantLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {LABELS.developer}
            </label>
            <select
              value={developer}
              onChange={(e) => setDeveloper(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select developer...</option>
              {developerVariants.map((m) => (
                <option key={m.id} value={formatVariantLabel(m)}>
                  {formatVariantLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {LABELS.itemStaffName}
            </label>
            <select
              value={itemStaffName}
              onChange={(e) => setItemStaffName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select staff...</option>
              {staff.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} {s.role ? `(${s.role})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {LABELS.remarks} <span className="text-slate-400 font-normal">(personal notes)</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Personal notes..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Add to sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
