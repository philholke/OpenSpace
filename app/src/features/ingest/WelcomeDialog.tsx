"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Calculator,
  Check,
  FileUp,
  Images,
  Loader2,
  Map,
  PencilRuler,
  Ruler,
  ScanSearch,
  Scale,
  X,
} from "lucide-react";
import { Button, Pill } from "@/components/ui";

/**
 * Welcome + ingest, presented over the workspace rather than in front of it.
 * The scheme is already on screen underneath, so the first thing a new user
 * sees is the thing the product makes — the dialog only has to explain it.
 *
 * The digitiser agent is stubbed in this build: dropping a drawing plays the
 * agent's working loop and reveals the demo unit.
 */

/** The four views, in sidebar order — the dialog teaches the nav. */
const CAPABILITIES = [
  {
    icon: Map,
    label: "Plan",
    detail: "Block out zones, drop in furniture, drag it around. True to scale.",
  },
  {
    icon: Box,
    label: "Walkthrough",
    detail: "Stand inside the same layout at eye level and judge how it feels.",
  },
  {
    icon: Images,
    label: "Album",
    detail: "Pin references and shopping links for the things that go in it.",
  },
  {
    icon: Calculator,
    label: "Cost",
    detail: "A running estimate of what the plan adds up to, as it changes.",
  },
] as const;

const STEPS = [
  {
    icon: ScanSearch,
    label: "Reading the drawing",
    detail: "1 page · 2400 × 1697 px · looks like a lease plan",
  },
  {
    icon: Ruler,
    label: "Finding the scale",
    detail: "Two printed dimension strings, cross-checked — measured, high confidence",
  },
  {
    icon: PencilRuler,
    label: "Tracing the boundary",
    detail: "6 corners · 2 columns · 4 openings on the front and rear walls",
  },
  {
    icon: Scale,
    label: "Checking itself",
    detail: "Computed 108.0 m² against stated ~1,190 sq ft — within tolerance",
  },
] as const;

const STEP_MS = 900;

export function WelcomeDialog({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<"intro" | "digitising">("intro");
  const [step, setStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const start = useCallback(() => setPhase("digitising"), []);

  // Move focus into the dialog on open; the workspace behind is inert.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Esc dismisses — you land in the demo scheme either way.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The stubbed agent's working loop, then the workspace is revealed.
  useEffect(() => {
    if (phase !== "digitising") return;
    const t = setTimeout(() => {
      if (step === STEPS.length) onClose();
      else setStep((s) => s + 1);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [phase, step, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-scrim p-4 animate-scrim-in max-md:items-start max-md:p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        tabIndex={-1}
        className="my-auto w-full max-w-[680px] rounded-2xl border border-line bg-base shadow-elevation-3 outline-none animate-dialog-in"
      >
        {/* ── Identity row ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-line-subtle px-6 py-4 max-md:px-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent">
            <div className="size-3.5 rounded-[3px] border-2 border-white/90" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink">OpenSpace</div>
            <div className="text-xs text-ink-tertiary">
              Mission Systems — hackathon build
            </div>
          </div>
          <Pill>Beta</Pill>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 flex size-8 items-center justify-center rounded-lg text-ink-tertiary transition-colors duration-120 hover:bg-hover hover:text-ink"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-6 max-md:px-5">
          <h2
            id="welcome-title"
            className="text-[22px] font-medium leading-tight tracking-[-0.015em] text-ink"
          >
            Turn the drawings of a space into a space
          </h2>
          <p className="mt-2 text-[15px] text-ink-secondary">
            Bring in the floorplan you were handed. Get a true-to-scale unit you can
            shape, stand inside, furnish and cost — in one place.
          </p>

          {/* Height pinned on desktop so swapping to the agent loop doesn't
              resize the dialog under the cursor. */}
          <div className="md:min-h-[336px]">
          {phase === "intro" ? (
            <>
              {/* ── What the four views do ─────────────────────────────── */}
              <div className="mt-5 grid grid-cols-2 gap-2.5 max-md:grid-cols-1">
                {CAPABILITIES.map(({ icon: Icon, label, detail }) => (
                  <div
                    key={label}
                    className="rounded-lg bg-sunken px-3.5 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 shrink-0 text-ink-secondary" strokeWidth={1.75} />
                      <span className="text-[13px] font-medium text-ink">{label}</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-ink-tertiary">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[13px] text-ink-secondary">
                They are one set of decisions, not four tools: the box you place on the
                plan is the reference you pinned and the line in the cost.
              </p>

              {/* ── Ingest ─────────────────────────────────────────────── */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  start();
                }}
                className={`mt-5 flex items-center gap-4 rounded-lg border border-dashed px-4 py-4 transition-colors duration-120 max-md:flex-col max-md:text-center ${
                  dragOver ? "border-accent bg-selected" : "border-line-strong bg-sunken"
                }`}
              >
                <FileUp className="size-6 shrink-0 text-ink-tertiary" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">
                    Drop your drawings here
                  </div>
                  <div className="mt-0.5 text-[13px] text-ink-tertiary">
                    Landlord PDF, lease drawing or survey — PNG, JPG or PDF
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => fileInput.current?.click()}
                >
                  Choose a file
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={() => start()}
                />
              </div>
            </>
          ) : (
            <div className="mt-5" aria-busy={step < STEPS.length} role="status">
              <div className="mb-4 text-sm font-medium text-ink">
                Digitising the drawing
              </div>
              <ol className="flex flex-col gap-4">
                {STEPS.map((s, i) => {
                  const state = i < step ? "done" : i === step ? "active" : "todo";
                  const Icon = s.icon;
                  return (
                    <li key={s.label} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {state === "done" ? (
                          <Check className="size-4 text-success" strokeWidth={2.5} />
                        ) : state === "active" ? (
                          <Loader2 className="size-4 animate-spin text-accent" />
                        ) : (
                          <Icon className="size-4 text-ink-disabled" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className={state === "todo" ? "opacity-40" : ""}>
                        <div className="text-sm text-ink">{s.label}</div>
                        {state !== "todo" && (
                          <div className="mt-0.5 text-[13px] text-ink-tertiary">
                            {s.detail}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 border-t border-line-subtle px-6 py-3.5 max-md:px-5">
          <p className="text-xs text-ink-tertiary">
            Preview build — the digitiser agent returns the demo unit. Every dimension
            it emits carries how it was obtained.
          </p>
          {phase === "intro" && (
            <Button variant="secondary" size="sm" className="shrink-0" onClick={onClose}>
              Explore the demo unit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
