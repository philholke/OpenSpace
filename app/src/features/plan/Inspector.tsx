"use client";

import { Copy, ExternalLink, RotateCw, Trash2, Unlink } from "lucide-react";
import { Button, Field, Pill, inputClass } from "@/components/ui";
import { useSchemeStore } from "@/features/scheme/store";
import { fmtMoney } from "@/lib/format";
import type { Provenance } from "@/features/scheme/types";

const SOURCE_TONE: Record<Provenance, "success" | "neutral" | "warning" | "info"> = {
  measured: "success",
  derived: "info",
  inferred: "warning",
  placed: "neutral",
};

const SOURCE_LABEL: Record<Provenance, string> = {
  measured: "Dims measured",
  derived: "Dims derived",
  inferred: "Dims inferred",
  placed: "Dims as placed",
};

export function Inspector() {
  const scheme = useSchemeStore((s) => s.scheme);
  const selectedItemId = useSchemeStore((s) => s.selectedItemId);
  const updateItem = useSchemeStore((s) => s.updateItem);
  const removeItem = useSchemeStore((s) => s.removeItem);
  const duplicateItem = useSchemeStore((s) => s.duplicateItem);
  const rotateItem = useSchemeStore((s) => s.rotateItem);
  const attachReference = useSchemeStore((s) => s.attachReference);
  const detachReference = useSchemeStore((s) => s.detachReference);

  const item = scheme.items.find((i) => i.id === selectedItemId);

  if (!item) {
    return (
      <aside className="w-[264px] shrink-0 overflow-y-auto border-l border-line bg-base p-4">
        <div className="text-[13px] font-medium text-ink">Nothing selected</div>
        <p className="mt-1.5 text-[13px] text-ink-tertiary">
          Click an item on the plan to edit it. Drag to move, R to rotate, arrows to
          nudge, Delete to remove.
        </p>
        <div className="mt-5 rounded-lg bg-sunken p-3 text-[13px] text-ink-secondary">
          <div className="font-medium text-ink">{scheme.unit.name}</div>
          <dl className="num mt-2 space-y-1">
            <div className="flex justify-between">
              <dt className="text-ink-tertiary">Ceiling</dt>
              <dd>{(scheme.unit.ceilingHeight / 1000).toFixed(1)} m</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-tertiary">Columns</dt>
              <dd>{scheme.unit.columns.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-tertiary">Openings</dt>
              <dd>{scheme.unit.openings.length}</dd>
            </div>
          </dl>
        </div>
      </aside>
    );
  }

  const ref = item.refId ? scheme.references.find((r) => r.id === item.refId) : undefined;

  const numField = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    step = 50,
  ) => (
    <Field label={label}>
      <input
        type="number"
        className={`${inputClass} num`}
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </Field>
  );

  return (
    <aside className="flex w-[264px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-line bg-base p-4">
      <div>
        <Field label="Name">
          <input
            className={inputClass}
            value={item.name}
            onChange={(e) => updateItem(item.id, { name: e.target.value })}
          />
        </Field>
        <div className="mt-2 flex items-center gap-1.5">
          <Pill tone={SOURCE_TONE[item.dimSource]}>{SOURCE_LABEL[item.dimSource]}</Pill>
          {item.seats > 0 && <Pill>{item.seats} covers</Pill>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {numField("Width (mm)", item.w, (w) => updateItem(item.id, { w, dimSource: "placed" }))}
        {numField("Depth (mm)", item.d, (d) => updateItem(item.id, { d, dimSource: "placed" }))}
        {numField("Height (mm)", item.h, (h) => updateItem(item.id, { h, dimSource: "placed" }))}
        {numField("Seats", item.seats, (seats) => updateItem(item.id, { seats }), 1)}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => rotateItem(item.id, 90)} className="flex-1">
          <RotateCw className="size-3.5" strokeWidth={1.75} />
          Rotate 90°
        </Button>
        <span className="num text-[13px] text-ink-tertiary">{item.rotation}°</span>
      </div>

      {/* The plan/album/cost link, in one panel */}
      <div className="rounded-lg border border-line-subtle bg-sunken p-3">
        <div className="text-xs font-medium text-ink-secondary">Attached reference</div>
        {ref ? (
          <div className="mt-2">
            <div className="flex items-start gap-2.5">
              <span
                className="mt-0.5 size-8 shrink-0 rounded-md"
                style={{ backgroundColor: ref.swatch }}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-ink">
                  {ref.title}
                </div>
                <div className="num text-[13px] text-ink-secondary">
                  {ref.price != null
                    ? fmtMoney(ref.price, scheme.currency)
                    : "No price yet"}
                  {ref.vendor ? ` · ${ref.vendor}` : ""}
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              {ref.url && (
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[13px] text-link"
                >
                  <ExternalLink className="size-3.5" strokeWidth={1.75} />
                  Shop link
                </a>
              )}
              <button
                onClick={() => detachReference(item.id)}
                className="flex items-center gap-1 text-[13px] text-ink-tertiary hover:text-ink"
              >
                <Unlink className="size-3.5" strokeWidth={1.75} />
                Detach
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-[13px] text-ink-tertiary">
              Still a plain box. Attach a pinned reference and it inherits the real
              dimensions and price.
            </p>
            <select
              className={`${inputClass} mt-2`}
              value=""
              onChange={(e) => {
                if (e.target.value) attachReference(item.id, e.target.value);
              }}
            >
              <option value="">Attach from album…</option>
              {scheme.references.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                  {r.price != null ? ` — ${fmtMoney(r.price, scheme.currency)}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Button size="sm" onClick={() => duplicateItem(item.id)} className="flex-1">
          <Copy className="size-3.5" strokeWidth={1.75} />
          Duplicate
        </Button>
        <Button size="sm" variant="danger" onClick={() => removeItem(item.id)}>
          <Trash2 className="size-3.5" strokeWidth={1.75} />
          Delete
        </Button>
      </div>
    </aside>
  );
}
