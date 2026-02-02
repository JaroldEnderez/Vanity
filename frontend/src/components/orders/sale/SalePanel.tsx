"use client";

import { useEffect, useState, useRef } from "react";
import { useSaleStore, DraftSale, DraftStatus } from "@/src/app/store/saleStore";
import StartSaleButton from "./StartSaleButton";
import { Clock, CheckCircle, AlertTriangle, ChevronUp, ChevronDown, Package, X } from "lucide-react";

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
    const [showPayConfirmation, setShowPayConfirmation] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cashReceived, setCashReceived] = useState<string>("");
    const [newItemId, setNewItemId] = useState<string | null>(null);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const itemsEndRef = useRef<HTMLDivElement>(null);

    // Subscribe to draftSales and activeDraftId to trigger re-renders on changes
    const draftSales = useSaleStore((state) => state.draftSales);
    const activeDraftId = useSaleStore((state) => state.activeDraftId);
    const updateItemMaterial = useSaleStore((state) => state.updateItemMaterial);
    const removeItemFromDraft = useSaleStore((state) => state.removeItemFromDraft);
    const checkoutDraft = useSaleStore((state) => state.checkoutDraft);
    
    // Compute active draft from subscribed data
    const activeDraft = activeDraftId 
      ? draftSales.find((d) => d.id === activeDraftId) || null 
      : null;

    // Track previous items count to detect new additions
    const prevItemsCount = useRef(activeDraft?.items.length || 0);

    // Calculate change
    const cashAmount = parseFloat(cashReceived) || 0;
    const changeAmount = cashAmount - (activeDraft?.total || 0);
    const isValidPayment = cashAmount >= (activeDraft?.total || 0) && cashAmount > 0;

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset cash when draft changes
    useEffect(() => {
        setCashReceived("");
        setShowPayConfirmation(false);
    }, [activeDraftId]);

    // Auto-scroll when new item is added
    useEffect(() => {
        const currentCount = activeDraft?.items.length || 0;
        
        if (currentCount > prevItemsCount.current && activeDraft?.items.length) {
            // New item added - get the last item's ID
            const lastItem = activeDraft.items[activeDraft.items.length - 1];
            setNewItemId(lastItem.id);
            
            // Scroll to bottom with smooth animation
            setTimeout(() => {
                itemsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 50);
            
            // Clear the new item highlight after animation
            setTimeout(() => {
                setNewItemId(null);
            }, 600);
        }
        
        prevItemsCount.current = currentCount;
    }, [activeDraft?.items]);

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

    const handleConfirmPayment = async () => {
        if (!activeDraft || !isValidPayment) return;

        setIsProcessing(true);
        try {
            // Checkout the session (marks as COMPLETED, deducts inventory)
            const success = await checkoutDraft(activeDraft.id, cashAmount);
            
            if (!success) {
                throw new Error('Failed to checkout');
            }

            setShowPayConfirmation(false);
            setCashReceived("");
        } catch (error) {
            console.error('Payment failed:', error);
            alert('Failed to process payment. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMaterialChange = (materialId: string, quantity: number) => {
        if (activeDraft) {
            updateItemMaterial(activeDraft.id, materialId, quantity);
        }
    };

    return (
        <div className="h-full flex flex-col">
        {/* Sticky header */}
        <div className="flex-shrink-0 flex justify-between text-sm pb-3 border-b mb-3 bg-slate-50">
            <span className="text-slate-600">Started:</span>
            <span className="font-medium">{startedTime}</span>
        </div>

        {/* Scrollable services section */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-4">
            <div className="space-y-2">
                <h4 className="font-medium">Services</h4>
                {activeDraft.items.length === 0 && (
                  <p className="text-sm text-slate-500 py-2">No services added yet. Click a service to add it.</p>
                )}
                {activeDraft.items.map((item) => (
                <div 
                  key={item.id} 
                  className={`rounded bg-slate-100 p-3 space-y-2 group relative transition-all duration-300 ${
                    newItemId === item.id ? 'animate-highlight ring-2 ring-green-400 ring-opacity-75' : ''
                  }`}
                >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          ₱{item.price} × {item.qty}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium">₱{(item.price * item.qty).toFixed(2)}</span>
                        {!activeDraft.isPaid && (
                          <button
                            onClick={() => removeItemFromDraft(activeDraft.id, item.id)}
                            className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 transition"
                            title="Remove service"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Materials used */}
                    {item.materials && item.materials.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                          <Package size={12} />
                          <span>Materials</span>
                        </div>
                        <div className="space-y-1.5">
                          {item.materials.map((material) => (
                            <div key={material.materialId} className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">{material.name}</span>
                              <div className="flex items-center gap-1">
                                {!activeDraft.isPaid && (
                                  <>
                                    <button
                                      onClick={() => handleMaterialChange(material.materialId, material.quantity - 1)}
                                      className="p-0.5 hover:bg-slate-200 rounded"
                                      disabled={material.quantity <= 1}
                                    >
                                      <ChevronDown size={14} className="text-slate-500" />
                                    </button>
                                    <input
                                      type="number"
                                      value={material.quantity}
                                      onChange={(e) => handleMaterialChange(material.materialId, parseFloat(e.target.value) || 1)}
                                      step="1"
                                      min="1"
                                      className="w-12 text-center text-sm border border-slate-300 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                      onClick={() => handleMaterialChange(material.materialId, material.quantity + 1)}
                                      className="p-0.5 hover:bg-slate-200 rounded"
                                    >
                                      <ChevronUp size={14} className="text-slate-500" />
                                    </button>
                                  </>
                                )}
                                {activeDraft.isPaid && (
                                  <span className="font-medium">{material.quantity}</span>
                                )}
                                <span className="text-slate-500 text-xs ml-1">{material.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
                ))}
                {/* Scroll anchor for auto-scroll */}
                <div ref={itemsEndRef} />
            </div>
        </div>

        {/* Fixed bottom section */}
        <div className="flex-shrink-0 border-t bg-slate-50 pt-3 space-y-3">
            <div className="text-sm">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₱{activeDraft.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>₱{activeDraft.total.toFixed(2)}</span>
                </div>
            </div>

            {/* Status and Actions */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Status:</span>
                  <StatusBadge status={getComputedStatus(activeDraft)} />
                </div>

                {!activeDraft.isPaid && activeDraft.items.length > 0 && (
                  <div className="space-y-3">
                    {/* Cash Input */}
                    <div className="space-y-2">
                      <label className="text-sm text-slate-600">Cash Received</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₱</span>
                        <input
                          type="number"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      {/* Insufficient tooltip - only show when cash entered is less than total */}
                      {cashAmount > 0 && !isValidPayment && (
                        <p className="text-xs text-red-500">
                          Insufficient amount (need ₱{(activeDraft.total - cashAmount).toFixed(2)} more)
                        </p>
                      )}
                    </div>

                    {/* Mark as Paid Button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowPayConfirmation(true)}
                        disabled={!isValidPayment}
                        className="w-full rounded-lg bg-green-600 py-3 text-white font-semibold transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Mark as Paid
                      </button>

                      {/* Inline confirmation popover */}
                      {showPayConfirmation && isValidPayment && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                          <div className="text-sm text-slate-600 mb-3 space-y-1">
                            <div className="flex justify-between">
                              <span>Total:</span>
                              <span className="font-medium">₱{activeDraft.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cash:</span>
                              <span className="font-medium">₱{cashAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-green-600 font-semibold">
                              <span>Change:</span>
                              <span>₱{changeAmount.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowPayConfirmation(false)}
                              className="flex-1 px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-100 transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleConfirmPayment}
                              disabled={isProcessing}
                              className="flex-1 px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                            >
                              {isProcessing ? '...' : 'Confirm'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
        </div>
        </div>
    );
}
