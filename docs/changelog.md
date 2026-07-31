# Changelog

Latest updates on top.

## Index

- [2026-07-31 — v1 frontend built, verified and deployed (deployment later torn down)](#2026-07-31--v1-frontend)
- [2026-07-31 — Direction: agentic drawing ingestion](#2026-07-31--direction)
- [2026-07-30 — Planning docs and repo setup](#2026-07-30--planning)

---

## 2026-07-31 — v1 frontend

First fully usable version of the OpenSpace miniapp: frontend design/layout/UI/UX complete, all state in-browser (Supabase and real integrations deliberately skipped for now).

### App scaffold (`app/`)

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4, pnpm.
- Deps: `zustand` (single shared store), `three` + `@react-three/fiber` + `@react-three/drei` (3D), `lucide-react` (icons), `playwright-core` (dev, visual verification via system Chrome).
- Feature-based structure: `src/features/{scheme,ingest,workspace,plan,walkthrough,album,cost}`.

### Domain model — the plan is the source of truth

- `features/scheme/types.ts`: `Scheme` → `Unit` (boundary polygon, openings, columns, ceiling, scale info), `Room`, `PlanItem`, `Reference`. All lengths in mm.
- Every dimension carries a `Provenance` (`measured / derived / inferred / placed`) — the "honest about scale" principle made concrete, and the seam where the real digitiser agent will plug in.
- One zustand store drives all four views; `attachReference()` makes a placed box inherit the reference's real dims + price (late specificity).
- `derive.ts`: shoelace area, covers, cost lines/summary, scheme stats.
- Demo scheme: ~108 m² "42 Amoy Street" F&B unit — notched boundary, 4 openings, 2 columns, 6 zones, 39 items, 7 pinned references (Husk sofa intentionally left unattached for the demo moment).

### Views

- **Landing / ingest** — drag-drop a drawing → stubbed digitiser agent plays its working loop (read → find scale → trace boundary → check itself) with provenance-flavoured narration, then opens the scheme.
- **Plan** — SVG editor: walls with door swings + window runs, columns, tinted zones with live areas, 500 mm grid, pan/zoom/fit. Palette (21 catalog items) → drop, drag with 25 mm snap, R rotate, arrow nudge, Delete, duplicate. Inspector: dims/seats/rotation, provenance pill, attach/detach reference.
- **Walkthrough** — same geometry in 3D: extruded walls with real openings (sills, lintels), columns, box furniture; Orbit mode + first-person Walk (pointer lock, WASD, 1.6 m eye height).
- **Album** — reference cards (price, vendor, dims, shop link, note), "On plan × N" state, attach-to-item, pin new references inline.
- **Cost** — accent hero estimate card + stat cards, cost-lines table grouped off the plan, unpriced items flagged. Stats strip (area · covers · m²/cover · estimate) lives above all views and updates live — the plan/album/cost link demonstrated.

### Mission Systems CI

- Applied from the first component (not retrofitted): Satoshi self-hosted with full weight map, three-tier token architecture (primitives → semantic → component) in `globals.css`, Tailwind theme bound to semantic tokens only.
- Accent budget audited per view; semantic feedback palette; sentence case with nav-eyebrow exception; tabular numerals; focus-visible rings; reduced-motion honored.

### Verification

- Playwright CLI unavailable → verified via headless system Chrome + `playwright-core`, screenshotting all five screens against the styleguide and the Grape Stack reference.
- Confirmed the 3D scene renders (early grey shots were headless screenshot timing, not a bug — confirmed via console logs + delayed capture).
- Fixed from the visual pass: cost table wrapped in its own horizontal scroller, header wraps on mobile. Mobile 390 px: no page overflow (verified `scrollWidth === innerWidth`).

### Deployment

- Deployed to Vercel production and smoke-tested live.
- **Torn down same day:** the CLI's default scope was the wrong account (`crimsonsuntechnologies`), so the project and its deployments/aliases were deleted and the local `.vercel` link removed. Redeploy on the correct account is manual: `pnpm build && vercel deploy --prod` from `app/`.

### Known gaps (deliberate)

- Digitiser agent is stubbed (always returns the demo unit); no Supabase/persistence; no product-page scraping; "Share scheme" is UI-only; code not yet committed to git.

---

## 2026-07-31 — Direction

- Reframed drawing ingestion from one-shot vision extraction to an **agentic measurement loop**: a vision LLM with tools (`view_region`, `measure`, `read_text`, `set_scale`, `check`, `commit_geometry`) that hypothesises, measures, self-checks and corrects — like a person reading a floorplan.
- Scale as a ranked ladder: printed dimension strings → scale bar → stated area → object priors, with the source recorded per dimension (measured / derived / inferred).
- Consequence: manual tracing is no longer a separate fallback tier — the correction UI *is* the editor, used from an empty state.
- Session goal set: build the first fully usable frontend (design/layout/UI/UX first), deploy on Vercel, refine from there.

---

## 2026-07-30 — Planning

- Repo initialised (`ms-hackathon-1`), Apache-2.0 license.
- `docs/hackathon-post.md` — hackathon brief: build and ship something in one day (09:00–17:00 SGT, Fri 31 Jul).
- `docs/archive/hackathon-ideas.md` — three candidate projects compared (GEDCOM life stories, floorplan → layout proposal, Wikipedia e-book); floorplan project recommended.
- `docs/openspace.md` — product vision: drawings in → true-to-scale 2D/3D space → shape, stand inside, furnish, cost. Core idea: the box on the plan *is* the pin in the album *is* the line in the cost.
- `docs/brief.md` — posted proposal: scope for the day is the spine (drawings in, 2D + 3D out, a handful of items proving the plan/album/cost link).
