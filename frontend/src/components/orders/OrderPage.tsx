"use client";

import { useEffect, useState } from "react";
import { Service } from "@/src/app/types/service";
import { useSaleStore, DraftSale } from "@/src/app/store/saleStore";
import SessionList from "./SessionList";
import ServicesSection from "./services/ServicesSection";
import SalePanel from "./sale/SalePanel";
import Drawer from "@/src/components/ui/Drawer";
import { Loader2, Pencil, Check, X } from "lucide-react";

type Props = {
  services: Service[];
  defaultStaffId: string;
};

// Editable header component for drawer
function DrawerHeader({ draft }: { draft: DraftSale | null }) {
  const updateDraftName = useSaleStore((state) => state.updateDraftName);
  const draftSales = useSaleStore((state) => state.draftSales);
  const [isEditing, setIsEditing] = useState(false);
  
  // Find index for fallback name
  const draftIndex = draft ? draftSales.findIndex(d => d.id === draft.id) : -1;
  const defaultName = draftIndex >= 0 ? `Session #${draftIndex + 1}` : "Session";
  const [editedName, setEditedName] = useState(draft?.name || defaultName);

  // Sync editedName when draft changes
  useEffect(() => {
    const currentIndex = draft ? draftSales.findIndex(d => d.id === draft.id) : -1;
    const currentDefault = currentIndex >= 0 ? `Session #${currentIndex + 1}` : "Session";
    setEditedName(draft?.name || currentDefault);
  }, [draft?.name, draft?.id, draftSales]);

  if (!draft) return null;

  const handleSave = () => {
    updateDraftName(draft.id, editedName);
    setIsEditing(false);
  };

  const handleCancel = () => {
    const currentIndex = draft ? draftSales.findIndex(d => d.id === draft.id) : -1;
    const currentDefault = currentIndex >= 0 ? `Session #${currentIndex + 1}` : "Session";
    setEditedName(draft?.name || currentDefault);
    setIsEditing(false);
  };

  const serviceCount = draft.items.length;
  const serviceLabel = serviceCount === 1 ? "service" : "services";

  return (
    <div className="space-y-1">
      {/* Editable Name */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              className="text-lg font-semibold bg-white border border-slate-300 rounded px-2 py-0.5 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="p-1 hover:bg-slate-200 rounded transition"
            >
              <Check size={18} className="text-green-600" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-slate-200 rounded transition"
            >
              <X size={18} className="text-slate-500" />
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-slate-900">
              {draft.name || defaultName}
            </h2>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-slate-200 rounded transition"
            >
              <Pencil size={14} className="text-slate-500" />
            </button>
          </>
        )}
      </div>

      {/* ID, Service count and subtotal */}
      <p className="text-sm text-slate-500">
        <span className="font-mono text-slate-400">#{draft.id.slice(0, 8)}</span>
        {" • "}
        {serviceCount} {serviceLabel} • ₱{draft.total.toFixed(2)}
      </p>
    </div>
  );
}

export default function OrderPage({ services, defaultStaffId }: Props) {

  const isInitialized = useSaleStore((state) => state.isInitialized);
  const loadDraftsFromDB = useSaleStore((state) => state.loadDraftsFromDB);
  const draftSales = useSaleStore((state) => state.draftSales);
  const activeDraftId = useSaleStore((state) => state.activeDraftId);
  const setActiveDraft = useSaleStore((state) => state.setActiveDraft);

  const activeDraft = activeDraftId
    ? draftSales.find((d) => d.id === activeDraftId) || null
    : null;

  // Load drafts on mount
  useEffect(() => {
    loadDraftsFromDB();
  }, [loadDraftsFromDB]);

  const closeDrawer = () => {
    setActiveDraft(null);
  };

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-slate-500">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Session List - Main Content */}
      <div className="flex-1 bg-white">
        <SessionList staffId={defaultStaffId} />
      </div>

      {/* Session Drawer */}
      <Drawer
        isOpen={!!activeDraftId}
        onClose={closeDrawer}
        headerContent={<DrawerHeader draft={activeDraft} />}
        width="4xl"
      >
        <div className="h-full flex">
          {/* Services Grid */}
          <div className="flex-1 p-6 overflow-y-auto border-r">
            <ServicesSection services={services} staffId={defaultStaffId} />
          </div>

          {/* Session Panel */}
          <div className="w-80 px-4 py-4 bg-slate-50 flex flex-col">
            <SalePanel />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
