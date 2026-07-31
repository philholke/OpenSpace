"use client";

import { create } from "zustand";
import type { PlanItem, Reference, Room, Scheme } from "./types";
import { CATALOG } from "./catalog";
import { createDemoScheme } from "./demo";

interface SchemeState {
  scheme: Scheme;
  selectedItemId: string | null;
  selectedRoomId: string | null;

  // Selection
  selectItem: (id: string | null) => void;
  selectRoom: (id: string | null) => void;

  // Items — the same thing the album pins and the cost prices
  addItem: (catalogKey: string, x: number, y: number) => string;
  updateItem: (id: string, patch: Partial<PlanItem>) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  rotateItem: (id: string, deltaDeg: number) => void;

  // Rooms
  updateRoom: (id: string, patch: Partial<Room>) => void;

  // Album
  addReference: (ref: Omit<Reference, "id">) => void;
  removeReference: (id: string) => void;
  /**
   * Attach a pinned reference to a placed item. The box inherits the
   * reference's real dimensions — which may push back on the layout.
   */
  attachReference: (itemId: string, refId: string) => void;
  detachReference: (itemId: string) => void;

  // Scheme
  renameScheme: (name: string) => void;
  resetDemo: () => void;
  /** Replace the whole scheme — how a digitised drawing lands in the workspace. */
  loadScheme: (scheme: Scheme) => void;
}

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${counter++}`;

export const useSchemeStore = create<SchemeState>((set, get) => ({
  scheme: createDemoScheme(),
  selectedItemId: null,
  selectedRoomId: null,

  selectItem: (id) => set({ selectedItemId: id, selectedRoomId: null }),
  selectRoom: (id) => set({ selectedRoomId: id, selectedItemId: null }),

  addItem: (catalogKey, x, y) => {
    const c = CATALOG.find((e) => e.key === catalogKey);
    if (!c) return "";
    const item: PlanItem = {
      id: uid(catalogKey),
      name: c.name,
      category: c.category,
      x,
      y,
      w: c.w,
      d: c.d,
      h: c.h,
      rotation: 0,
      seats: c.seats,
      dimSource: "placed",
    };
    set((s) => ({
      scheme: { ...s.scheme, items: [...s.scheme.items, item] },
      selectedItemId: item.id,
      selectedRoomId: null,
    }));
    return item.id;
  },

  updateItem: (id, patch) =>
    set((s) => ({
      scheme: {
        ...s.scheme,
        items: s.scheme.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      },
    })),

  removeItem: (id) =>
    set((s) => ({
      scheme: { ...s.scheme, items: s.scheme.items.filter((it) => it.id !== id) },
      selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
    })),

  duplicateItem: (id) => {
    const src = get().scheme.items.find((it) => it.id === id);
    if (!src) return;
    const copy: PlanItem = { ...src, id: uid("copy"), x: src.x + 300, y: src.y + 300 };
    set((s) => ({
      scheme: { ...s.scheme, items: [...s.scheme.items, copy] },
      selectedItemId: copy.id,
    }));
  },

  rotateItem: (id, deltaDeg) =>
    set((s) => ({
      scheme: {
        ...s.scheme,
        items: s.scheme.items.map((it) =>
          it.id === id ? { ...it, rotation: (it.rotation + deltaDeg + 360) % 360 } : it,
        ),
      },
    })),

  updateRoom: (id, patch) =>
    set((s) => ({
      scheme: {
        ...s.scheme,
        rooms: s.scheme.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    })),

  addReference: (ref) =>
    set((s) => ({
      scheme: {
        ...s.scheme,
        references: [{ ...ref, id: uid("ref") }, ...s.scheme.references],
      },
    })),

  removeReference: (id) =>
    set((s) => ({
      scheme: {
        ...s.scheme,
        references: s.scheme.references.filter((r) => r.id !== id),
        items: s.scheme.items.map((it) =>
          it.refId === id ? { ...it, refId: undefined } : it,
        ),
      },
    })),

  attachReference: (itemId, refId) => {
    const ref = get().scheme.references.find((r) => r.id === refId);
    set((s) => ({
      scheme: {
        ...s.scheme,
        items: s.scheme.items.map((it) => {
          if (it.id !== itemId) return it;
          const next: PlanItem = { ...it, refId };
          if (ref?.dims) {
            next.w = ref.dims.w;
            next.d = ref.dims.d;
            next.h = ref.dims.h;
            next.dimSource = "measured";
          }
          return next;
        }),
      },
    }));
  },

  detachReference: (itemId) =>
    set((s) => ({
      scheme: {
        ...s.scheme,
        items: s.scheme.items.map((it) =>
          it.id === itemId ? { ...it, refId: undefined, dimSource: "placed" } : it,
        ),
      },
    })),

  renameScheme: (name) => set((s) => ({ scheme: { ...s.scheme, name } })),
  resetDemo: () => set({ scheme: createDemoScheme(), selectedItemId: null, selectedRoomId: null }),
  loadScheme: (scheme) => set({ scheme, selectedItemId: null, selectedRoomId: null }),
}));
