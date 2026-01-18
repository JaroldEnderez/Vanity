"use client";

import { useSaleStore, DraftSale, DraftStatus } from "@/src/app/store/saleStore";
import SalePanel from "./SalePanel";
import ServicesSection from "../services/ServicesSection";
import { Service } from "@/src/app/types/service";
import { Plus, X } from "lucide-react";

type Props = {
  services: Service[];
  branchId: string;
  staffId: string;
};

// Get computed status based on payment
function getComputedStatus(draft: DraftSale): DraftStatus {
  // If paid, it's completed (green)
  if (draft.isPaid || draft.status === 'completed') {
    return 'completed';
  }

  // If overdue status was manually set
  if (draft.status === 'overdue') {
    return 'overdue';
  }

  // Default: active (blue)
  return 'active';
}

// Status color mapping
function getStatusColor(status: DraftStatus, isActive: boolean) {
  switch (status) {
    case 'completed':
      return {
        dot: 'bg-green-500',
        tab: isActive ? 'bg-green-50 border-green-300' : 'bg-green-100 hover:bg-green-200',
        text: 'text-green-800',
      };
    case 'overdue':
      return {
        dot: 'bg-yellow-500',
        tab: isActive ? 'bg-yellow-50 border-yellow-300' : 'bg-yellow-100 hover:bg-yellow-200',
        text: 'text-yellow-800',
      };
    case 'active':
    default:
      return {
        dot: 'bg-blue-500',
        tab: isActive ? 'bg-white border-slate-300' : 'bg-slate-200 hover:bg-slate-300',
        text: isActive ? 'text-slate-900' : 'text-slate-600',
      };
  }
}

export default function SaleTab({ services, branchId, staffId }: Props) {
  const {
    draftSales,
    activeDraftId,
    createDraft,
    setActiveDraft,
    removeDraft,
    updateDraftStatus,
  } = useSaleStore();


  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1">
        {draftSales.map((draft, index) => {
          const isActive = draft.id === activeDraftId;
          const computedStatus = getComputedStatus(draft);
          const colors = getStatusColor(computedStatus, isActive);

          return (
            <button
              key={draft.id}
              onClick={() => setActiveDraft(draft.id)}
              className={`
                group relative flex items-center gap-2 px-4 py-2 text-sm cursor-pointer
                rounded-t-md transition-colors border-t border-l border-r
                ${colors.tab} ${colors.text}
              `}
            >
              {/* Status indicator dot */}
              <span className={`w-2 h-2 rounded-full ${colors.dot}`} />

              <span className="whitespace-nowrap">
                {draft.name || `Draft ${index + 1}`}
              </span>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeDraft(draft.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </button>
          );
        })}

        {/* ➕ Add new draft tab */}
        <button
          onClick={() => createDraft(branchId, staffId)}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-md
                     border border-dashed border-slate-300
                     text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Content Area - Only show active draft's content */}
      {activeDraftId && (
        <div className="flex-1 grid grid-cols-12 gap-6 p-6 bg-white overflow-hidden">
          {/* Services Section */}
          <div className="col-span-8 rounded-xl p-4 overflow-y-auto">
            <ServicesSection services={services} />
          </div>

          {/* Sale Panel */}
          <div className="col-span-4 rounded-xl p-4 overflow-y-auto">
            <SalePanel />
          </div>
        </div>
      )}

      {/* No active draft */}
      {!activeDraftId && draftSales.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-slate-500">No active draft</p>
            <button
              onClick={() => createDraft(branchId, staffId)}
              className="rounded-lg bg-emerald-600 px-6 py-3 text-white font-semibold transition hover:bg-emerald-700"
            >
              Create First Draft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
