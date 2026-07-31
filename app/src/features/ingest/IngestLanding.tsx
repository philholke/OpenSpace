"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FileUp,
  Loader2,
  PencilRuler,
  Ruler,
  ScanSearch,
  Scale,
} from "lucide-react";
import { Button, Card } from "@/components/ui";

/**
 * Landing + ingest. The digitiser agent is stubbed in this build — dropping a
 * drawing plays the agent's working loop and opens the demo unit.
 */

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

export function IngestLanding() {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "digitising">("idle");
  const [step, setStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const start = useCallback(() => setPhase("digitising"), []);

  useEffect(() => {
    if (phase !== "digitising") return;
    if (step > STEPS.length) return;
    const t = setTimeout(() => {
      if (step === STEPS.length) {
        router.push("/scheme");
      } else {
        setStep((s) => s + 1);
      }
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [phase, step, router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-sunken px-6 py-12">
      <div className="w-full max-w-[560px]">
        {/* Wordmark */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[10px] bg-accent">
            <div className="size-4 rounded-[3px] border-2 border-white/90" aria-hidden />
          </div>
          <div>
            <div className="text-base font-medium text-ink">OpenSpace</div>
            <div className="text-xs text-ink-tertiary">
              Mission Systems — hackathon build
            </div>
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-medium tracking-[-0.015em] text-ink">
          Turn the drawings of a space into a space
        </h1>
        <p className="mb-8 text-base text-ink-secondary">
          Bring in the floorplan you were handed. Get a true-to-scale unit you can
          shape, stand inside, furnish and cost — in one place.
        </p>

        <Card className="p-6">
          {phase === "idle" ? (
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
              className={`flex flex-col items-center gap-4 rounded-lg border px-6 py-12 text-center transition-colors duration-120 ${
                dragOver ? "border-accent bg-selected" : "border-line bg-sunken"
              }`}
            >
              <FileUp className="size-8 text-ink-tertiary" strokeWidth={1.5} />
              <div>
                <div className="text-sm font-medium text-ink">
                  Drop your drawings here
                </div>
                <div className="mt-1 text-[13px] text-ink-tertiary">
                  Landlord PDF, lease drawing or survey — PNG, JPG or PDF
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={() => fileInput.current?.click()}>
                  Choose a file
                </Button>
                <Button variant="ghost" onClick={start}>
                  Open the demo unit
                </Button>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={() => start()}
              />
            </div>
          ) : (
            <div className="px-2 py-4" aria-busy={step < STEPS.length} role="status">
              <div className="mb-5 text-sm font-medium text-ink">
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
        </Card>

        <p className="mt-4 text-center text-xs text-ink-tertiary">
          Preview build — the digitiser agent returns the demo unit. Every dimension
          it emits carries how it was obtained: measured, derived or inferred.
        </p>
      </div>
    </main>
  );
}
