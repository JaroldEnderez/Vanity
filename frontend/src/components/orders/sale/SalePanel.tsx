"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useSaleStore, DraftSale, DraftStatus } from "@/src/app/store/saleStore";
import { useToastStore } from "@/src/app/store/toastStore";
import { WALK_IN_CUSTOMER_ID } from "@/src/app/lib/walkInCustomer";
import StartSaleButton from "./StartSaleButton";
import { Clock, CheckCircle, AlertTriangle, ChevronUp, ChevronDown, Package, X, User, UserPlus } from "lucide-react";
import { formatPHP } from "@/src/app/lib/money";

// Staff type for dropdown
type Staff = {
  id: string;
  name: string;
  role: string | null;
};

export type Customer = {
  id: string;
  name: string;
  address?: string | null;
  phone: string | null;
  fb?: string | null;
  dateOfBirth?: string | null;
};

const REGISTER_NEW_VALUE = "__register_new__";

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
    const [stylists, setStylists] = useState<Staff[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customersLoading, setCustomersLoading] = useState(false);
    const [showRegisterCustomer, setShowRegisterCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerAddress, setNewCustomerAddress] = useState("");
    const [newCustomerContact, setNewCustomerContact] = useState("");
    const [newCustomerFb, setNewCustomerFb] = useState("");
    const [newCustomerDob, setNewCustomerDob] = useState("");
    const [registerSaving, setRegisterSaving] = useState(false);
    const [registerError, setRegisterError] = useState<string | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const itemsEndRef = useRef<HTMLDivElement>(null);

    // Subscribe to draftSales and activeDraftId to trigger re-renders on changes
    const draftSales = useSaleStore((state) => state.draftSales);
    const activeDraftId = useSaleStore((state) => state.activeDraftId);
    const updateItemMaterial = useSaleStore((state) => state.updateItemMaterial);
    const updateDraftStaff = useSaleStore((state) => state.updateDraftStaff);
    const updateDraftCustomer = useSaleStore((state) => state.updateDraftCustomer);
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
        // Fetch stylists
        fetch("/api/staff?stylists=true")
            .then((res) => res.json())
            .then((data) => setStylists(data))
            .catch((err) => console.error("Failed to fetch stylists:", err));

        setCustomersLoading(true);
        fetch("/api/customers?limit=100")
          .then((res) => res.json())
          .then((data) => setCustomers(Array.isArray(data) ? data : []))
          .catch((err) => console.error("Failed to fetch customers:", err))
          .finally(() => setCustomersLoading(false));
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

    /** Walk-in first; include fallback row if API list has not been migrated yet */
    const customersSorted = useMemo(() => {
      const list = [...customers];
      if (!list.some((c) => c.id === WALK_IN_CUSTOMER_ID)) {
        list.unshift({
          id: WALK_IN_CUSTOMER_ID,
          name: "Walk-in",
          phone: null,
        });
      }
      list.sort((a, b) => {
        if (a.id === WALK_IN_CUSTOMER_ID) return -1;
        if (b.id === WALK_IN_CUSTOMER_ID) return 1;
        return a.name.localeCompare(b.name);
      });
      return list;
    }, [customers]);

    if (!mounted) return null;

    if (!activeDraft) {
        return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-slate-500">No active draft</p>
            <StartSaleButton staffId="staff-001" />
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
            useToastStore.getState().show('Session completed');
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

    const handleRegisterNewCustomer = async () => {
        const name = newCustomerName.trim();
        if (!name || !activeDraft) return;
        setRegisterSaving(true);
        setRegisterError(null);
        try {
            const res = await fetch("/api/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    address: newCustomerAddress.trim() || undefined,
                    phone: newCustomerContact.trim() || undefined,
                    fb: newCustomerFb.trim() || undefined,
                    dateOfBirth: newCustomerDob.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create customer");
            const newCustomer: Customer = {
                id: data.id,
                name: data.name,
                address: data.address ?? null,
                phone: data.phone ?? null,
                fb: data.fb ?? null,
                dateOfBirth: data.dateOfBirth ?? null,
            };
            setCustomers((prev) => [newCustomer, ...prev]);
            updateDraftCustomer(activeDraft.id, newCustomer);
            setShowRegisterCustomer(false);
            setNewCustomerName("");
            setNewCustomerAddress("");
            setNewCustomerContact("");
            setNewCustomerFb("");
            setNewCustomerDob("");
        } catch (e) {
            setRegisterError(e instanceof Error ? e.message : "Failed to register customer");
        } finally {
            setRegisterSaving(false);
        }
    };

    /** Walk-in counts as a valid customer for checkout */
    const hasCustomer = Boolean(activeDraft?.customerId);
    const isWalkIn = activeDraft?.customerId === WALK_IN_CUSTOMER_ID;
    const canCheckout = hasCustomer && isValidPayment;

    return (
        <div className="h-full flex flex-col">
        {/* Sticky header */}
        <div className="flex-shrink-0 pb-2 md:pb-3 border-b mb-2 md:mb-3 bg-slate-50 space-y-2 px-2 md:px-0">
          {/* Stylist dropdown */}
          <div className="flex items-center gap-2">
            <User size={16} className="text-slate-500" />
            {activeDraft.isPaid ? (
              <span className="text-sm font-medium text-slate-700">
                {activeDraft.staffName || "No stylist assigned"}
              </span>
            ) : (
              <select
                value={activeDraft.staffId}
                onChange={(e) => {
                  const selectedStylist = stylists.find((s) => s.id === e.target.value);
                  if (selectedStylist) {
                    updateDraftStaff(activeDraft.id, selectedStylist.id, selectedStylist.name);
                  }
                }}
                className="flex-1 text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select stylist...</option>
                {stylists.map((stylist) => (
                  <option key={stylist.id} value={stylist.id}>
                    {stylist.name} {stylist.role ? `(${stylist.role})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Customer dropdown — required for sale */}
          <div className="flex items-center gap-2">
            <User size={16} className="text-slate-500" />
            {activeDraft.isPaid ? (
              <span className="text-sm font-medium text-slate-700">
                {activeDraft.customerName || "—"}
              </span>
            ) : (
              <select
                value={activeDraft.customerId ?? WALK_IN_CUSTOMER_ID}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id === REGISTER_NEW_VALUE) {
                    setShowRegisterCustomer(true);
                    return;
                  }
                  const selected = customers.find((c) => c.id === id) || null;
                  updateDraftCustomer(activeDraft.id, selected);
                }}
                className="flex-1 text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {customersSorted.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.id === WALK_IN_CUSTOMER_ID ? " (default)" : c.phone ? ` (${c.phone})` : ""}
                  </option>
                ))}
                <option value={REGISTER_NEW_VALUE}>+ Register new customer</option>
              </select>
            )}
          </div>
          {!activeDraft.isPaid && isWalkIn && (
            <p className="text-xs text-slate-500 pl-6">
              Using <span className="font-medium text-slate-700">Walk-in</span> for this sale. Choose a
              named customer above if you want them on file.
            </p>
          )}
          {customersLoading ? (
            <div className="text-[11px] text-slate-500 pl-6">Loading customers…</div>
          ) : null}

          {/* Register new customer modal */}
          {showRegisterCustomer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
              <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-4 max-h-[90vh] overflow-y-auto">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <UserPlus size={18} />
                  Register new customer
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Name *</label>
                    <input
                      type="text"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Address</label>
                    <input
                      type="text"
                      value={newCustomerAddress}
                      onChange={(e) => setNewCustomerAddress(e.target.value)}
                      placeholder="Street, city, etc."
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Contact</label>
                    <input
                      type="text"
                      value={newCustomerContact}
                      onChange={(e) => setNewCustomerContact(e.target.value)}
                      placeholder="e.g. 09171234567"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Fb</label>
                    <input
                      type="text"
                      value={newCustomerFb}
                      onChange={(e) => setNewCustomerFb(e.target.value)}
                      placeholder="Facebook profile or link"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Date of birth</label>
                    <input
                      type="date"
                      value={newCustomerDob}
                      onChange={(e) => setNewCustomerDob(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {registerError && (
                    <p className="text-xs text-red-600">{registerError}</p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowRegisterCustomer(false);
                      setNewCustomerName("");
                      setNewCustomerAddress("");
                      setNewCustomerContact("");
                      setNewCustomerFb("");
                      setNewCustomerDob("");
                      setRegisterError(null);
                    }}
                    disabled={registerSaving}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegisterNewCustomer}
                    disabled={registerSaving || !newCustomerName.trim()}
                    className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {registerSaving ? "Saving..." : "Save & select"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Started time */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Started:</span>
            <span className="font-medium">{startedTime}</span>
          </div>
        </div>

        {/* Scrollable services section */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-4 px-2 md:px-0">
            <div className="space-y-2">
                <h4 className="font-medium text-sm md:text-base">Services</h4>
                {activeDraft.items.length === 0 && (
                  <p className="text-sm text-slate-500 py-2">No services added yet. Click a service to add it.</p>
                )}
                {activeDraft.items.map((item) => (
                <div 
                  key={item.id} 
                  className={`rounded bg-slate-100 p-2 md:p-3 space-y-2 group relative transition-all duration-300 ${
                    newItemId === item.id ? 'animate-highlight ring-2 ring-green-400 ring-opacity-75' : ''
                  }`}
                >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm md:text-base truncate">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {formatPHP(item.price)} × {item.qty}
                        </div>
                        {item.coloringDetails && (item.coloringDetails.colorUsed || item.coloringDetails.developer || item.coloringDetails.itemStaffName || item.coloringDetails.remarks) && (
                          <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                            {item.coloringDetails.colorUsed && (
                              <div><span className="text-slate-500">Color:</span> {item.coloringDetails.colorUsed}</div>
                            )}
                            {item.coloringDetails.developer && (
                              <div><span className="text-slate-500">Developer:</span> {item.coloringDetails.developer}</div>
                            )}
                            {item.coloringDetails.itemStaffName && (
                              <div><span className="text-slate-500">Staff:</span> {item.coloringDetails.itemStaffName}</div>
                            )}
                            {item.coloringDetails.remarks && (
                              <div><span className="text-slate-500">Remarks:</span> {item.coloringDetails.remarks}</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-2 flex-shrink-0">
                        <span className="text-xs md:text-sm font-medium">{formatPHP(item.price * item.qty)}</span>
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
        <div className="flex-shrink-0 border-t bg-slate-50 pt-2 md:pt-3 space-y-2 md:space-y-3 px-2 md:px-0">
            <div className="text-xs md:text-sm">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPHP(activeDraft.subtotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm md:text-base">
                    <span>Total</span>
                    <span>{formatPHP(activeDraft.total)}</span>
                </div>
            </div>

            {/* Status and Actions */}
            <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm text-slate-600">Status:</span>
                  <StatusBadge status={getComputedStatus(activeDraft)} />
                </div>

                {!activeDraft.isPaid && activeDraft.items.length > 0 && (
                  <div className="space-y-2 md:space-y-3">
                    {/* Cash Input */}
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-xs md:text-sm text-slate-600">Cash Received</label>
                      <div className="relative">
                        <span className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₱</span>
                        <input
                          type="number"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full pl-7 md:pl-8 pr-2 md:pr-3 py-1.5 md:py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      {/* Insufficient tooltip - only show when cash entered is less than total */}
                      {cashAmount > 0 && !isValidPayment && (
                        <p className="text-[10px] md:text-xs text-red-500">
                          Insufficient amount (need {formatPHP(activeDraft.total - cashAmount)} more)
                        </p>
                      )}
                    </div>

                    {/* Mark as Paid Button — requires customer + valid payment */}
                    <div className="relative">
                      {!hasCustomer && (
                        <p className="text-xs text-amber-600 mb-2">
                          Customer is required — choose Walk-in or a named customer above.
                        </p>
                      )}
                      <button
                        onClick={() => setShowPayConfirmation(true)}
                        disabled={!canCheckout}
                        className="w-full rounded-lg bg-green-600 py-2 md:py-3 text-sm md:text-base text-white font-semibold transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Mark as Paid
                      </button>

                      {/* Inline confirmation popover */}
                      {showPayConfirmation && canCheckout && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                          <div className="text-sm text-slate-600 mb-3 space-y-1">
                            <div className="flex justify-between">
                              <span>Total:</span>
                              <span className="font-medium">{formatPHP(activeDraft.total)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cash:</span>
                              <span className="font-medium">{formatPHP(cashAmount)}</span>
                            </div>
                            <div className="flex justify-between text-green-600 font-semibold">
                              <span>Change:</span>
                              <span>{formatPHP(changeAmount)}</span>
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
