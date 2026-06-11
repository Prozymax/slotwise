# Slotwise — Submission

## 100-word pitch

Conference agendas are built blind. Organisers use spreadsheets; the preference data
that registration already captured sits unused. Slotwise changes that: drag a session
to a new room or time slot and watch 1,200 attendee preference sets re-score in one
animation frame. The demo opens with a broken agenda — 729 people impacted, three sessions
overflowing their rooms. Three drags later: 186 impacted, zero overflows, zero seats short.
The engine is exact counting, not ML — explainable, instant, deterministic. Built with
KendoReact Scheduler, Grid, Charts, TabStrip, and Notifications powering the entire UI.

---

## Demo numbers (verified by CI)

| State | Attendees impacted | Seats short | Overflows |
|---|---|---|---|
| Start (broken import) | **729** | 366 | 3 |
| After drag 1 | 574 | 293 | 2 |
| After drag 2 | 496 | 114 | 1 |
| After drag 3 (final) | **186** | **0** | **0** |

Run `npm run verify-demo` to reproduce deterministically.

---

## Kendo UI components

| Component | Where used |
|---|---|
| **Scheduler** | Drag-and-drop agenda board (DayView, vertical room grouping) |
| **Grid** | Sessions table with custom status/demand/clash cells |
| **Chart** | Room utilisation bar chart with overflow plot band |
| **TabStrip** | Three-tab layout |
| **Notification** | Per-drag toast with before/after score diff |

---

## What's real vs. simulated

- **Preference data**: Deterministic synthetic dataset (1,200 attendees × 3 picks each,
  seeded RNG). Represents a registration import — the real integration path is
  Eventbrite/Sessionize export in the same shape.
- **Scoring engine**: Exact counting (Maps, O(1) lookups). Pure function, no approximation.
- **Drag-and-drop**: Live KendoReact Scheduler cross-room drag.
- **Backend**: None. Client-only SPA.

---

## Tech stack

React 18 · TypeScript · Vite 5 · KendoReact 15.0.0 · Vitest 2.1.9

---

## How to run

```bash
npm ci
# Activate Kendo license: npx kendo-ui-license activate
npm run dev          # localhost:5173
npm run check        # 23 tests + demo verify + build
npm run build && npm run preview   # production build
```
