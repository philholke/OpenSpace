# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OpenSpace turns the drawings of a space into a space you can shape, stand inside and furnish. Read `docs/openspace.md` for the product vision — it is the reference for what belongs in the product and what does not, and its principles ("speed over precision", "honest about scale", "nothing entered twice") are encoded directly in the domain model.

Built as a one-day Mission Systems hackathon project (`docs/brief.md`). `docs/changelog.md` is the running record, latest on top — read the top entry before starting, and add an entry for substantive work.

Repo layout: `app/` is the Next.js application (all code); `docs/` is planning and history. There is no code outside `app/`.

## Commands

All commands run from `app/` and use **pnpm**:

```bash
pnpm install       # node_modules is not checked in — required first
pnpm dev           # Next 16 dev server (Turbopack), http://localhost:3000
pnpm build         # production build; type-checks as part of the build
pnpm lint          # eslint (flat config, eslint-config-next)
```

There is no test suite. `pnpm build` is the type-check gate. Verification is visual: the project has no Playwright test runner, only `playwright-core` as a dev dependency, driven ad hoc against **system Chrome in headless mode** to screenshot views at 1440×900 and 390×844. When checking mobile, assert `document.scrollWidth === window.innerWidth` — page-level horizontal overflow has been a recurring regression.

Known pre-existing lint failures: 4 `react-hooks/immutability` errors in `WalkthroughView.tsx`, from mutating the r3f camera inside `useFrame`. They are expected; don't count them as new breakage.

## Next.js 16

Per `app/AGENTS.md`: **this is not the Next.js in your training data.** APIs, conventions and file structure differ. Read the relevant guide in `node_modules/next/dist/docs/` (available after `pnpm install`) before writing App Router code. Concretely, already bitten by: `searchParams` arrives as a Promise in server pages, and `useSearchParams` requires a `Suspense` boundary above it.

## Architecture

**One store, four views.** `features/scheme/store.ts` is a single zustand store holding the whole `Scheme`. `WorkspaceShell` renders one of four views (`plan` / `walk` / `album` / `cost`) selected by the `?view=` query param, with `StatsBar` above all of them. The point of the product is that these are views of the same decisions, not four tools — moving a banquette on the plan moves the estimate in the header. Preserve that: derive numbers, never store them twice.

**The plan is the source of truth.** `features/scheme/types.ts` is the domain model and worth reading in full first:

- **All lengths are millimetres**, in plan coordinates x → east, y → south (SVG-friendly). The 3D view maps plan `(x, y)` mm → world `(x, 0, y)` metres. Formatting to m/mm happens only at the edge, in `lib/format.ts`.
- Every dimension carries a `Provenance` (`measured | derived | inferred | placed`). This is "honest about scale" made concrete, and it is the seam where the real drawing-ingestion agent will plug in. Anything that sets or changes a dimension must set `dimSource` honestly.
- `attachReference(itemId, refId)` is the product's core move ("late specificity"): a placed box inherits the reference's real dimensions and becomes `measured`. The same entity is the box on the plan, the pin in the album and the line in the cost — keyed by `PlanItem.refId`.

**Derived values live in `derive.ts`** — shoelace area, covers, `costLines` (grouped by `name::refId`), `costSummary`, `schemeStats`. Pure functions over the scheme, called at render time.

**Geometry is shared, not duplicated.** `features/plan/planGeometry.ts` holds wall thickness, opening placement along boundary edges, the categorical colour maps and the 25 mm snap — consumed by both the 2D SVG canvas and the 3D scene, so the two views cannot drift.

**Views:**
- `plan/` — `PlanEditor` = `Palette` + `PlanCanvas` + `Inspector`. `PlanCanvas` is a hand-rolled SVG editor (~460 lines): viewBox pan/zoom/fit, pointer→mm conversion accounting for `preserveAspectRatio`, drag with snap, keyboard rotate/nudge/delete. Wheel zoom needs a non-passive listener.
- `walkthrough/` — three.js via `@react-three/fiber`, loaded with `next/dynamic` + `ssr: false`. Extrudes wall boxes around openings from the same boundary; orbit and pointer-locked first-person walk at 1.6 m eye height.
- `album/`, `cost/` — reference cards and cost table over the same store.
- `ingest/WelcomeDialog.tsx` — opens over the workspace on load; dropping a drawing runs the **real digitiser**: the file goes to `src/app/api/digitise/route.ts` (two `claude-opus-5` vision passes — read + establish scale, then trace geometry in mm), which streams NDJSON progress events back and finishes with a fresh `Scheme`. `ingest/digitise.ts` holds the shared event types and the pure normalisation (grid snap, clockwise winding, projecting model-emitted opening/column centre points onto boundary edges — the model never emits edge indices). The check step is computed in code (shoelace area vs stated area), not asked of the model. Requires `ANTHROPIC_API_KEY` in `app/.env.local`.

The demo scheme (`features/scheme/demo.ts`, ~108 m² F&B unit at 42 Amoy Street) is the app's only data. The Husk sofa reference is deliberately left unattached so the attach-a-reference moment can be demonstrated.

## Styling — Mission Systems CI

Three-tier token architecture in `src/app/globals.css`, and it is load-bearing:

1. **Primitives** (`--c-*`) — the only place hex is allowed.
2. **Semantic aliases** (`--color-text-*`, `--surface-*`, `--border-*`, feedback colours, elevations).
3. **Component tokens**, as needed.

Tailwind v4's `@theme inline` block binds utilities to tier 2 **only**, and `--color-*: initial` wipes the default palette — so `bg-red-500` does not exist. A component must never reach for raw hex; if a colour is missing, add a primitive and a semantic alias rather than inlining it.

Satoshi is self-hosted from `public/fonts/` with a full weight map. Other conventions in force: sentence case (nav eyebrows excepted), tabular numerals via the `.num` class for anything that changes, `:focus-visible` rings, `prefers-reduced-motion` honoured (keyframe utilities must sit above that block), and a deliberate accent budget — the brand green is for the primary action and the accent surface, never for categorical fills (zones and item categories use the muted palette in `planGeometry.ts`).

The `frontend:apply-mission-systems-ci` skill carries the full styleguide; use it when adding UI surfaces.

## Deliberate gaps

Do not treat these as bugs to fix in passing: there is no persistence or Supabase (all state is in-browser and resets on reload — including digitised uploads), no product-page scraping, "Share scheme" is UI-only, and the welcome dialog reopens on every load (it needs a "seen" flag before it is real).

Deployment: previously on Vercel, torn down because the CLI defaulted to the wrong account. Redeploy is manual from `app/`: `pnpm build && vercel deploy --prod` — check the target scope first.
