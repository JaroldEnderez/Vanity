"use client";

import { useEffect, useState } from "react";
import { useSaleStore, DraftSale, DraftStatus } from "@/src/app/store/saleStore";
import StartSaleButton from "./StartSaleButton";
import { Pencil, Check, Clock, CheckCircle, AlertTriangle } from "lucide-react";

type Props = {
  title?: string;
};

// Get computed status based on payment
function getComputedStatus(draft: DraftSale): DraftStatus {
  if (draft.isPaid || draft.status === 'completed') return 'completed';
  if (draft.status === 'overdue') return 'overdue';
  return 'active';
}

// Status badge component
function StatusBadge({ status }: { status: DraftStatus }) {
  const config = {
    active: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'In Progress' },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Paid' },
    overdue: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle, label: 'Overdue' },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

export default function SalePanel({ title = "Draft Sale" }: Props) {
    const [mounted, setMounted] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [showPayConfirmation, setShowPayConfirmation] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const getActiveDraft = useSaleStore((state) => state.getActiveDraft);
    const updateDraftName = useSaleStore((state) => state.updateDraftName);
    const removeDraft = useSaleStore((state) => state.removeDraft);
    
    const activeDraft = getActiveDraft();

    const currentTitle = activeDraft?.name || title;
    const [editedTitle, setEditedTitle] = useState(currentTitle);

    useEffect(() => {
        setEditedTitle(currentTitle);
    }, [currentTitle]);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    if (!activeDraft) {
        return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-slate-500">No active draft</p>
            <StartSaleButton 
                branchId="da6479ee-99e4-495e-bf62-0ab4dc6d4dea"
                staffId="staff-001"
            />
        </div>
        );
    }

    const startedTime = new Date(activeDraft.createdAt).toLocaleTimeString();

    const handleSaveTitle = () => {
        if (activeDraft) {
            updateDraftName(activeDraft.id, editedTitle);
        }
        setIsEditingTitle(false);
    };

    const handleConfirmPayment = async () => {
        if (!activeDraft) return;

        setIsProcessing(true);
        try {
            // 1. Create sale in database
            const createRes = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId: activeDraft.branchId,
                    staffId: activeDraft.staffId,
                    services: activeDraft.items.map((item) => ({
                        serviceId: item.serviceId,
                        qty: item.qty,
                        price: item.price,
                    })),
                }),
            });

            if (!createRes.ok) throw new Error('Failed to create sale');
            const sale = await createRes.json();

            // 2. Checkout (mark as COMPLETED)
            const checkoutRes = await fetch(`/api/sales/${sale.id}/checkout`, {
                method: 'POST',
            });

            if (!checkoutRes.ok) throw new Error('Failed to checkout sale');

            // 3. Remove from Zustand (it's now persisted in DB)
            removeDraft(activeDraft.id);
            setShowPayConfirmation(false);
        } catch (error) {
            console.error('Payment failed:', error);
            alert('Failed to process payment. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-4">
        <div className="flex items-center gap-2">
            {isEditingTitle ? (
                <>
                    <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTitle();
                            if (e.key === 'Escape') {
                                setEditedTitle(currentTitle);
                                setIsEditingTitle(false);
                            }
                        }}
                        className="text-lg font-semibold bg-white border border-slate-300 rounded px-2 py-1 flex-1"
                        autoFocus
                    />
                    <button
                        onClick={handleSaveTitle}
                        className="p-1 hover:bg-slate-100 rounded"
                    >
                        <Check size={18} className="text-green-600" />
                    </button>
                </>
            ) : (
                <>
                    <div className="flex gap-x-2">
                        <h3 className="text-lg font-semibold flex-1">{editedTitle}</h3>
                        <button
                            onClick={() => setIsEditingTitle(true)}
                            className="p-1 hover:bg-slate-100 rounded"
                        >
                            <Pencil size={16} className="text-slate-500" />
                        </button>
                    </div>
                </>
            )}
        </div>

        <div className="flex justify-between text-sm">
            <span className="text-slate-600">Started:</span>
            <span className="font-medium">{startedTime}</span>
        </div>

        <div className="space-y-2">
            <h4 className="font-medium">Services</h4>
            {activeDraft.items.map((item) => (
            <div key={item.id} className="rounded bg-slate-300 p-2">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-slate-500">
                ₱{item.price} × {item.qty}
                </div>
            </div>
            ))}
        </div>

        <div className="border-t pt-3 text-sm">
            <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₱{activeDraft.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>₱{activeDraft.total.toFixed(2)}</span>
            </div>
        </div>

        {/* Status and Actions */}
        <div className="border-t pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Status:</span>
              <StatusBadge status={getComputedStatus(activeDraft)} />
            </div>

            {!activeDraft.isPaid && activeDraft.items.length > 0 && (
              <button
                onClick={() => setShowPayConfirmation(true)}
                className="w-full rounded-lg bg-green-600 py-3 text-white font-semibold transition hover:bg-green-700"
              >
                Mark as Paid
              </button>
            )}
        </div>

        {showPayConfirmation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-2">Confirm Payment</h3>
              <p className="text-slate-600 text-sm mb-6">
                Mark this sale as paid? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPayConfirmation(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )

        }
        </div>
    );
}


