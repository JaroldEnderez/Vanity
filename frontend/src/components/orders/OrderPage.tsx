"use client";

import { useEffect, useState } from "react";
import { Service } from "@/src/app/types/service";
import { useSaleStore, DraftSale } from "@/src/app/store/saleStore";
import SessionList from "./SessionList";
import ServicesSection from "./services/ServicesSection";
import SalePanel from "./sale/SalePanel";
import Drawer from "@/src/components/ui/Drawer";
import { Loader2, Pencil, Check, X, AlertCircle } from "lucide-react";

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
              className="text-base md:text-lg font-semibold bg-white border border-slate-300 rounded px-2 py-0.5 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <h2 className="text-base md:text-lg font-semibold text-slate-900 truncate">
              {draft.name || defaultName}
            </h2>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-slate-200 rounded transition flex-shrink-0"
            >
              <Pencil size={12} className="md:w-3.5 md:h-3.5 text-slate-500" />
            </button>
          </>
        )}
      </div>

      {/* ID, Service count and subtotal */}
      <p className="text-xs md:text-sm text-slate-500">
        <span className="font-mono text-[10px] md:text-xs text-slate-400">#{draft.id.slice(0, 8)}</span>
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
  const pendingSessionCreation = useSaleStore((state) => state.pendingSessionCreation);
  const cancelSessionCreation = useSaleStore((state) => state.cancelSessionCreation);
  const confirmSessionCreation = useSaleStore((state) => state.confirmSessionCreation);
  const isLoading = useSaleStore((state) => state.isLoading);

  const [showCancelCreationConfirm, setShowCancelCreationConfirm] = useState(false);

  const activeDraft = activeDraftId
    ? draftSales.find((d) => d.id === activeDraftId) || null
    : null;

  // Load drafts on mount
  useEffect(() => {
    loadDraftsFromDB();
  }, [loadDraftsFromDB]);

  // Reset cancel-confirm state when drawer is closed or no longer in pending creation
  useEffect(() => {
    if (!pendingSessionCreation && !activeDraftId) {
      setShowCancelCreationConfirm(false);
    }
  }, [pendingSessionCreation, activeDraftId]);

  const closeDrawer = () => {
    if (pendingSessionCreation) {
      setShowCancelCreationConfirm(true);
    } else {
      setActiveDraft(null);
    }
  };

  const handleConfirmCreate = async () => {
    await confirmSessionCreation();
  };

  const handleCancelCreate = () => {
    setShowCancelCreationConfirm(true);
  };

  const handleConfirmCancelCreation = () => {
    cancelSessionCreation();
    setShowCancelCreationConfirm(false);
  };

  const handleDismissCancelCreationConfirm = () => {
    setShowCancelCreationConfirm(false);
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
    <div className="h-full flex flex-col md:flex-row">
      {/* Session List - Main Content */}
      <div className="flex-1 bg-white min-w-0">
        <SessionList staffId={defaultStaffId} />
      </div>

      {/* Session Drawer */}
      <Drawer
        isOpen={!!activeDraftId || pendingSessionCreation}
        onClose={closeDrawer}
        headerContent={
          showCancelCreationConfirm ? (
            <h2 className="text-base md:text-lg font-semibold text-slate-900">Cancel session creation?</h2>
          ) : pendingSessionCreation ? (
            <h2 className="text-base md:text-lg font-semibold text-slate-900">New Session</h2>
          ) : (
            <DrawerHeader draft={activeDraft} />
          )
        }
        width="4xl"
      >
        {showCancelCreationConfirm ? (
          <div className="p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
            <p className="text-slate-600 mb-6">The session has not been created yet. Discard and close?</p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmCancelCreation}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Yes, cancel
              </button>
              <button
                onClick={handleDismissCancelCreationConfirm}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                No, keep
              </button>
            </div>
          </div>
        ) : pendingSessionCreation ? (
          <div className="p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium mb-1">A new session is about to be created.</p>
            <p className="text-slate-500 text-sm mb-6">Confirm to create the session and start adding services, or cancel to close.</p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmCreate}
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                Confirm
              </button>
              <button
                onClick={handleCancelCreate}
                disabled={isLoading}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col lg:flex-row">
            {/* Services Grid */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r">
              <ServicesSection services={services} staffId={defaultStaffId} />
            </div>

            {/* Session Panel */}
            <div className="w-full lg:w-80 px-4 py-4 bg-slate-50 flex flex-col border-t lg:border-t-0">
              <SalePanel />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
