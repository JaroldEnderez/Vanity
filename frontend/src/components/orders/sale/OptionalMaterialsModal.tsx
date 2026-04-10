"use client";

import { useEffect, useMemo, useState } from "react";
import type { PackageMeasure } from "@prisma/client";
import { Search, X, Plus } from "lucide-react";
import type { DraftMaterial } from "@/src/app/store/saleStore";
import {
  draftMaterialUsesPackage,
  formatMeasureAbbrev,
  minSaleMaterialQuantity,
} from "@/src/app/lib/materialPackage";

type InventoryRow = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  packageAmount?: number | null;
  packageMeasure?: PackageMeasure | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialSelection: DraftMaterial[];
  initialRemarks?: string;
  onSave: (materials: DraftMaterial[], remarks: string) => void;
};

function toDraft(inv: InventoryRow, quantity: number): DraftMaterial {
  return {
    materialId: inv.id,
    name: inv.name,
    unit: inv.unit,
    quantity,
    packageAmount: inv.packageAmount ?? null,
    packageMeasure: inv.packageMeasure ?? null,
  };
}

export default function OptionalMaterialsModal({
  open,
  onClose,
  initialSelection,
  initialRemarks = "",
  onSave,
}: Props) {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DraftMaterial[]>([]);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelected(initialSelection.map((m) => ({ ...m })));
    setRemarks(initialRemarks);
    fetch("/api/materials")
      .then((res) => res.json())
      .then((data) => {
        setInventory(Array.isArray(data) ? data : []);
      })
      .catch(() => setInventory([]));
    // Snapshot initialSelection when the modal opens (open becomes true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.unit.toLowerCase().includes(q)
    );
  }, [inventory, search]);

  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.materialId)),
    [selected]
  );

  const addFromInventory = (inv: InventoryRow) => {
    if (selectedIds.has(inv.id)) return;
    const d = toDraft(inv, 1);
    const minQ = minSaleMaterialQuantity(d);
    setSelected((s) => [...s, { ...d, quantity: minQ }]);
  };

  const adjustQty = (materialId: string, quantity: number) => {
    setSelected((s) =>
      s.map((m) => {
        if (m.materialId !== materialId) return m;
        const minQ = minSaleMaterialQuantity(m);
        return { ...m, quantity: Math.max(minQ, quantity) };
      })
    );
  };

  const removeRow = (materialId: string) => {
    setSelected((s) => s.filter((x) => x.materialId !== materialId));
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="optional-materials-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="optional-materials-title" className="text-lg font-semibold text-slate-900">
            Optional materials used
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inventory…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <p className="text-xs text-slate-500">
            Tap a row to add. Adjust quantities below. This is optional and adds to stock usage at checkout.
          </p>
        </div>

        <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto border-b border-slate-100">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 text-center">No materials match.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((m) => {
                const added = selectedIds.has(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => addFromInventory(m)}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition ${
                        added
                          ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                          : "hover:bg-emerald-50 text-slate-800"
                      }`}
                    >
                      <span className="truncate font-medium">{m.name}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                        <span>
                          Stock {m.stock} {m.unit}
                        </span>
                        {!added && <Plus size={14} className="text-emerald-600" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-4 flex-1 min-h-[120px] max-h-[200px] overflow-y-auto">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
            Selected
          </h3>
          {selected.length === 0 ? (
            <p className="text-sm text-slate-500">None yet — add from the list above.</p>
          ) : (
            <ul className="space-y-2">
              {selected.map((m) => {
                const minQ = minSaleMaterialQuantity(m);
                const step = 1;
                const pkg = draftMaterialUsesPackage(m);
                const unitLabel = pkg
                  ? formatMeasureAbbrev(m.packageMeasure!)
                  : m.unit;
                return (
                  <li
                    key={m.materialId}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm text-slate-800 truncate flex-1">{m.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => adjustQty(m.materialId, Math.max(minQ, m.quantity - step))}
                        className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 rounded text-xs"
                        disabled={m.quantity <= minQ}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={m.quantity}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          adjustQty(
                            m.materialId,
                            Number.isFinite(v) && v > 0 ? v : minQ
                          );
                        }}
                        step={pkg ? 0.1 : 1}
                        min={minQ}
                        className="w-14 text-center text-sm border border-slate-200 rounded py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => adjustQty(m.materialId, m.quantity + step)}
                        className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 rounded text-xs"
                      >
                        +
                      </button>
                      <span className="text-xs text-slate-500 w-8">{unitLabel}</span>
                      <button
                        type="button"
                        onClick={() => removeRow(m.materialId)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        aria-label="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-4 pb-4 border-t border-slate-100 space-y-1.5">
          <label
            htmlFor="optional-session-remarks"
            className="block text-xs font-medium text-slate-600"
          >
            Remarks (optional)
          </label>
          <textarea
            id="optional-session-remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="e.g. toner notes, formula notes…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-y min-h-[2.5rem]"
          />
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(selected, remarks);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
