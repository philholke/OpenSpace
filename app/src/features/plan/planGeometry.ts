import type { ItemCategory, Opening, Point, RoomKind } from "@/features/scheme/types";

/** Wall thickness used for drawing the boundary, mm. */
export const WALL_T = 150;

export interface OpeningPlacement {
  /** Centre of the opening span, on the wall line. */
  cx: number;
  cy: number;
  /** Rotation of the edge, degrees. */
  angle: number;
  /** Span length along the edge, mm. */
  len: number;
  /** Unit vector along the edge. */
  ux: number;
  uy: number;
  /** Unit normal (to the left of travel — into the room for a clockwise boundary). */
  nx: number;
  ny: number;
}

export function placeOpening(boundary: Point[], opening: Opening): OpeningPlacement {
  const a = boundary[opening.edge];
  const b = boundary[(opening.edge + 1) % boundary.length];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const sx = a.x + ux * opening.offset;
  const sy = a.y + uy * opening.offset;
  return {
    cx: sx + (ux * opening.width) / 2,
    cy: sy + (uy * opening.width) / 2,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    len: opening.width,
    ux,
    uy,
    // Clockwise polygon in screen coords (y down): interior is to the left of travel
    nx: uy,
    ny: -ux,
  };
}

/** Muted categorical tints (§13) for zones — never the brand accent. */
export const ROOM_COLORS: Record<RoomKind, string> = {
  dining: "#5a7d5f",
  bar: "#7a5c8a",
  kitchen: "#335a7a",
  wc: "#6b6962",
  storage: "#b0843f",
  service: "#8a5a1f",
  outdoor: "#2f6b46",
  other: "#6b6962",
};

export const ITEM_COLORS: Record<ItemCategory, string> = {
  seating: "#5a7d5f",
  table: "#b0843f",
  counter: "#8a5a1f",
  equipment: "#335a7a",
  fixture: "#6b6962",
  decor: "#7a5c8a",
};

export function polygonPath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
}

export const snap = (v: number, grid = 25) => Math.round(v / grid) * grid;
