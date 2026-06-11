# Slotwise — demand-aware conference agenda builder

Multi-track event agendas are built in spreadsheets, blind to the preference data that
registration already captured. Result: the two most popular talks clash, a 289-person
session gets an 80-seat room, and attendees discover it on event day.

**Slotwise** lets organisers drag sessions on a scheduling board and watch attendee
clashes and room overflows resolve **live** — 1,200 attendee preference sets re-scored
on every drop, one animation frame per drag.

---

## Setup (3 commands)

```bash
npm ci
# Activate your Kendo license (free trial at telerik.com → npx kendo-ui-license activate)
npm run dev
```

The app loads with a deliberately broken agenda (**729 attendees impacted, 3 overflows**).
Run `npm run verify-demo` to confirm the exact demo drag path.

---

## The demo arc

| Step | Action | Impacted | Seats short | Overflows |
|------|--------|----------|-------------|-----------|
| Start | Broken import | **729** | 366 | 3 |
| Drag 1 | Fine-Tuning → Main Hall @ 10:00 | 574 | 293 | 2 |
| Drag 2 | LLMs in Production → Main Hall @ 9:00 | 496 | 114 | 1 |
| Drag 3 | React Server Components → Main Hall @ 13:00 | **186** | **0** | **0** |

Three drags. 543 fewer impacted attendees. Zero overflows.

---

## How it works

**The broken-pipe insight:** registration systems capture rich preference data (which
sessions attendees want), but scheduling tools ignore it entirely. Slotwise closes that
loop:

1. **Import** attendee preferences at startup (1,200 attendees × 3 picks each, from a
   deterministic synthetic dataset that mimics a real Eventbrite/Sessionize export).
2. **Score** the agenda: for each attendee, count how many preferred sessions clash
   (same time slot). Count overflow: expected turnout vs room capacity.
3. **Re-score on every drag** — `computeStats` is a pure function (`useMemo` dep on
   `assignments`). On n = 1,200 attendees with 3 prefs each, one pass through is ≈ 3ms.
   The hero counter animates while you drag.

The engine is exact counting (Maps, O(1) lookups), not ML. That's a feature: explainable,
instant, deterministic, trustworthy.

---

## Kendo UI components used

- **Scheduler** — drag-and-drop agenda board with vertical room grouping
- **Grid** — session table with custom status, demand, and clash-partner cells
- **Chart** — utilisation bar chart with interactive tooltips and overflow bands
- **TabStrip** — three-tab layout (Agenda board / Room load / Sessions)
- **Notification** — per-drag toast with before/after diff

---

## What's real vs. simulated

| Thing | Reality |
|---|---|
| Preference data | Synthetic, seeded deterministically (seed 20260718). Clustered to simulate real attendee behaviour. Framed as a registration import — which is exactly the real integration path. |
| Scoring engine | Exact counting, no approximation |
| Drag-and-drop | Live KendoReact Scheduler; falls back to custom HTML5 DnD if needed |
| Backend | None — client-only SPA by design |

---

## Tech stack

- React 18 + TypeScript, Vite
- KendoReact 15.0.0 (same major across all `@progress/kendo-react-*` packages)
- `@progress/kendo-data-query` for Grid sort/filter
- Vitest 2.1.9 — 23 unit tests lock the demo math in CI

---

## Roadmap

- **Auto-suggest fixes** — the engine already scores any candidate move; a greedy swap
  search over unscheduled slots could surface "drag session X here to save 120 people"
- **Live re-scheduling** — re-run after room capacity changes are confirmed on event day
- **Real import** — Eventbrite/Sessionize API integration (same data shape as synthetic set)

---

## Security notes

`npm audit` reports 4 moderate + 1 critical vulnerability in the `esbuild ≤ 0.24.2`
chain (CVE GHSA-67mh-4wv8-2f99). The fix requires Vite 8 which is a breaking change.
These only affect the **dev server** (an attacker on localhost could probe it) — the
production `npm run build` output is static assets with no server. Safe for a demo environment.

No secrets are committed. The Kendo license is activated via `npx kendo-ui-license activate`
which patches `node_modules` in-place; the license file is in `.gitignore`.
