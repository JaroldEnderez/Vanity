import { create } from "zustand";

// Material used in a draft sale item
export type DraftMaterial = {
  materialId: string;
  name: string;
  unit: string;
  quantity: number;
};

// Draft sale item (temporary, in-memory only)
export type DraftSaleItem = {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  qty: number;
  durationMin?: number;
  materials?: DraftMaterial[];
};

// Status colors:
// 🔵 active - Blue (currently selected, in progress)
// 🟢 completed - Green (paid and done)
// 🟡 overdue - Yellow (service taking longer than expected)
export type DraftStatus = "active" | "completed" | "overdue";

// Draft sale (session)
export type DraftSale = {
  id: string;
  branchId: string;
  staffId: string;
  staffName?: string;
  name?: string;
  status: DraftStatus;
  isPaid: boolean;
  items: DraftSaleItem[];
  subtotal: number;
  total: number;
  createdAt: string;
};

type SaleStore = {
  draftSales: DraftSale[];
  activeDraftId: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  isSaving: boolean;

  // Pending session creation (confirm before creating)
  pendingSessionCreation: boolean;
  pendingCreationStaffId: string | null;
  startSessionCreation: (staffId: string) => void;
  confirmSessionCreation: () => Promise<void>;
  cancelSessionCreation: () => void;

  // Computed getter for active drafth
  getActiveDraft: () => DraftSale | null;

  // Initialization (load from DB)
  loadDraftsFromDB: () => Promise<void>;

  // Draft management
  createDraft: (staffId: string, name?: string) => Promise<DraftSale | null>;
  setActiveDraft: (draftId: string | null) => void;
  updateDraftName: (draftId: string, name: string) => void;
  updateDraftStaff: (draftId: string, staffId: string, staffName: string) => void;
  removeDraft: (draftId: string) => void;
  clearAllDrafts: () => void;

  // Item management (optimistic + debounced)
  addItemToDraft: (
    draftId: string,
    item: {
      serviceId: string;
      name: string;
      price: number;
      qty: number;
      durationMin?: number;
      materials?: DraftMaterial[];
    }
  ) => void;
  removeItemFromDraft: (draftId: string, itemId: string) => void;

  // Material management (optimistic + debounced)
  updateItemMaterial: (
    draftId: string,
    materialId: string,
    quantity: number
  ) => void;

  // Checkout
  checkoutDraft: (draftId: string, cashReceived?: number) => Promise<boolean>;
};

// Helper: Convert DB session to store draft format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbSessionToDraft(session: any): DraftSale {
  // Map items first
  const items = (session.saleServices || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ss: any): DraftSaleItem => ({
      id: ss.id,
      serviceId: ss.serviceId,
      name: ss.service?.name || "Unknown Service",
      price: ss.price,
      qty: ss.qty,
      durationMin: ss.service?.durationMin || undefined,
      materials: (ss.service?.materials || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sm: any): DraftMaterial => {
          // Find actual quantity from saleMaterials if exists
          const saleMaterial = (session.saleMaterials || []).find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (m: any) => m.materialId === sm.materialId
          );
          return {
            materialId: sm.materialId,
            name: sm.material?.name || "Unknown Material",
            unit: sm.material?.unit || "pcs",
            quantity: saleMaterial?.quantity || sm.quantity,
          };
        }
      ),
    })
  );

  // Calculate totals from items (don't trust DB values which may be stale)
  const subtotal = items.reduce((sum: number, item: DraftSaleItem) => sum + item.price * item.qty, 0);

  return {
    id: session.id,
    branchId: session.branchId,
    staffId: session.staffId,
    staffName: session.staff?.name || undefined,
    name: session.name || undefined,
    status: "active",
    isPaid: false,
    items,
    subtotal,
    total: subtotal,
    createdAt: session.createdAt,
  };
}

// Helper: Calculate totals for a draft
function recalculateTotals(draft: DraftSale): DraftSale {
  const subtotal = draft.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return { ...draft, subtotal, total: subtotal };
}

// Generate temporary ID for optimistic items
function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// DEBOUNCED SAVE MECHANISM
// Save 3 seconds after last change
// Reset timer on every change
// ============================================
const SAVE_DELAY = 3000;
const saveTimers: Map<string, NodeJS.Timeout> = new Map();
const pendingOperations: Map<string, Array<() => Promise<void>>> = new Map();

function queueSave(draftId: string, operation: () => Promise<void>) {
  // Add operation to pending queue
  const ops = pendingOperations.get(draftId) || [];
  ops.push(operation);
  pendingOperations.set(draftId, ops);

  // Clear existing timer (reset on every change)
  const existingTimer = saveTimers.get(draftId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer - save after 3 seconds of inactivity
  const timer = setTimeout(async () => {
    const operations = pendingOperations.get(draftId) || [];
    pendingOperations.delete(draftId);
    saveTimers.delete(draftId);

    if (operations.length > 0) {
      useSaleStore.setState({ isSaving: true });
      try {
        for (const op of operations) {
          await op();
        }
      } catch (error) {
        console.error("Failed to save:", error);
      } finally {
        useSaleStore.setState({ isSaving: false });
      }
    }
  }, SAVE_DELAY);

  saveTimers.set(draftId, timer);
}

// Force save immediately (used before checkout)
async function flushSaves(draftId: string) {
  const timer = saveTimers.get(draftId);
  if (timer) {
    clearTimeout(timer);
    saveTimers.delete(draftId);
  }

  const operations = pendingOperations.get(draftId) || [];
  pendingOperations.delete(draftId);

  for (const op of operations) {
    await op();
  }
}

export const useSaleStore = create<SaleStore>((set, get) => ({
  draftSales: [],
  activeDraftId: null,
  isLoading: false,
  isInitialized: false,
  isSaving: false,
  pendingSessionCreation: false,
  pendingCreationStaffId: null,

  startSessionCreation: (staffId: string) => {
    set({ pendingSessionCreation: true, pendingCreationStaffId: staffId });
  },

  confirmSessionCreation: async () => {
    const { pendingCreationStaffId, createDraft } = get();
    if (!pendingCreationStaffId) return;
    set({ isLoading: true });
    try {
      await createDraft(pendingCreationStaffId);
      set({ pendingSessionCreation: false, pendingCreationStaffId: null });
    } finally {
      set({ isLoading: false, pendingSessionCreation: false, pendingCreationStaffId: null });
    }
  },

  cancelSessionCreation: () => {
    set({ pendingSessionCreation: false, pendingCreationStaffId: null });
  },

  getActiveDraft: () => {
    const state = get();
    if (!state.activeDraftId) return null;
    return state.draftSales.find((s) => s.id === state.activeDraftId) || null;
  },

  loadDraftsFromDB: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");

      const sessions = await res.json();
      const drafts = sessions.map(dbSessionToDraft);

      set({
        draftSales: drafts,
        activeDraftId: drafts.length > 0 ? drafts[0].id : null,
        isInitialized: true,
      });
    } catch (error) {
      console.error("Failed to load drafts:", error);
      set({ isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  createDraft: async (staffId, name) => {
    set({ isLoading: true });
    try {
      // Generate default name if not provided
      const state = get();
      const defaultName = name || `Session #${state.draftSales.length + 1}`;

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, name: defaultName }),
      });

      if (!res.ok) throw new Error("Failed to create session");

      const session = await res.json();
      const draft = dbSessionToDraft(session);

      set((state) => ({
        draftSales: [...state.draftSales, draft],
        activeDraftId: draft.id,
      }));

      return draft;
    } catch (error) {
      console.error("Failed to create draft:", error);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveDraft: (draftId) =>
    set((state) => {
      const draftExists = state.draftSales.some((s) => s.id === draftId);
      return { activeDraftId: draftExists ? draftId : null };
    }),

  // Optimistic + debounced
  updateDraftName: (draftId, name) => {
    // Immediate UI update
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = { ...updatedDrafts[draftIndex], name };
      return { draftSales: updatedDrafts };
    });

    // Queue debounced save
    queueSave(draftId, async () => {
      await fetch(`/api/sessions/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    });
  },

  // Optimistic + debounced
  updateDraftStaff: (draftId, staffId, staffName) => {
    // Immediate UI update
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = { ...updatedDrafts[draftIndex], staffId, staffName };
      return { draftSales: updatedDrafts };
    });

    // Queue debounced save
    queueSave(draftId, async () => {
      await fetch(`/api/sessions/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
    });
  },

  // Optimistic + immediate (deletes are critical)
  removeDraft: (draftId) => {
    // Immediate UI update
    set((state) => {
      const updatedDrafts = state.draftSales.filter((s) => s.id !== draftId);
      const newActiveDraftId =
        state.activeDraftId === draftId
          ? updatedDrafts.length > 0
            ? updatedDrafts[0].id
            : null
          : state.activeDraftId;
      return { draftSales: updatedDrafts, activeDraftId: newActiveDraftId };
    });

    // Sync to DB immediately
    fetch(`/api/sessions/${draftId}`, { method: "DELETE" }).catch((error) =>
      console.error("Failed to delete draft:", error)
    );
  },

  clearAllDrafts: () => set({ draftSales: [], activeDraftId: null }),

  // Optimistic + debounced
  addItemToDraft: (draftId, item) => {
    const tempId = generateTempId();

    // Immediate UI update (no waiting!)
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;

      const draft = state.draftSales[draftIndex];
      const newItem: DraftSaleItem = {
        id: tempId,
        serviceId: item.serviceId,
        name: item.name,
        price: item.price,
        qty: item.qty,
        durationMin: item.durationMin,
        materials: item.materials,
      };

      const updatedDraft = recalculateTotals({
        ...draft,
        items: [...draft.items, newItem],
      });

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = updatedDraft;
      return { draftSales: updatedDrafts };
    });

    // Queue debounced save
    queueSave(draftId, async () => {
      const res = await fetch(`/api/sessions/${draftId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: item.serviceId,
          qty: item.qty,
          price: item.price,
          materials: item.materials?.map((m) => ({
            materialId: m.materialId,
            quantity: m.quantity,
          })),
        }),
      });

      if (res.ok) {
        // Update with real data from server
        const session = await res.json();
        const updatedDraft = dbSessionToDraft(session);
        set((state) => ({
          draftSales: state.draftSales.map((d) =>
            d.id === draftId ? updatedDraft : d
          ),
        }));
      }
    });
  },

  // Optimistic + debounced
  removeItemFromDraft: (draftId, itemId) => {
    // Immediate UI update
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;

      const draft = state.draftSales[draftIndex];
      const updatedDraft = recalculateTotals({
        ...draft,
        items: draft.items.filter((i) => i.id !== itemId),
      });

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = updatedDraft;
      return { draftSales: updatedDrafts };
    });

    // Queue debounced save (skip temp items that haven't been saved yet)
    if (!itemId.startsWith("temp-")) {
      queueSave(draftId, async () => {
        await fetch(`/api/sessions/${draftId}/items/${itemId}`, {
          method: "DELETE",
        });
      });
    }
  },

  // Optimistic + debounced
  updateItemMaterial: (draftId, materialId, quantity) => {
    // Immediate UI update
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;

      const draft = state.draftSales[draftIndex];
      const updatedItems = draft.items.map((item) => ({
        ...item,
        materials: item.materials?.map((m) =>
          m.materialId === materialId ? { ...m, quantity: Math.max(1, quantity) } : m
        ),
      }));

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = { ...draft, items: updatedItems };
      return { draftSales: updatedDrafts };
    });

    // Queue debounced save
    queueSave(draftId, async () => {
      await fetch(`/api/sessions/${draftId}/materials/${materialId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
    });
  },

  checkoutDraft: async (draftId, cashReceived) => {
    // Flush any pending saves first
    await flushSaves(draftId);

    set({ isLoading: true });
    try {
      const res = await fetch(`/api/sessions/${draftId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cashReceived }),
      });

      if (!res.ok) throw new Error("Failed to checkout");

      // Remove from drafts after successful checkout
      set((state) => {
        const updatedDrafts = state.draftSales.filter((s) => s.id !== draftId);
        const newActiveDraftId =
          state.activeDraftId === draftId
            ? updatedDrafts.length > 0
              ? updatedDrafts[0].id
              : null
            : state.activeDraftId;
        return { draftSales: updatedDrafts, activeDraftId: newActiveDraftId };
      });

      return true;
    } catch (error) {
      console.error("Failed to checkout:", error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));
