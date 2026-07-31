"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Box,
  Calculator,
  Images,
  Map,
  RefreshCcw,
  Ruler,
  Share2,
} from "lucide-react";
import { Button, Pill } from "@/components/ui";
import { useSchemeStore } from "@/features/scheme/store";
import { StatsBar } from "./StatsBar";
import { PlanEditor } from "@/features/plan/PlanEditor";
import { AlbumView } from "@/features/album/AlbumView";
import { CostView } from "@/features/cost/CostView";

const WalkthroughView = dynamic(
  () => import("@/features/walkthrough/WalkthroughView").then((m) => m.WalkthroughView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-ink-tertiary">
        Preparing the walkthrough…
      </div>
    ),
  },
);

const VIEWS = [
  { key: "plan", label: "Plan", icon: Map },
  { key: "walk", label: "Walkthrough", icon: Box },
  { key: "album", label: "Album", icon: Images },
  { key: "cost", label: "Cost", icon: Calculator },
] as const;

type ViewKey = (typeof VIEWS)[number]["key"];

export function WorkspaceShell() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("view");
  const view: ViewKey = VIEWS.some((v) => v.key === raw) ? (raw as ViewKey) : "plan";

  const scheme = useSchemeStore((s) => s.scheme);
  const resetDemo = useSchemeStore((s) => s.resetDemo);

  const setView = useCallback(
    (v: ViewKey) => router.replace(`/scheme?view=${v}`, { scroll: false }),
    [router],
  );

  return (
    <div className="flex h-dvh bg-sunken">
      {/* ── Side-nav (§7.2) ─────────────────────────────────────────── */}
      <nav className="flex w-[240px] shrink-0 flex-col border-r border-line bg-base max-md:hidden">
        <Link href="/" className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent">
            <div className="size-3.5 rounded-[3px] border-2 border-white/90" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">OpenSpace</div>
            <div className="text-xs text-ink-tertiary">Workspace</div>
          </div>
          <Pill>Beta</Pill>
        </Link>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="px-2 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-tertiary">
            Scheme
          </div>
          {VIEWS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-120 ${
                view === key
                  ? "bg-selected font-medium text-ink"
                  : "text-ink-secondary hover:bg-hover"
              }`}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {label}
            </button>
          ))}

          <div className="px-2 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-tertiary">
            Unit
          </div>
          <div className="rounded-lg bg-sunken px-3 py-2.5">
            <div className="text-[13px] font-medium text-ink">{scheme.unit.name}</div>
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-tertiary">
              <Ruler className="mt-0.5 size-3 shrink-0" strokeWidth={1.75} />
              <span>
                Scale {scheme.unit.scale.source} — {scheme.unit.scale.method}
              </span>
            </div>
          </div>
        </div>

        {/* User row */}
        <div className="flex items-center gap-2.5 border-t border-line px-4 py-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-accent text-[13px] font-medium text-inverse">
            P
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-ink">Phil</div>
            <a href="mailto:phil@ebbflowgroup.com" className="text-xs text-link">
              phil@ebbflowgroup.com
            </a>
          </div>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-base px-6 pb-4 pt-5 max-md:px-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-medium tracking-[-0.015em] text-ink">
              {scheme.name}
            </h1>
            <p className="mt-0.5 text-[13px] text-ink-tertiary">
              The plan, the album and the cost are one set of decisions.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetDemo} title="Reset the demo scheme">
              <RefreshCcw className="size-3.5" strokeWidth={1.75} />
              Reset
            </Button>
            <Button variant="secondary" size="sm">
              <Share2 className="size-3.5" strokeWidth={1.75} />
              Share scheme
            </Button>
          </div>
        </header>

        <StatsBar />

        {/* Mobile view switcher */}
        <div className="border-b border-line bg-base px-4 py-2 md:hidden">
          <div className="flex gap-1 overflow-x-auto">
            {VIEWS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] ${
                  view === key
                    ? "bg-accent font-medium text-inverse"
                    : "text-ink-secondary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <main className="min-h-0 flex-1">
          {view === "plan" && <PlanEditor />}
          {view === "walk" && <WalkthroughView />}
          {view === "album" && <AlbumView />}
          {view === "cost" && <CostView />}
        </main>
      </div>
    </div>
  );
}
