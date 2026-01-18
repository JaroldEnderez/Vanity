import { create } from "zustand";

// Draft sale item (temporary, in-memory only)
export type DraftSaleItem = {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  qty: number;
  durationMin?: number; // Expected duration in minutes
};

// Status colors:
// 🔵 active - Blue (currently selected, in progress)
// 🟢 completed - Green (paid and done)
// 🟡 overdue - Yellow (service taking longer than expected)
export type DraftStatus = 'active' | 'completed' | 'overdue';

// Draft sale (temporary session, not persisted)
// This represents a sale in progress, before checkout
export type DraftSale = {
  id: string;
  branchId: string;
  staffId: string;
  name?: string; // Custom name for the draft
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

  // Computed getter for active draft
  getActiveDraft: () => DraftSale | null;

  // Draft management
  createDraft: (branchId: string, staffId: string) => void;
  addDraft: (draft: DraftSale) => void;
  setActiveDraft: (draftId: string | null) => void;
  updateDraftName: (draftId: string, name: string) => void;
  updateDraftStatus: (draftId: string, status: DraftStatus) => void;
  markDraftPaid: (draftId: string) => void;
  removeDraft: (draftId: string) => void;
  clearAllDrafts: () => void;

  // Item management
  addItem: (item: DraftSaleItem) => void;
  addItemToDraft: (draftId: string, item: DraftSaleItem) => void;
  removeItem: (itemId: string) => void;
  removeItemFromDraft: (draftId: string, itemId: string) => void;
};

export const useSaleStore = create<SaleStore>((set, get) => ({
  draftSales: [],
  activeDraftId: null,

  getActiveDraft: () => {
    const state = get();
    if (!state.activeDraftId) return null;
    return state.draftSales.find((s) => s.id === state.activeDraftId) || null;
  },

  createDraft: (branchId, staffId) =>
    set((state) => {
      const newDraft: DraftSale = {
        id: crypto.randomUUID(),
        branchId,
        staffId,
        status: 'active',
        isPaid: false,
        items: [],
        subtotal: 0,
        total: 0,
        createdAt: new Date().toISOString(),
      };
      return {
        draftSales: [...state.draftSales, newDraft],
        activeDraftId: newDraft.id,
      };
    }),

  addDraft: (draft) =>
    set((state) => {
      // Check if draft already exists
      const existingIndex = state.draftSales.findIndex((s) => s.id === draft.id);
      if (existingIndex >= 0) {
        // Update existing draft
        const updatedDrafts = [...state.draftSales];
        updatedDrafts[existingIndex] = draft;
        return {
          draftSales: updatedDrafts,
          activeDraftId: draft.id,
        };
      }
      // Add new draft
      return {
        draftSales: [...state.draftSales, draft],
        activeDraftId: draft.id,
      };
    }),

  setActiveDraft: (draftId) =>
    set((state) => {
      // Verify draft exists
      const draftExists = state.draftSales.some((s) => s.id === draftId);
      return {
        activeDraftId: draftExists ? draftId : null,
      };
    }),

  updateDraftName: (draftId, name) =>
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = {
        ...updatedDrafts[draftIndex],
        name,
      };

      return { draftSales: updatedDrafts };
    }),

  updateDraftStatus: (draftId, status) =>
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = {
        ...updatedDrafts[draftIndex],
        status,
      };

      return { draftSales: updatedDrafts };
    }),

  markDraftPaid: (draftId) =>
    set((state) => {
      const draftIndex = state.draftSales.findIndex((d) => d.id === draftId);
      if (draftIndex === -1) return state;

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = {
        ...updatedDrafts[draftIndex],
        isPaid: true,
        status: 'completed',
      };

      return { draftSales: updatedDrafts };
    }),

  removeDraft: (draftId) =>
    set((state) => {
      const updatedDrafts = state.draftSales.filter((s) => s.id !== draftId);
      const newActiveDraftId =
        state.activeDraftId === draftId
          ? updatedDrafts.length > 0
            ? updatedDrafts[0].id
            : null
          : state.activeDraftId;
      return {
        draftSales: updatedDrafts,
        activeDraftId: newActiveDraftId,
      };
    }),

  clearAllDrafts: () => set({ draftSales: [], activeDraftId: null }),

  addItem: (item) =>
    set((state) => {
      if (!state.activeDraftId) return state;

      const draftIndex = state.draftSales.findIndex((s) => s.id === state.activeDraftId);
      if (draftIndex === -1) return state;

      const draft = state.draftSales[draftIndex];
      const subtotal = draft.subtotal + item.price * item.qty;

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = {
        ...draft,
        items: [...draft.items, item],
        subtotal,
        total: subtotal,
      };

      return { draftSales: updatedDrafts };
    }),

  addItemToDraft: (draftId, item) =>
    set((state) => {
      const draftIndex = state.draftSales.findIndex((s) => s.id === draftId);
      if (draftIndex === -1) return state;

      const draft = state.draftSales[draftIndex];
      const subtotal = draft.subtotal + item.price * item.qty;
      const newItems = [...draft.items, item];

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = {
        ...draft,
        items: newItems,
        subtotal,
        total: subtotal,
      };

      return { draftSales: updatedDrafts };
    }),

  removeItem: (itemId) =>
    set((state) => {
      if (!state.activeDraftId) return state;

      const draftIndex = state.draftSales.findIndex((s) => s.id === state.activeDraftId);
      if (draftIndex === -1) return state;

      const draft = state.draftSales[draftIndex];
      const item = draft.items.find((i) => i.id === itemId);
      if (!item) return state;

      const subtotal = draft.subtotal - item.price * item.qty;

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = {
        ...draft,
        items: draft.items.filter((i) => i.id !== itemId),
        subtotal,
        total: subtotal,
      };

      return { draftSales: updatedDrafts };
    }),

  removeItemFromDraft: (draftId, itemId) =>
    set((state) => {
      const draftIndex = state.draftSales.findIndex((s) => s.id === draftId);
      if (draftIndex === -1) return state;

      const draft = state.draftSales[draftIndex];
      const item = draft.items.find((i) => i.id === itemId);
      if (!item) return state;

      const subtotal = draft.subtotal - item.price * item.qty;

      const updatedDrafts = [...state.draftSales];
      updatedDrafts[draftIndex] = {
        ...draft,
        items: draft.items.filter((i) => i.id !== itemId),
        subtotal,
        total: subtotal,
      };

      return { draftSales: updatedDrafts };
    }),
}));
