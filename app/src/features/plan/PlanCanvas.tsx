"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Scan } from "lucide-react";
import { useSchemeStore } from "@/features/scheme/store";
import { polygonBounds, polygonAreaM2 } from "@/features/scheme/derive";
import { fmtArea } from "@/lib/format";
import {
  ITEM_COLORS,
  ROOM_COLORS,
  WALL_T,
  placeOpening,
  polygonPath,
  snap,
} from "./planGeometry";

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MARGIN = 900;

export function PlanCanvas() {
  const scheme = useSchemeStore((s) => s.scheme);
  const selectedItemId = useSchemeStore((s) => s.selectedItemId);
  const selectItem = useSchemeStore((s) => s.selectItem);
  const updateItem = useSchemeStore((s) => s.updateItem);
  const removeItem = useSchemeStore((s) => s.removeItem);
  const rotateItem = useSchemeStore((s) => s.rotateItem);

  const { boundary, openings, columns } = scheme.unit;
  const bounds = useMemo(() => polygonBounds(boundary), [boundary]);

  const fitBox = useCallback(
    (): ViewBox => ({
      x: bounds.minX - MARGIN,
      y: bounds.minY - MARGIN,
      w: bounds.w + MARGIN * 2,
      h: bounds.h + MARGIN * 2,
    }),
    [bounds],
  );

  const [vb, setVb] = useState<ViewBox>(fitBox);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<
    | { kind: "item"; id: string; dx: number; dy: number }
    | { kind: "pan"; startX: number; startY: number; vb: ViewBox }
    | null
  >(null);

  /** Convert a pointer event to plan (mm) coordinates. */
  const toPlan = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const r = svg.getBoundingClientRect();
      // preserveAspectRatio="xMidYMid meet" — figure out the effective scale
      const scale = Math.max(vb.w / r.width, vb.h / r.height);
      const drawnW = vb.w / scale;
      const drawnH = vb.h / scale;
      const padX = (r.width - drawnW) / 2;
      const padY = (r.height - drawnH) / 2;
      return {
        x: vb.x + (e.clientX - r.left - padX) * scale,
        y: vb.y + (e.clientY - r.top - padY) * scale,
      };
    },
    [vb],
  );

  // Wheel zoom needs a non-passive listener to preventDefault
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
      setVb((prev) => {
        const w = Math.min(60000, Math.max(2500, prev.w * factor));
        const scale = w / prev.w;
        const r = svg.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        return {
          x: prev.x + prev.w * px * (1 - scale),
          y: prev.y + prev.h * py * (1 - scale),
          w,
          h: prev.h * scale,
        };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  // Keyboard: delete, rotate, nudge, deselect
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")
        return;
      if (!selectedItemId) return;
      const item = useSchemeStore
        .getState()
        .scheme.items.find((i) => i.id === selectedItemId);
      if (!item) return;
      const step = e.shiftKey ? 100 : 25;
      switch (e.key) {
        case "Delete":
        case "Backspace":
          e.preventDefault();
          removeItem(selectedItemId);
          break;
        case "r":
        case "R":
          rotateItem(selectedItemId, 90);
          break;
        case "Escape":
          selectItem(null);
          break;
        case "ArrowLeft":
          e.preventDefault();
          updateItem(selectedItemId, { x: item.x - step });
          break;
        case "ArrowRight":
          e.preventDefault();
          updateItem(selectedItemId, { x: item.x + step });
          break;
        case "ArrowUp":
          e.preventDefault();
          updateItem(selectedItemId, { y: item.y - step });
          break;
        case "ArrowDown":
          e.preventDefault();
          updateItem(selectedItemId, { y: item.y + step });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedItemId, removeItem, rotateItem, selectItem, updateItem]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.kind === "item") {
        const p = toPlan(e);
        updateItem(drag.id, { x: snap(p.x + drag.dx), y: snap(p.y + drag.dy) });
      } else {
        const svg = svgRef.current;
        if (!svg) return;
        const r = svg.getBoundingClientRect();
        const scale = Math.max(drag.vb.w / r.width, drag.vb.h / r.height);
        setVb({
          ...drag.vb,
          x: drag.vb.x - (e.clientX - drag.startX) * scale,
          y: drag.vb.y - (e.clientY - drag.startY) * scale,
        });
      }
    },
    [toPlan, updateItem],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let x = bounds.minX; x <= bounds.maxX; x += 500)
      lines.push({ x1: x, y1: bounds.minY, x2: x, y2: bounds.maxY });
    for (let y = bounds.minY; y <= bounds.maxY; y += 500)
      lines.push({ x1: bounds.minX, y1: y, x2: bounds.maxX, y2: y });
    return lines;
  }, [bounds]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-sunken">
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {/* Background — pan + deselect */}
        <rect
          x={vb.x - 1e5}
          y={vb.y - 1e5}
          width={3e5}
          height={3e5}
          fill="transparent"
          onPointerDown={(e) => {
            (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(
              e.pointerId,
            );
            selectItem(null);
            dragRef.current = { kind: "pan", startX: e.clientX, startY: e.clientY, vb };
          }}
        />

        <defs>
          <clipPath id="floor-clip">
            <path d={polygonPath(boundary)} />
          </clipPath>
        </defs>

        {/* Floor */}
        <path d={polygonPath(boundary)} fill="var(--surface-base)" />

        {/* Grid, clipped to the floor */}
        <g clipPath="url(#floor-clip)" pointerEvents="none">
          {gridLines.map((l, i) => (
            <line key={i} {...l} stroke="var(--border-subtle)" strokeWidth={6} />
          ))}
        </g>

        {/* Rooms */}
        {scheme.rooms.map((room) => {
          const c = ROOM_COLORS[room.kind];
          return (
            <g key={room.id} pointerEvents="none">
              <rect
                x={room.x}
                y={room.y}
                width={room.w}
                height={room.h}
                fill={c}
                fillOpacity={0.07}
                stroke={c}
                strokeOpacity={0.45}
                strokeWidth={10}
                strokeDasharray="130 90"
              />
              <text
                x={room.x + 160}
                y={room.y + 330}
                fontSize={240}
                fontWeight={500}
                fill={c}
                style={{ fontFamily: "var(--font-sans-stack)" }}
              >
                {room.name}
              </text>
              <text
                x={room.x + 160}
                y={room.y + 620}
                fontSize={190}
                fill="var(--color-text-tertiary)"
                style={{ fontFamily: "var(--font-sans-stack)" }}
              >
                {fmtArea((room.w * room.h) / 1e6)}
              </text>
            </g>
          );
        })}

        {/* Walls */}
        <path
          d={polygonPath(boundary)}
          fill="none"
          stroke="var(--color-text-primary)"
          strokeWidth={WALL_T}
          strokeLinejoin="miter"
          pointerEvents="none"
        />

        {/* Openings cut into the walls */}
        {openings.map((op) => {
          const p = placeOpening(boundary, op);
          return (
            <g
              key={op.id}
              transform={`translate(${p.cx} ${p.cy}) rotate(${p.angle})`}
              pointerEvents="none"
            >
              <rect
                x={-p.len / 2}
                y={-(WALL_T + 60) / 2}
                width={p.len}
                height={WALL_T + 60}
                fill="var(--surface-base)"
              />
              {op.kind === "window" ? (
                <g stroke="var(--color-text-secondary)" strokeWidth={24}>
                  <line x1={-p.len / 2} y1={-38} x2={p.len / 2} y2={-38} />
                  <line x1={-p.len / 2} y1={38} x2={p.len / 2} y2={38} />
                </g>
              ) : op.kind === "double-door" ? (
                <g
                  stroke="var(--color-text-secondary)"
                  strokeWidth={20}
                  fill="none"
                >
                  <path
                    d={`M ${-p.len / 2} 0 L ${-p.len / 2} ${-p.len / 2} A ${p.len / 2} ${p.len / 2} 0 0 1 0 0`}
                  />
                  <path
                    d={`M ${p.len / 2} 0 L ${p.len / 2} ${-p.len / 2} A ${p.len / 2} ${p.len / 2} 0 0 0 0 0`}
                  />
                </g>
              ) : (
                <g stroke="var(--color-text-secondary)" strokeWidth={20} fill="none">
                  <path
                    d={`M ${-p.len / 2} 0 L ${-p.len / 2} ${-p.len} A ${p.len} ${p.len} 0 0 1 ${p.len / 2} 0`}
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Columns */}
        {columns.map((col) => (
          <rect
            key={col.id}
            x={col.x - col.size / 2}
            y={col.y - col.size / 2}
            width={col.size}
            height={col.size}
            fill="var(--color-text-primary)"
            pointerEvents="none"
          />
        ))}

        {/* Items */}
        {scheme.items.map((item) => {
          const selected = item.id === selectedItemId;
          const tint = ITEM_COLORS[item.category];
          const flipLabel = item.rotation > 90 && item.rotation <= 270;
          return (
            <g
              key={item.id}
              transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
              className="cursor-move"
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(
                  e.pointerId,
                );
                selectItem(item.id);
                const p = toPlan(e);
                dragRef.current = {
                  kind: "item",
                  id: item.id,
                  dx: item.x - p.x,
                  dy: item.y - p.y,
                };
              }}
            >
              <rect
                x={-item.w / 2}
                y={-item.d / 2}
                width={item.w}
                height={item.d}
                rx={50}
                fill={tint}
                fillOpacity={0.14}
                stroke={selected ? "var(--color-brand-accent)" : tint}
                strokeOpacity={selected ? 1 : 0.9}
                strokeWidth={selected ? 40 : 22}
              />
              {item.refId && (
                <circle
                  cx={item.w / 2 - 110}
                  cy={-item.d / 2 + 110}
                  r={55}
                  fill="var(--color-feedback-success)"
                />
              )}
              {item.w >= 750 && item.d >= 380 && (
                <text
                  transform={flipLabel ? "rotate(180)" : undefined}
                  x={0}
                  y={55}
                  textAnchor="middle"
                  fontSize={165}
                  fill="var(--color-text-secondary)"
                  pointerEvents="none"
                  style={{ fontFamily: "var(--font-sans-stack)" }}
                >
                  {item.name}
                </text>
              )}
              {selected &&
                [
                  [-item.w / 2, -item.d / 2],
                  [item.w / 2, -item.d / 2],
                  [item.w / 2, item.d / 2],
                  [-item.w / 2, item.d / 2],
                ].map(([hx, hy], i) => (
                  <rect
                    key={i}
                    x={hx - 70}
                    y={hy - 70}
                    width={140}
                    height={140}
                    fill="var(--surface-base)"
                    stroke="var(--color-brand-accent)"
                    strokeWidth={26}
                  />
                ))}
            </g>
          );
        })}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-lg border border-line bg-base p-1 shadow-elevation-1">
        <button
          aria-label="Zoom in"
          className="flex size-7 items-center justify-center rounded-md text-ink-secondary hover:bg-hover"
          onClick={() =>
            setVb((p) => ({
              x: p.x + p.w * 0.09,
              y: p.y + p.h * 0.09,
              w: p.w * 0.82,
              h: p.h * 0.82,
            }))
          }
        >
          <Plus className="size-4" strokeWidth={1.75} />
        </button>
        <button
          aria-label="Zoom out"
          className="flex size-7 items-center justify-center rounded-md text-ink-secondary hover:bg-hover"
          onClick={() =>
            setVb((p) => ({
              x: p.x - p.w * 0.11,
              y: p.y - p.h * 0.11,
              w: p.w * 1.22,
              h: p.h * 1.22,
            }))
          }
        >
          <Minus className="size-4" strokeWidth={1.75} />
        </button>
        <button
          aria-label="Fit to view"
          className="flex size-7 items-center justify-center rounded-md text-ink-secondary hover:bg-hover"
          onClick={() => setVb(fitBox())}
        >
          <Scan className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Scale provenance — honest about scale (§ principles) */}
      <div className="absolute bottom-4 right-4 rounded-full border border-line bg-base px-3 py-1.5 text-xs text-ink-secondary shadow-elevation-1">
        Scale {scheme.unit.scale.source} · {scheme.unit.scale.confidence} confidence ·
        grid 500 mm · {fmtArea(polygonAreaM2(boundary))}
      </div>
    </div>
  );
}
