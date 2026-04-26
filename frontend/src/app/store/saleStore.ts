import { create } from "zustand";
import type { PackageMeasure } from "@prisma/client";
import { useToastStore } from "./toastStore";
import { WALK_IN_CUSTOMER_ID, WALK_IN_CUSTOMER_NAME } from "@/src/app/lib/walkInCustomer";
import { minSaleMaterialQuantity } from "@/src/app/lib/materialPackage";
import {
  parseOptionalMaterialsJson,
  parseOptionalSessionRemarks,
  serializeOptionalMaterialsForApi,
} from "@/src/app/lib/optionalSessionMaterials";

// Material used in a draft sale item
export type DraftMaterial = {
  materialId: string;
  name: string;
  unit: string;
  quantity: number;
  packageAmount?: number | null;
  packageMeasure?: PackageMeasure | null;
};

// Hair coloring line details (only when Service.hairColoringFlow is true)
export type ColoringDetails = {
  serviceDisplayName?: string;
  colorUsed?: string;
  developer?: string;
  itemStaffName?: string;
  remarks?: string;
};

// Draft sale item (temporary, in-memory only)
export type DraftSaleItem = {
  id: string;
  serviceId: string;
  /** From Service.category (legacy strings possible on old drafts) */
  serviceCategory?: string | null;
  hairColoringFlow?: boolean | null;
  name: string;
  price: number;
  qty: number;
  durationMin?: number;
  materials?: DraftMaterial[];
  coloringDetails?: ColoringDetails;
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
  customerId?: string;
  customerName?: string;
  customerPhone?: string | null;
  name?: string;
  status: DraftStatus;
  isPaid: boolean;
  items: DraftSaleItem[];
  /** Optional extras for this visit (persisted on Sale.optionalMaterials JSON) */
  optionalSessionMaterials: DraftMaterial[];
  /** Session notes (same JSON field as optional materials) */
  optionalSessionRemarks: string;
  subtotal: number;
  total: number;
  createdAt: string;
};

/** POST /api/sessions returns a Prisma sale; NextAuth uses `{ user, expires }` — reject the latter. */
function isApiSalePayload(data: unknown): data is { id: string; branchId: string } {
  if (typeof data !== "object" || data === null) return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.branchId === "string" &&
    o.user === undefined &&
    o.expires === undefined
  );
}

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
  updateDraftCustomer: (
    draftId: string,
    customer: { id: string; name: string; phone?: string | null } | null
  ) => void;
  removeDraft: (draftId: string) => void;
  clearAllDrafts: () => void;

  // Item management (optimistic + debounced)
  addItemToDraft: (
    draftId: string,
    item: {
      serviceId: string;
      serviceCategory?: string | null;
      hairColoringFlow?: boolean | null;
      name: string;
      price: number;
      qty: number;
      durationMin?: number;
      materials?: DraftMaterial[];
      coloringDetails?: ColoringDetails;
    }
  ) => void;
  removeItemFromDraft: (draftId: string, itemId: string) => void;

  // Material management (optimistic + debounced)
  updateItemMaterial: (
    draftId: string,
    materialId: string,
    quantity: number
  ) => void;

  /** Replace optional session materials + remarks (from modal or clear) */
  setOptionalSessionMaterials: (
    draftId: string,
    materials: DraftMaterial[],
    remarks?: string
  ) => void;
  adjustOptionalSessionMaterial: (
    draftId: string,
    materialId: string,
    quantity: number
  ) => void;
  removeOptionalSessionMaterial: (draftId: string, materialId: string) => void;

  // Checkout
  checkoutDraft: (draftId: string, cashReceived?: number) => Promise<boolean>;
};

// Helper: Convert DB session to store draft format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbSessionToDraft(session: any): DraftSale {
  // Map items first
  const items = (session.saleServices || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ss: any): DraftSaleItem => {
      const displayName = ss.serviceDisplayName || ss.service?.name || "Unknown Service";
      const coloringDetails: ColoringDetails | undefined =
        ss.serviceDisplayName || ss.colorUsed || ss.developer || ss.itemStaffName || ss.remarks
          ? {
              serviceDisplayName: ss.serviceDisplayName || undefined,
              colorUsed: ss.colorUsed || undefined,
              developer: ss.developer || undefined,
              itemStaffName: ss.itemStaffName || undefined,
              remarks: ss.remarks || undefined,
            }
          : undefined;
      return {
        id: ss.id,
        serviceId: ss.serviceId,
        serviceCategory: ss.service?.category ?? null,
        hairColoringFlow: ss.service?.hairColoringFlow ?? null,
        name: displayName,
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
            packageAmount: sm.material?.packageAmount ?? null,
            packageMeasure: sm.material?.packageMeasure ?? null,
          };
        }
      ),
        coloringDetails,
      };
    }
  );

  // Calculate totals from items (don't trust DB values which may be stale)
  const subtotal = items.reduce((sum: number, item: DraftSaleItem) => sum + item.price * item.qty, 0);

  const resolvedCustomerId = session.customer?.id ?? session.customerId ?? null;
  const useWalkIn = !resolvedCustomerId;
  return {
    id: session.id,
    branchId: session.branchId,
    staffId: session.staffId,
    staffName: session.staff?.name || undefined,
    customerId: useWalkIn ? WALK_IN_CUSTOMER_ID : resolvedCustomerId,
    customerName: useWalkIn
      ? WALK_IN_CUSTOMER_NAME
      : session.customer?.name ??
        (resolvedCustomerId === WALK_IN_CUSTOMER_ID ? WALK_IN_CUSTOMER_NAME : "Customer"),
    customerPhone: useWalkIn ? null : session.customer?.phone ?? null,
    name: session.name || undefined,
    status: "active",
    isPaid: false,
    items,
    optionalSessionMaterials: parseOptionalMaterialsJson(session.optionalMaterials),
    optionalSessionRemarks: parseOptionalSessionRemarks(session.optionalMaterials),
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
// Save 1.5s after last change for snappier sync (reset on every change)
// ============================================
const SAVE_DELAY = 1500;
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

  // Set new timer - save after SAVE_DELAY ms of inactivity
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
    if (!staffId?.trim()) {
      useToastStore.getState().show(
        "No staff for this branch. Add a staff member (owner dashboard) and reload this page."
      );
      return;
    }
    set({ pendingSessionCreation: true, pendingCreationStaffId: staffId });
  },

  confirmSessionCreation: async () => {
    const { pendingCreationStaffId, createDraft } = get();
    // Only treat null/undefined as "not started" — "" means branch has no staff (must not use !value)
    if (pendingCreationStaffId === null || pendingCreationStaffId === undefined) return;
    if (pendingCreationStaffId === "") {
      useToastStore.getState().show(
        "No staff for this branch. Add a staff member, then try again."
      );
      return;
    }
    const draft = await createDraft(pendingCreationStaffId);
    if (draft) {
      set({ pendingSessionCreation: false, pendingCreationStaffId: null });
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

      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : `Could not create session (${res.status})`;
        useToastStore.getState().show(msg);
        console.error("POST /api/sessions failed:", res.status, data);
        return null;
      }

      if (!isApiSalePayload(data)) {
        useToastStore.getState().show(
          "Invalid response from server. In DevTools Network, open the POST /api/sessions request (not /api/auth/session)."
        );
        console.error("POST /api/sessions returned unexpected JSON:", data);
        return null;
      }

      const draft = dbSessionToDraft(data);

      set((state) => ({
        draftSales: [...state.draftSales, draft],
        activeDraftId: draft.id,
      }));

      return draft;
    } catch (error) {
      console.error("Failed to create draft:", error);
      useToastStore.getState().show("Failed to create session. Check the console.");
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

  // Optimistic + debounced
  updateDraftCustomer: (draftId, customer) => {
    const effective =
      customer ??
      ({
        id: WALK_IN_CUSTOMER_ID,
        name: WALK_IN_CUSTOMER_NAME,
        phone: null as string | null,
      });

    // Immediate UI update
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = {
        ...updatedDrafts[draftIndex],
        customerId: effective.id,
        customerName: effective.name,
        customerPhone: effective.phone ?? null,
      };
      return { draftSales: updatedDrafts };
    });

    // Queue debounced save
    queueSave(draftId, async () => {
      await fetch(`/api/sessions/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: effective.id }),
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
        serviceCategory: item.serviceCategory ?? null,
        hairColoringFlow: item.hairColoringFlow ?? null,
        name: item.name,
        price: item.price,
        qty: item.qty,
        durationMin: item.durationMin,
        materials: item.materials,
        coloringDetails: item.coloringDetails,
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
          serviceDisplayName: item.coloringDetails?.serviceDisplayName,
          colorUsed: item.coloringDetails?.colorUsed,
          developer: item.coloringDetails?.developer,
          itemStaffName: item.coloringDetails?.itemStaffName,
          remarks: item.coloringDetails?.remarks,
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
        materials: item.materials?.map((m) => {
          if (m.materialId !== materialId) return m;
          const min = minSaleMaterialQuantity(m);
          return { ...m, quantity: Math.max(min, quantity) };
        }),
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

  setOptionalSessionMaterials: (draftId, materials, remarks) => {
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;
      const prev = state.draftSales[draftIndex];
      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = {
        ...prev,
        optionalSessionMaterials: materials,
        optionalSessionRemarks:
          remarks !== undefined ? remarks : prev.optionalSessionRemarks,
      };
      return { draftSales: updatedDrafts };
    });

    queueSave(draftId, async () => {
      const draft = get().draftSales.find((d) => d.id === draftId);
      if (!draft) return;
      await fetch(`/api/sessions/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionalMaterials: serializeOptionalMaterialsForApi(
            draft.optionalSessionMaterials ?? [],
            draft.optionalSessionRemarks ?? ""
          ),
        }),
      });
    });
  },

  adjustOptionalSessionMaterial: (draftId, materialId, quantity) => {
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;

      const draft = state.draftSales[draftIndex];
      const list = draft.optionalSessionMaterials ?? [];
      const updatedOptional = list.map((m) => {
        if (m.materialId !== materialId) return m;
        const minQ = minSaleMaterialQuantity(m);
        return { ...m, quantity: Math.max(minQ, quantity) };
      });

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = {
        ...draft,
        optionalSessionMaterials: updatedOptional,
      };
      return { draftSales: updatedDrafts };
    });

    queueSave(draftId, async () => {
      const draft = get().draftSales.find((d) => d.id === draftId);
      if (!draft) return;
      await fetch(`/api/sessions/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionalMaterials: serializeOptionalMaterialsForApi(
            draft.optionalSessionMaterials ?? [],
            draft.optionalSessionRemarks ?? ""
          ),
        }),
      });
    });
  },

  removeOptionalSessionMaterial: (draftId, materialId) => {
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;

      const draft = state.draftSales[draftIndex];
      const updatedOptional = (draft.optionalSessionMaterials ?? []).filter(
        (m) => m.materialId !== materialId
      );

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = {
        ...draft,
        optionalSessionMaterials: updatedOptional,
      };
      return { draftSales: updatedDrafts };
    });

    queueSave(draftId, async () => {
      const draft = get().draftSales.find((d) => d.id === draftId);
      if (!draft) return;
      await fetch(`/api/sessions/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionalMaterials: serializeOptionalMaterialsForApi(
            draft.optionalSessionMaterials ?? [],
            draft.optionalSessionRemarks ?? ""
          ),
        }),
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
