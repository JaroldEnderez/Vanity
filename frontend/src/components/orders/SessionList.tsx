"use client";

import { useSaleStore, DraftSale } from "@/src/app/store/saleStore";
import { Plus, Loader2, Clock, CheckCircle, AlertTriangle, Trash2, ChevronRight } from "lucide-react";
import { useState } from "react";

type Props = {
  staffId: string;
};

function getStatusConfig(draft: DraftSale) {
  if (draft.isPaid || draft.status === "completed") {
    return {
      color: "bg-green-500",
      bgColor: "bg-green-50 border-green-200",
      textColor: "text-green-700",
      icon: CheckCircle,
      label: "Completed",
    };
  }
  if (draft.status === "overdue") {
    return {
      color: "bg-yellow-500",
      bgColor: "bg-yellow-50 border-yellow-200",
      textColor: "text-yellow-700",
      icon: AlertTriangle,
      label: "Overdue",
    };
  }
  return {
    color: "bg-blue-500",
    bgColor: "bg-blue-50 border-blue-200",
    textColor: "text-blue-700",
    icon: Clock,
    label: "In Progress",
  };
}

export default function SessionList({ staffId }: Props) {
  const draftSales = useSaleStore((state) => state.draftSales);
  const activeDraftId = useSaleStore((state) => state.activeDraftId);
  const isLoading = useSaleStore((state) => state.isLoading);
  const createDraft = useSaleStore((state) => state.createDraft);
  const setActiveDraft = useSaleStore((state) => state.setActiveDraft);
  const removeDraft = useSaleStore((state) => state.removeDraft);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = async () => {
    await createDraft(staffId);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeDraft(id);
    setDeleteConfirm(null);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) return "Today";
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
          <p className="text-sm text-slate-500">Manage active and draft sessions</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          New Session
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {draftSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No active sessions</h3>
            <p className="text-slate-500 mt-1 max-w-sm">
              Create a new session to start adding services for a customer.
            </p>
            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Create First Session
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {draftSales.map((draft, index) => {
              const status = getStatusConfig(draft);
              const Icon = status.icon;

              return (
                <div
                  key={draft.id}
                  onClick={() => setActiveDraft(draft.id)}
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition group"
                >
                  {/* Status indicator */}
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${status.color}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">
                        {draft.name || `Session #${index + 1}`}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.textColor}`}>
                        <Icon size={12} />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="font-mono text-xs text-slate-400">#{draft.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>{draft.items.length} service{draft.items.length !== 1 ? "s" : ""}</span>
                      <span>•</span>
                      <span>{formatDate(draft.createdAt)} at {formatTime(draft.createdAt)}</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold text-slate-900">₱{draft.total.toFixed(2)}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {deleteConfirm === draft.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDelete(draft.id, e)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(null);
                          }}
                          className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(draft.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={20} className="text-slate-400" />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Summary */}
      {draftSales.length > 0 && (
        <div className="px-6 py-3 border-t bg-slate-50 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {draftSales.length} session{draftSales.length !== 1 ? "s" : ""}
          </span>
          <span className="font-medium text-slate-900">
            Total: ₱{draftSales.reduce((sum, d) => sum + d.total, 0).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
