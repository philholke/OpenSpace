# Mission Systems Mini Hackathon — Candidate Projects

**Date:** Friday, 31 July 2026
**Build window:** 09:00 – 17:00 SGT (hard deadline)
**Proposal due:** 09:00 SGT, ideally posted the evening before

## Ground rules that shape scope

- The project must be created on the day. Existing libraries, templates and boilerplates are fine; importing a previous project's code is not.
- A working prototype beats a polished presentation. One complete idea beats five unfinished features.
- No customer production data, no interference with live Mission Systems applications, no credentials or secrets committed.
- Available infrastructure: Vercel (frontend/web), up to 2 Fly.io apps, up to 2 Supabase databases. Any other paid service needs approval first. Reasonable OpenRouter token spend is subsidised.
- Commercial viability is explicitly *not* the goal. Experimentation and learning are.

## Submission deliverable

A single channel post containing: project name, two to three short paragraphs of explanation, the GitHub repository, a live link where applicable, and screenshots, a recording or usage instructions.

---

## 1. GEDCOM → Inferred Life Stories

### Concept

Upload a GEDCOM export of a family tree. The tree gives you a skeleton and nothing more: name, sex, born 1845 in Kolberg (Prussian Pomerania, now Kołobrzeg, Poland), died 1901. That tells you nothing about who the person *was*.

The system supplies the world around the skeleton. What was Kolberg in 1845 — a Baltic port and Prussian garrison town. What did a man of that likely class do there for a living. He turned 21 the year of the Austro-Prussian war and 25 for the Franco-Prussian war, so which of those would plausibly have touched him. Which cholera years and emigration waves passed through. What his children's birth spacing implies about the household.

The output is a readable life story that is honest about being probabilistic — not record retrieval. Platforms that search archives, census returns and parish registers already exist. This is the layer nobody builds: turning sparse structured facts into narrative context.

### Why it is interesting

The genuine technical problem is **epistemic labelling**. Every sentence has to be tagged as one of three things:

- **Fact** — came from the GEDCOM (born 1845 in Kolberg).
- **Inference** — follows from facts plus history (he was of conscription age during the 1870 mobilisation).
- **Context** — true of the time and place, not asserted of the person (most working men in the town were employed in fishing, shipping or the garrison trade).

Without that separation the output is confident fiction, which for family history is actively harmful. With it, the thing becomes trustworthy and the reader can calibrate. That distinction is the project.

### Technical approach

- GEDCOM parsing via an existing library (`read-gedcom` / `parse-gedcom` in JS, `ged4py` in Python).
- Historical grounding by scraping Wikipedia for year pages, place pages and regional history, so context is retrieved rather than recalled from model weights — small-town specifics are exactly where pure recall gets thin and invents.
- Generation per ancestor on demand rather than booking the whole tree up front, to control token cost and latency.
- Structured output with per-claim epistemic tags, rendered with visual distinction in the reader.
- A timeline view overlaying family events against world events, so an ancestor's age lines up visually against 1866, 1870, a cholera outbreak, an emigration wave.

### Scope for the day

1. GEDCOM upload and parse, person list, tree navigation.
2. Wikipedia grounding fetch for a person's place and life years.
3. Story generation with epistemic tagging for a single selected ancestor.
4. Reader UI with fact/inference/context styling.
5. Stretch: timeline overlay, whole-tree book export.

### Risks

- The output may be plausible but not *moving*. This lives entirely in prompt design and is the main thing to iterate on.
- Wikipedia coverage of small towns and villages is thin; needs a tiered fallback to regional and national context.
- Token cost and latency on a large tree — mitigated by generating per person.
- **Privacy:** GEDCOM files contain details of living relatives. Filter living individuals and keep the file out of the repository via `.gitignore`, uploading at runtime only.

### Demo moment

A real ancestor from the presenter's own tree, with the story and the timeline side by side. Personal in a way no dashboard can be.

### Verdict

Lowest execution risk of the three — no external API registration, no data acquisition problem, nothing that can appear at 14:00 and kill the build. The most unusual idea and the best story; the quietest live demo.

---

## 2. Floorplan → Layout & Interior Proposal

### Concept

Upload a floorplan or lease drawing of an empty unit and name a concept or brand. The system researches the brand's design language, infers the operational parameters that follow from it, and proposes a suitable layout. The result is a top-down editable plan plus a simple 3D view where furniture can be added, dragged and deleted, Sims-style.

Aimed at F&B and hospitality operators and real estate planners doing early feasibility on a new outlet — the "how many covers can I even get in here, and what does it look like" question that currently costs a designer a week.

### Why it is interesting

The editor is a known quantity. The uncertain and interesting work is the **layout generation**, and the working hypothesis is that a model will be good at *zoning* and bad at *packing*.

It should correctly reason about intent: back-of-house along the rear wall near the existing plumbing stack, service corridor here, banquettes on the window run, bar anchoring the entry. It will then likely emit furniture coordinates that overlap walls and each other, because LLMs cannot pack rectangles.

So the build is a **hybrid**: the model emits zones and intent as structured JSON, a deterministic packer fills each zone with furniture respecting real clearances (≈900 mm circulation, ≈1400 mm between chair backs), and the editor lets a human fix whatever survives. Whichever way that falls, it is a quotable finding by Monday.

### Technical approach

**Plan ingestion** — three tiers, build the reliable one first:

1. **Trace walls on a canvas** over the uploaded image, with one known dimension to set scale. Roughly half an hour of work, works every time, arguably better UX than magic that misfires.
2. **Vision model** reading the drawing directly and emitting wall polylines plus a scale reference. Attempt as a stretch — a strong demo beat if it lands, no loss if it does not, because tracing already exists.
3. **Hardcoded demo unit** as the emergency floor.

**Brand → design parameters** — the cheap win, and highly legible in a demo. "McDonald's" resolves to roughly 1.1–1.3 m² per cover, fixed or bolted seating, high turnover, counter and kiosk led service, laminate and steel, red and yellow. A chef's-table concept resolves to 2.2+ m² per cover, loose seating, banquette runs, warm timber, low lighting. Showing the inferred parameter set *before* the layout makes the system look like it is reasoning rather than guessing.

**Layout generation** — model emits a zone graph and placement intent as structured JSON; deterministic packer places furniture within zones under clearance constraints; live cover count derived from what is actually placed.

**Rendering** — 2D top-down canvas as the primary product, 3D as an extrusion view with box geometry for furniture. Roblox-grade visuals are fine; nobody is judging the shaders.

### Scope for the day

1. Wall tracing over an uploaded image, with scale calibration.
2. Brand/concept input → inferred design parameter set, displayed.
3. Zone generation from the model, rendered as coloured regions.
4. Deterministic furniture packing within zones, with live cover count.
5. Editor: add, drag, rotate, delete furniture in 2D.
6. Stretch: 3D extrusion view; vision-model plan ingestion.

### Risks

- Layout quality may be poor enough to be unconvincing even after packing. Mitigation: the editor means a human can always rescue the output, so the demo never fully fails.
- Scale calibration errors make everything downstream wrong; needs to be explicit and visible in the UI.
- Time sink risk in furniture assets and 3D polish. Box geometry only, and hold the line on that.
- Must be rebuilt fresh rather than imported from the earlier prototype.

### Demo moment

Paste a floorplan, type a brand name, watch design parameters resolve and a layout appear, drag a banquette, see covers recount live. The most tactile demo of the three and directly on-domain for the audience.

### Verdict

Highest ceiling. Risk is moderate rather than high, because the interactive editor is already proven territory and each ingestion tier degrades gracefully to a simpler one. The novel work must stay on layout intelligence, not on rebuilding the editor or chasing realistic rendering.

---

## 3. Wikipedia → Beautiful E-Book

### Concept

Ask for a topic in natural language — "tell me a story about World War II", or "explain black holes to me". The system selects an appropriate cluster of Wikipedia articles, scrapes them, and generates a well-written, chaptered book with a proper reader UI. Broad prompts produce a narrative history; narrow prompts produce a beginner's guide.

The point is that Wikipedia is comprehensive and almost unreadable end to end. This turns reference material into something a person would actually read for pleasure.

### Why it is interesting

Article *selection* is the underrated part — deciding which subpages belong in a book about WWII, and in what order, is an editorial judgement, not a scrape. Beyond that it is a study in long-form generation: maintaining voice and narrative continuity across chapters without repetition, and progressive rendering so the reader starts reading chapter one while chapter six is still being written.

### Technical approach

- Wikipedia REST API — free, open, generous rate limits, no registration.
- Topic → article cluster selection and chapter outline as a first model pass.
- Per-chapter generation grounded in the fetched article text, streamed.
- Reader UI with real typography, plus EPUB or PDF export.

### Scope for the day

1. Topic input → article cluster selection → chapter outline.
2. Wikipedia fetch and content extraction.
3. Streamed per-chapter generation.
4. Reader UI with chapter navigation.
5. Stretch: EPUB/PDF export, illustrations from Wikimedia Commons.

### Risks

- Reads as the least novel of the three — "AI summarises Wikipedia" undersells it, and that perception is itself a risk in a judged hackathon.
- Token-heavy if a full book is generated in one pass; needs a chapter budget.
- A spinner is not a demo. Progressive streaming is mandatory, not a stretch.

### Verdict

Lowest risk, lowest ceiling. It is also a strict subset of project 1's machinery — source → grounded long-form generation → nice reader. Best held as the bail-out: if either other project is dead in the water by 13:00, this is recoverable in four hours.

---

## Dropped: Singapore Mall Heat Map

Map of Singapore showing every major mall with footfall, traffic and retail/F&B tenant mix.

Dropped because mall footfall is not publicly available at any acceptable price. Delivering it would mean assembling proxies — LTA DataMall station tap-in volumes, OpenStreetMap tenant lists, Google review counts as an activity signal — which is four separate registrations, each with signup friction, for a payoff of dots on a map. It is also the most work-like of the four ideas, which cuts against a brief that explicitly asks for things we would not normally prioritise.

Worth revisiting outside a one-day constraint, where the data plumbing is an investment rather than a cost.

---

## Comparison

| | **1. Life Stories** | **2. Floorplan** | **3. E-Book** |
|---|---|---|---|
| Execution risk | Lowest | Moderate | Low |
| Ceiling | High | Highest | Modest |
| Demo energy | Quiet, personal | Tactile, live | Pleasant |
| External dependencies | Wikipedia only | None | Wikipedia only |
| On-domain for audience | No | Yes | No |
| Novel finding by Monday | Epistemic labelling of generated claims | Whether models can zone but not pack | Editorial article selection |
| Hard failure mode | Output plausible but not moving | Layouts unconvincing | None serious |

## Recommendation

**Project 2**, on the basis that the interactive editor is already proven territory, the live demo is the most tactile of the three, and the zoning-versus-packing question has a real answer worth reporting on Monday.

**Project 1** is the pick if the day is better spent on narrative and model behaviour than on geometry and interaction. It is the more unusual project and the better story, with a quieter demo.

**Project 3** stays in reserve as the bail-out.
