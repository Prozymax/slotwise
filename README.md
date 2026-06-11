# Slotwise — agendas built on demand, not guesswork

Conference agendas are built in spreadsheets, blind to the demand data that registration
already captured. Slotwise lets organisers drag sessions on a board and watch attendee
clashes and room overflows resolve **live** — 1,200 real preference sets re-scored on every drop.

## Quick start

```bash
npm install
# Activate your Kendo trial license (DO THIS FIRST — unlicensed = watermark banner):
#   1. Sign up free at telerik.com → get trial → grab your license file/key
#   2. npx kendo-ui-license activate   (after placing the key per their docs)
npm run dev
npm run verify-demo   # prints the exact rehearsed drag path + numbers
```

## What's already done (and TESTED — don't rewrite these)
- `src/engine/clash.js` — pure scoring engine. Verified by `scripts/verify_demo.mjs`.
- `src/data/seed.js` — deterministic seed (1,200 attendees, seeded RNG → identical
  numbers on every machine). `INITIAL_ASSIGNMENTS` is GOOD layout + 3 deliberate sins;
  `DEMO_MOVES` undoes them. **Do not "improve" the seed — the demo numbers depend on it.**
- All components, styles, and the fallback board.

## What needs YOUR hours (in order)
1. **`npm install` + license + `npm run dev`** — get it rendering. (~30 min)
2. **SchedulerBoard.tsx** — the only risky file. Kendo Scheduler drag across room
   resources + the `onDataChange` mapping may need API fixes against current Kendo docs.
   **Hard 90-minute budget.** If you blow it: in `App.tsx`, swap the import to
   `BoardFallback` (one line, same props, already styled, works today) and move on.
   Kendo still powers Tabs, Grid, Charts, Notifications — say so in the writeup.
3. **Rehearse** — run `npm run verify-demo`, do the 3 drags in the UI, confirm the
   header collapses 729 → 186 and overflows hit 0.
4. **Record the backup video, write the submission, screenshot everything.**

## Claude Code playbook (paste-ready prompts)
- *"The Kendo Scheduler in src/components/SchedulerBoard.tsx throws [ERROR]. Fix the
  resource grouping / onDataChange mapping against the current @progress/kendo-react-scheduler
  API. Do not change the props it receives or the onMove(sessionId, roomId, slot) contract."*
- *"Dragging across room lanes doesn't change roomId in the updated item. Find the correct
  way to enable cross-resource drag in KendoReact Scheduler DayView with vertical grouping."*
- *"Add a read-only 'Attendee view' tab: pick an attendee from a Kendo DropDownList, show
  their 3 preferred sessions and flag any that overlap."* (stretch goal ONLY if ahead)

## Architecture (30-second version)
Vite + React + TS. No backend, no router, no auth — state is one `useState(assignments)`;
`computeStats` is a pure function re-run via `useMemo` on every drag (1,200 × 3 prefs ≈
instant). Kendo: Scheduler (board), Grid (sessions), Charts (room load), TabStrip,
Notification (move feedback). The "Imported from Eventbrite" badge is the faked integration.

## Honest claims for the writeup
- Preference data is synthetic but **generated, clustered, and deterministic** — framed as
  a registration import, which is exactly the real integration path (Eventbrite/Sessionize APIs).
- The engine is exact counting, not ML. That's a feature: explainable, instant, trustworthy.
- Roadmap slide: auto-suggest fixes (greedy swap search — engine already supports scoring
  any candidate move), live re-scheduling on event day, CFP-vote import.
