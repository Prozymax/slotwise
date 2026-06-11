# SLOTWISE — AUTONOMOUS DELIVERY MISSION

You are the sole engineer delivering a hackathon project to showcase-ready state. Work
systematically and autonomously: complete each phase, verify its acceptance criteria, commit,
then move to the next. Do not ask for permission between phases. Do not expand scope.

**Hard deadline: tomorrow 12:00pm. Showcase-ready means: the app runs, the rehearsed demo
works flawlessly, all checks pass, and the repo is clean enough to be judged.**

---

## 1. PROJECT OVERVIEW & GOAL

**Product:** Slotwise — a demand-aware conference agenda builder.
**Problem:** Multi-track event agendas are built in spreadsheets, blind to the preference
data registration already captured. Result: the two most popular talks clash, a 289-person
session gets an 80-seat room, and attendees discover it on event day.
**Solution:** Organisers drag sessions on a scheduling board; every drop instantly re-scores
the agenda against 1,200 attendee preference sets — attendee clashes, room overflows, and
speaker double-bookings update live. The demo arc: a broken agenda scoring **729 attendees
impacted** is fixed in **3 drags** down to **186 impacted, 0 seats short, 0 rooms over capacity**.
**Hackathon constraint:** Must use Kendo UI (KendoReact) prominently — judges are scoring
Kendo usage. Components in play: Scheduler, Grid, Charts, TabStrip, Notification.
**Audience:** Judges watching a 3-minute live demo. Every decision optimises for that demo.

## 2. CURRENT STATE OF THE REPO

Already built and **VERIFIED** (the demo math was tested — `npm run verify-demo` passes):
- `src/engine/clash.js` — pure scoring engine (counting via Maps, immutable applyMove)
- `src/data/seed.js` — deterministic seeded data; `INITIAL_ASSIGNMENTS` = a known-good
  layout + 3 deliberate scheduling sins; `DEMO_MOVES` = the 3 drags that undo them
- `scripts/verify_demo.mjs` — proves the exact demo path is strictly improving
- All React components: `ScoreHeader` (animated hero counter), `SchedulerBoard` (Kendo
  Scheduler), `BoardFallback` (custom HTML5 DnD board, same props), `DemandChart` (Kendo
  Chart), `SessionsGrid` (Kendo Grid), `App.tsx`, `styles.css`
- `README.md`, `DEMO.md` (the demo script with verified numbers)

**Untested against a live Kendo install:** all `.tsx` files. Expect import/API fixes there.

## 3. PROTECTED INVARIANTS — VIOLATING THESE FAILS THE MISSION

1. **Never change the demo numbers.** `src/data/seed.js` values (RNG seed, pops, capacities,
   layouts) and `src/engine/clash.js` scoring semantics are frozen. `npm run verify-demo`
   must print: start 363 affected / 366 seats short / 3 overflows → after 3 drags
   186 / 0 / 0, "✅ Strictly improving". Run it after ANY change to engine or seed. If it
   ever fails, revert immediately.
2. **Bug-fix edits to engine/seed are allowed ONLY if verify-demo still passes identically.**
3. **The `onMove(sessionId, roomId, slot)` contract between App and board components is frozen.**
4. **No new runtime dependencies** beyond package.json without exceptional justification
   (one allowed exception: a small testing devDependency like vitest).
5. **No backend, no database, no auth, no router.** This is a client-only SPA by design.
6. **No blockchain, no LLM calls.** The scoring engine is exact counting — that's a feature.

## 4. PHASES — EXECUTE IN ORDER

### Phase 0 — Environment & licensing (blocker for everything)
- `npm install`. Resolve any peer-dependency conflicts by pinning compatible @progress
  package versions (they release in lockstep — keep all @progress/kendo-react-* on the
  SAME major version).
- Activate the Kendo trial license per current Telerik docs (`npx kendo-ui-license activate`
  or license file). **Acceptance: `npm run dev` renders with NO watermark/license banner.**
- The license key is a secret: ensure it is NOT committed (add to `.gitignore` if it's a
  file; never hardcode it in source).
- Initialize git if not already; first commit = pristine scaffold.

### Phase 1 — Make the app render end-to-end
- Fix any TypeScript/import errors in the `.tsx` files against the installed Kendo versions
  (icon imports, CSS import path for the theme, TabStrip/Notification API drift).
- **Acceptance:** app loads; header shows 729 impacted; all three tabs render without
  console errors; `npm run build` succeeds.

### Phase 2 — The Scheduler board (HARD 90-MINUTE BUDGET — track your time)
- Goal: drag a session card across rooms/slots in the Kendo Scheduler; drop fires
  `onMove`; invalid drops (lunch 12:00, outside 9–17) are rejected and snap back.
- Known sharp edges: vertical resource grouping, cross-group drag updating `roomId`,
  `onDataChange` payload shape, hour snapping. Consult current KendoReact Scheduler docs.
- **Fallback rule (mandatory, not optional):** if at 90 minutes cross-room drag is not
  working reliably, swap the import in `App.tsx` to `BoardFallback`, verify it fully works,
  commit, and DO NOT return to the Scheduler until every later phase is complete. Note the
  swap in the writeup ("Kendo powers Tabs, Grid, Charts, Notifications").
- **Acceptance:** performing the 3 drags from `DEMO.md` in the browser produces exactly
  the numbers in `DEMO.md`, with a toast on each drop, finishing green.

### Phase 3 — Tests & accountability gate
- Add `vitest` (devDependency only). Write unit tests for the engine:
  - `computeDemand` totals; `applyMove` immutability (input object unchanged) and swap
    correctness (move A onto B leaves B in A's old cell)
  - `computeStats` on hand-built micro-fixtures: a known clash counts, a known overflow
    counts, a speaker double-booking counts, the GOOD layout scores 0 overflows
  - A test that replays `DEMO_MOVES` from `INITIAL_ASSIGNMENTS` and asserts the exact
    final numbers (this locks the demo in CI forever)
- Add npm scripts: `"test": "vitest run"`, and a `"check"` script that runs
  test + verify-demo + build. **Acceptance: `npm run check` is fully green.**
- Commit after every passing phase with clear messages. Never commit broken state.

### Phase 4 — Performance & data-handling efficiency
Requirement: every drag must re-score and re-render in **under 16ms** (one frame) — the
"instant feedback" effect IS the demo. The dataset is small, so the rule is: no
accidental inefficiency, not exotic algorithms.
- Profile one drag (console.time around computeStats). It should be <5ms already.
- Keep all hot-path lookups O(1): Maps/Sets, never `Array.find` inside loops over
  attendees. If you find any O(n²) scan over attendees in the hot path, fix it.
- Sorting policy: sorting is only allowed OUTSIDE the per-drag hot path (grid column
  sorts, demand rankings). Use the platform's native `.sort()` / `@progress/kendo-data-query`
  `orderBy` (O(n log n), optimal for comparison sorts) on these tiny arrays — do NOT
  implement custom sorting algorithms; hand-rolled sorts add risk, not speed, at n≤20.
  Precompute-once, read-many: demand is computed once at startup and reused (already done —
  preserve this pattern).
- Memoization: confirm `useMemo`/`useCallback` deps are correct so a drag re-renders only
  what changed. No state updates in render. No setInterval polling anywhere.

### Phase 5 — Secure & clean code practices
- `npm audit` — fix high/critical issues if fixable without breaking Kendo; document any
  that remain in the README.
- No secrets in the repo (license key, tokens). `.gitignore` covers node_modules, dist,
  license files, .env.
- No `dangerouslySetInnerHTML`, no `eval`, no string-built HTML. All rendered text goes
  through React (XSS-safe by default) — session titles/names render as text nodes only.
- No use of `Math.random()` in the data path (determinism is a feature); the seeded RNG
  stays.
- TypeScript: keep `npm run build` clean; add minimal types where they catch real bugs,
  but do NOT refactor working code for style points — stability beats elegance tonight.
- Pin exact dependency versions in package.json once everything works (replace "latest"
  with the resolved versions from the lockfile) so the build is reproducible on judges'
  machines. Commit the lockfile.

### Phase 6 — Showcase polish (only after Phases 0–5 are green)
In strict priority order; stop wherever time runs out:
1. Visual pass: overflowing sessions visibly red, worst-clash pair visibly flagged on the
   board itself (both boards), header severity colors correct at 729 / mid / 186.
2. Empty/edge states: dropping on the lunch column does nothing gracefully; dragging a
   session onto itself is a no-op without a toast.
3. A "Reset to imported agenda" button (restores INITIAL_ASSIGNMENTS) — essential for
   re-running the demo repeatedly at the showcase booth.
4. README finalised: problem, solution, screenshot, setup in ≤3 commands, "How it works"
   (the broken-pipe insight), honest note that registration data is a deterministic
   synthetic import, roadmap (auto-suggest fixes via greedy swap search — engine already
   scores arbitrary candidate moves; live event-day re-scheduling; Eventbrite/Sessionize
   API import).
5. STRETCH ONLY: read-only "Attendee view" tab — Kendo DropDownList to pick an attendee,
   show their 3 picks, flag overlaps. Skip without hesitation if anything above is shaky.

### Phase 7 — Final verification ritual (do not skip)
1. `rm -rf node_modules && npm ci && npm run check` — proves a judge can clone and run it.
2. `npm run dev`, perform the full DEMO.md sequence start to finish twice, confirming the
   exact numbers each time.
3. `npm run build && npm run preview` — production build also demos correctly.
4. Write `SUBMISSION.md`: 100-word pitch, the demo numbers, Kendo components used, what's
   real vs. simulated, tech stack.
5. Final commit + tag `showcase-ready`.

## 5. OPERATING RULES

- **Accountability loop:** after every file change in engine/seed → `npm run verify-demo`.
  After every phase → `npm run check` → commit. If a phase's acceptance criteria can't be
  met, apply its fallback (Phase 2) or cut it (Phase 6) — never let one phase starve the rest.
- **Time discipline:** if any single bug exceeds 45 minutes, write down the simplest
  possible workaround and take it. A working demo with a known wart beats an elegant
  broken app.
- **Scope discipline:** if a feature is not in DEMO.md or this file, it does not exist.
  Do not add settings pages, persistence, multi-event support, export, or dark mode.
- **Honesty:** never claim the synthetic data is live integration; the writeup framing in
  README.md is the approved wording.
- When uncertain about a Kendo API, check the installed package's TypeScript definitions
  in node_modules first — they are the ground truth for the version you actually have.
