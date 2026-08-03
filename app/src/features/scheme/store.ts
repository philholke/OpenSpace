"use client";

import { create } from "zustand";
import type {
  Opening,
  OpeningKind,
  PlanItem,
  Point,
  Reference,
  Room,
  Scheme,
} from "./types";
import {
  DEFAULT_OPENING_WIDTHS,
  MIN_OPENING_WIDTH,
  clampOpeningToEdge,
  projectPointToBoundary,
  reprojectOpenings,
  snap,
} from "@/features/plan/planGeometry";
import { CATALOG } from "./catalog";
import { createDemoScheme } from "./demo";

/** What is selected while editing the shell in Walls mode. */
export type WallSelection =
  | { kind: "vertex"; index: number }
  | { kind: "edge"; index: number }
  | { kind: "opening"; id: string }
  | null;

export type PlanMode = "layout" | "walls";

interface SchemeState {
  scheme: Scheme;
  selectedItemId: string | null;
  selectedRoomId: string | null;
  planMode: PlanMode;
  wallSelection: WallSelection;

  // Selection
  selectItem: (id: string | null) => void;
  selectRoom: (id: string | null) => void;
  setPlanMode: (mode: PlanMode) => void;
  selectWall: (sel: WallSelection) => void;

  // Boundary — correcting the trace is the same editor as drawing it
  updateBoundaryVertex: (index: number, x: number, y: number) => void;
  insertBoundaryVertex: (edge: number, x: number, y: number) => number;
  removeBoundaryVertex: (index: number) => void;
  /** Set both endpoints of an edge at once — how a whole wall is pushed in/out. */
  setEdgePosition: (edge: number, a: Point, b: Point) => void;
  /** Re-length an edge along its direction; the far endpoint moves. */
  setEdgeLength: (edge: number, lengthMm: number) => void;

  // Openings
  addOpening: (kind: OpeningKind, x: number, y: number) => string | null;
  updateOpening: (
    id: string,
    patch: Partial<Pick<Opening, "kind" | "width" | "offset">>,
  ) => void;
  /** Drag an opening by its centre — it re-homes onto the nearest wall. */
  moveOpeningTo: (id: string, x: number, y: number) => void;
  /** Drag one end of an opening along its wall. */
  resizeOpeningTo: (id: string, end: "start" | "end", x: number, y: number) => void;
  removeOpening: (id: string) => void;

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

/** Shortest edge the boundary editor will produce, mm. */
const MIN_EDGE_MM = 50;
/** How close to a wall a hand-placed opening must land, mm. */
const PLACE_TOLERANCE_MM = 1500;

const boundaryValid = (b: Point[]): boolean => {
  if (b.length < 3) return false;
  for (let i = 0; i < b.length; i++) {
    const a = b[i];
    const c = b[(i + 1) % b.length];
    if (Math.hypot(c.x - a.x, c.y - a.y) < MIN_EDGE_MM) return false;
  }
  return true;
};

/**
 * Every boundary mutation funnels through here: reject degenerate polygons,
 * then re-home the openings onto the new walls by their centre points.
 */
const withBoundary = (s: SchemeState, boundary: Point[]): Partial<SchemeState> => {
  if (!boundaryValid(boundary)) return {};
  const { unit } = s.scheme;
  const openings = reprojectOpenings(unit.boundary, boundary, unit.openings);
  return { scheme: { ...s.scheme, unit: { ...unit, boundary, openings } } };
};

const withOpenings = (s: SchemeState, openings: Opening[]): Partial<SchemeState> => ({
  scheme: { ...s.scheme, unit: { ...s.scheme.unit, openings } },
});

export const useSchemeStore = create<SchemeState>((set, get) => ({
  scheme: createDemoScheme(),
  selectedItemId: null,
  selectedRoomId: null,
  planMode: "layout",
  wallSelection: null,

  selectItem: (id) => set({ selectedItemId: id, selectedRoomId: null, wallSelection: null }),
  selectRoom: (id) => set({ selectedRoomId: id, selectedItemId: null, wallSelection: null }),
  setPlanMode: (mode) =>
    set({ planMode: mode, wallSelection: null, selectedItemId: null, selectedRoomId: null }),
  selectWall: (sel) =>
    set({ wallSelection: sel, selectedItemId: null, selectedRoomId: null }),

  updateBoundaryVertex: (index, x, y) =>
    set((s) => {
      const b = s.scheme.unit.boundary;
      if (index < 0 || index >= b.length) return {};
      const next = b.map((p, i) => (i === index ? { x, y } : p));
      return withBoundary(s, next);
    }),

  insertBoundaryVertex: (edge, x, y) => {
    const b = get().scheme.unit.boundary;
    if (edge < 0 || edge >= b.length) return -1;
    const next = [...b.slice(0, edge + 1), { x, y }, ...b.slice(edge + 1)];
    set((s) => withBoundary(s, next));
    // If the insert was rejected (degenerate edge), report failure.
    return get().scheme.unit.boundary.length === b.length + 1 ? edge + 1 : -1;
  },

  removeBoundaryVertex: (index) =>
    set((s) => {
      const b = s.scheme.unit.boundary;
      if (b.length <= 3 || index < 0 || index >= b.length) return {};
      const patch = withBoundary(s, b.filter((_, i) => i !== index));
      if (!patch.scheme) return {};
      return { ...patch, wallSelection: null };
    }),

  setEdgePosition: (edge, a, b) =>
    set((s) => {
      const bd = s.scheme.unit.boundary;
      if (edge < 0 || edge >= bd.length) return {};
      const j = (edge + 1) % bd.length;
      const next = bd.map((p, i) => (i === edge ? a : i === j ? b : p));
      return withBoundary(s, next);
    }),

  setEdgeLength: (edge, lengthMm) =>
    set((s) => {
      const bd = s.scheme.unit.boundary;
      if (edge < 0 || edge >= bd.length) return {};
      const len = Math.max(snap(lengthMm), 100);
      const a = bd[edge];
      const j = (edge + 1) % bd.length;
      const old = bd[j];
      const cur = Math.hypot(old.x - a.x, old.y - a.y);
      if (cur < 1) return {};
      const nb = {
        x: Math.round(a.x + ((old.x - a.x) / cur) * len),
        y: Math.round(a.y + ((old.y - a.y) / cur) * len),
      };
      return withBoundary(s, bd.map((p, i) => (i === j ? nb : p)));
    }),

  addOpening: (kind, x, y) => {
    const s = get();
    const boundary = s.scheme.unit.boundary;
    const proj = projectPointToBoundary(boundary, x, y);
    if (!proj || proj.dist > PLACE_TOLERANCE_MM) return null;
    const { offset, width } = clampOpeningToEdge(
      snap(proj.t - DEFAULT_OPENING_WIDTHS[kind] / 2),
      Math.min(DEFAULT_OPENING_WIDTHS[kind], proj.len),
      proj.len,
    );
    const opening: Opening = { id: uid("op"), edge: proj.edge, offset, width, kind };
    set((st) => ({
      ...withOpenings(st, [...st.scheme.unit.openings, opening]),
      wallSelection: { kind: "opening", id: opening.id },
      selectedItemId: null,
      selectedRoomId: null,
    }));
    return opening.id;
  },

  updateOpening: (id, patch) =>
    set((s) => {
      const { boundary, openings } = s.scheme.unit;
      return withOpenings(
        s,
        openings.map((op) => {
          if (op.id !== id) return op;
          const merged = { ...op, ...patch };
          const a = boundary[merged.edge];
          const b = boundary[(merged.edge + 1) % boundary.length];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          return { ...merged, ...clampOpeningToEdge(merged.offset, merged.width, len) };
        }),
      );
    }),

  moveOpeningTo: (id, x, y) =>
    set((s) => {
      const { boundary, openings } = s.scheme.unit;
      const proj = projectPointToBoundary(boundary, x, y);
      if (!proj) return {};
      return withOpenings(
        s,
        openings.map((op) => {
          if (op.id !== id) return op;
          const { offset, width } = clampOpeningToEdge(
            snap(proj.t - op.width / 2),
            op.width,
            proj.len,
          );
          return { ...op, edge: proj.edge, offset, width };
        }),
      );
    }),

  resizeOpeningTo: (id, end, x, y) =>
    set((s) => {
      const { boundary, openings } = s.scheme.unit;
      return withOpenings(
        s,
        openings.map((op) => {
          if (op.id !== id) return op;
          const a = boundary[op.edge];
          const b = boundary[(op.edge + 1) % boundary.length];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy);
          if (len < 1) return op;
          const t = Math.max(
            0,
            Math.min(len, ((x - a.x) * dx + (y - a.y) * dy) / len),
          );
          if (end === "start") {
            const endT = op.offset + op.width;
            const offset = Math.max(0, Math.min(endT - MIN_OPENING_WIDTH, snap(t)));
            return { ...op, offset, width: endT - offset };
          }
          const endT = Math.max(op.offset + MIN_OPENING_WIDTH, Math.min(len, snap(t)));
          return { ...op, width: endT - op.offset };
        }),
      );
    }),

  removeOpening: (id) =>
    set((s) => ({
      ...withOpenings(
        s,
        s.scheme.unit.openings.filter((op) => op.id !== id),
      ),
      wallSelection:
        s.wallSelection?.kind === "opening" && s.wallSelection.id === id
          ? null
          : s.wallSelection,
    })),

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
  resetDemo: () =>
    set({
      scheme: createDemoScheme(),
      selectedItemId: null,
      selectedRoomId: null,
      wallSelection: null,
      planMode: "layout",
    }),
  loadScheme: (scheme) =>
    set({ scheme, selectedItemId: null, selectedRoomId: null, wallSelection: null }),
}));
