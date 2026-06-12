# Slotwise — Full Project Overview

## The Problem

Multi-track conference agendas are built in spreadsheets, completely blind to the preference data that registration systems already capture. The result: two of the most popular talks clash in the same time slot, a 289-person session gets assigned to an 80-seat room, and both organizers and attendees only discover the problems on event day.

## The Solution

Slotwise is a demand-aware conference agenda builder. Organizers drag session cards across a scheduling board. Every single drop instantly re-scores the entire agenda against 1,200 attendee preference records — attendee clashes, room overflows, and speaker double-bookings all recalculate live, in under 16ms.

---

## The Demo Arc

The app opens in a deliberately broken state (imported from a fictional registration system):

```
┌──────────────────────┬────────────────────┬─────────────┬────────────────┐
│        State         │ Attendees Impacted │ Seats Short │ Room Overflows │
├──────────────────────┼────────────────────┼─────────────┼────────────────┤
│ Imported (broken)    │ 729                │ 366         │ 3              │
├──────────────────────┼────────────────────┼─────────────┼────────────────┤
│ After drag 1         │ 567                │ 160         │ 2              │
├──────────────────────┼────────────────────┼─────────────┼────────────────┤
│ After drag 2         │ 363                │ 0           │ 1              │
├──────────────────────┼────────────────────┼─────────────┼────────────────┤
│ After drag 3 (final) │ 186                │ 0           │ 0              │
└──────────────────────┴────────────────────┴─────────────┴────────────────┘
```

Three drags. 543 fewer attendees impacted. Zero seats short.

**The three corrective moves** (from DEMO.md):
1. Move _Fine-Tuning on a Shoestring_ from Room Beta @16:00 → Main Hall @10:00
2. Move _LLMs in Production_ from The Loft @16:00 → Main Hall @9:00
3. Move _React Server Components_ from The Loft @11:00 → Main Hall @13:00

---

## Architecture

Completely client-side. No backend, no database, no router, no auth. A pure React SPA that runs entirely in the browser.

```
src/
  engine/
    clash.js       — pure scoring engine (no React deps, no side effects)
    journey.js     — persona journey engine
  data/
    seed.js        — deterministic seeded RNG → 1,200 attendees + 20 sessions
    personas.js    — 5 named demo personas
  components/
    ScoreHeader          — animated hero counter + stat tiles
    SchedulerBoard       — KendoReact Scheduler with drag-and-drop
    BoardFallback        — fallback HTML5 drag-and-drop calendar (glass-morphism design)
    DemandChart          — KendoReact Chart + Grid breakdown
    SessionsGrid         — KendoReact Grid with sortable columns
    JourneyView          — two-panel master-detail persona explorer
    RoomCapacityPanel    — room utilization pips strip
  App.tsx          — state + KendoReact TabStrip + Notifications
  styles.css       — full design system (~2,000+ lines, light theme)
scripts/
  verify_demo.mjs  — deterministic proof the demo path is strictly improving
```

**Tech stack:** React 18.3.1, TypeScript 5.9.3, Vite 5.4.21, KendoReact 15.0.0, Vitest 2.1.9

---

## KendoReact Components Used

```
┌──────────────┬────────────────────────────┬──────────────────────────────────────────────────────────────┐
│  Component   │           Where            │                        What it does                          │
├──────────────┼────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ TabStrip     │ App.tsx                    │ Main 4-tab navigation (Agenda/Room Load/Sessions/Journey)    │
├──────────────┼────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ Scheduler    │ SchedulerBoard             │ Primary agenda board - day view with drag-and-drop sessions, │
│ (DayView)    │                            │ grouped by rooms. Handles all event positioning & dragging   │
├──────────────┼────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ Chart (Bar)  │ DemandChart                │ Room utilization visualization with custom tooltip           │
├──────────────┼────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ Grid         │ DemandChart + SessionsGrid │ Sortable, typed breakdowns of demand and session data        │
├──────────────┼────────────────────────────┼──────────────────────────────────────────────────────────────┤
│ Notification │ App.tsx                    │ Toast system — fires on every drag with before/after delta   │
└──────────────┴────────────────────────────┴──────────────────────────────────────────────────────────────┘
```

### Scheduler Implementation Details

**SchedulerBoard.tsx** uses the KendoReact Scheduler component with:
- **DayView**: Single-day timeline view (9:00 AM - 5:00 PM)
- **Resource grouping**: Events grouped vertically by room (Main Hall, Beta, Gamma, Delta, The Loft)
- **Drag-and-drop**: Full drag-and-drop support with `editable={{ drag: true }}`, other operations disabled
- **Custom styling**: Events styled with track colors and special classes for overflows (`ev-overflow`) and clashes (`ev-clash`)
- **Live scoring**: `onDataChange` handler triggers instant re-scoring via `computeStats`

**BoardFallback.tsx** provides a custom HTML5 drag-and-drop implementation as an alternative, featuring:
- Grid-based calendar layout (rooms as columns, time as rows)
- Glass-morphism design with track-colored gradients
- Manual drag-and-drop with swap capability
- Used as fallback if Scheduler customization becomes too complex

---

## The Scoring Engine (clash.js)

Pure function, deterministic, zero dependencies. Runs on every drag via `useMemo`.

```javascript
computeStats(assignments, { sessions, rooms, attendees, slots, demand })
→ { affected, seatsShort, overflows, clashPairs, utilization, ... }
```

- **affected**: Number of unique attendees who have ≥2 preferred sessions in the same slot
- **seatsShort**: Sum of (expected − capacity) for all overflowing sessions, where expected = registrations × 0.8
- **overflows**: Array of sessions where expected attendance exceeds room capacity
- **clashPairs**: Map of "sessionA|sessionB" → attendeeCount — powers the amber clash rings on cards
- **applyMove**: Returns a new assignments object (immutable swap). Never mutates.

**Performance:** Pre-built cellToSession Map (O(1) cell lookups), explicit for-loop in applyMove. All attendee-level work is O(n) with constant factors kept small. Confirmed <5ms per drag on the demo dataset.

---

## Synthetic Data (seed.js)

The data is **deterministic synthetic data** generated from a seeded pseudo-random number generator (mulberry32, seed 42). It is never random at runtime.

- **20 sessions** across 4 tracks: AI, Web, Data, Career
- **5 rooms**: Main Hall (350), Beta (180), Gamma (120), Delta (80), The Loft (60)
- **8 time slots**: 9:00–17:00 (12:00 lunch break cannot be booked)
- **1,200 attendees**, each with 3 preferred sessions (seeded)
- **INITIAL_ASSIGNMENTS**: a layout with 3 deliberate scheduling sins
- **DEMO_MOVES**: the 3 drags that undo them

The data is framed in the UI as "imported from a registration system" — accurate: it represents what you'd get if you fed real registration data into the engine.

---

## Journey Mode

A fourth tab built specifically for the hackathon demo and future pitch.

**What it shows:** 5 named fictional conference-goers (Prosper, Zara, Emeka, Kola, Aisha) with their top 3 session preferences. The engine traces their personal conference day against the live agenda and surfaces:

- **Conflicts** (error): Two preferred sessions in the same slot — can only attend one
- **Overflow risk** (error): Room may not fit expected attendance for their preferred session
- **Fatigue** (warning): 3+ consecutive sessions with no break
- **Networking windows** (info): 2+ free slots between sessions — a positive signal

The master-detail layout shows all 5 personas in the left sidebar (filterable by Conflicts/Clear) with the full timeline and issues in the right panel. Updates live on every drag — when you fix the broken agenda, Prosper and Zara's conflicts disappear in real time.

**Journey engine** (journey.js): Pure function `computeJourney(persona, assignments, sessions, slots, demand, rooms)`. Re-runs all 5 journeys on every drag via `useMemo`.

---

## Visual Design

**Professional light theme** with modern design system:

- **Light background**: #F8F9FC app background with white (#FFFFFF) cards
- **Clean surfaces**: White cards with subtle shadows and light gray borders
- **Track-colored session cards**: 
  - AI = violet (#7C5CFF)
  - Web = teal (#2AA7A0)
  - Data = emerald (#10B981)
  - Career = amber (#F59E0B)
- **Status indicators**:
  - Overflow sessions: Red border highlights (#DC2626)
  - Clash sessions: Amber ring indicators (#F59E0B)
  - Good state: Green accents (#10B981)
- **Typography**: Sora (display/numbers) + Inter (body) from Google Fonts
- **Strong, readable fonts**: All text uses bold weights (600-700) with high-contrast dark colors
- **Accessible**: WCAG-compliant contrast ratios throughout

**Scheduler Board**: KendoReact Scheduler with DayView — rooms as vertical resource groups, time slots from 9:00-17:00. Session events show: title, speaker, registered count, expected count, and visual flags for overflows/clashes.

**Fallback Board**: Alternative calendar layout — rooms as columns, time slots as rows. CSS Grid with clean borders. Session cards display: title, speaker, registered count, expected count, capacity fill bar, remaining seats, and clash-partner badges.

---

## Test Suite (src/engine/clash.test.js)

**23 Vitest tests** covering:
- `computeDemand` totals
- `applyMove` immutability (input object unchanged) and swap correctness
- `computeStats` on hand-built micro-fixtures: known clash, known overflow, known speaker double-booking, known good state
- **Demo replay test**: replays all 3 DEMO_MOVES from INITIAL_ASSIGNMENTS and asserts the exact final numbers (affected=186, seatsShort=0, overflows.length=0) — this permanently locks the demo in CI

**Verification scripts:**
- `npm run verify-demo`: Node script that independently proves the full demo path is strictly improving at every step
- `npm run check`: Runs test + verify-demo + build in sequence. All green.

---

## Security

- ✅ No secrets committed (license key gitignored)
- ✅ No dangerouslySetInnerHTML, no eval, no string-built HTML
- ✅ No Math.random() in data path (determinism is a feature)
- ✅ `npm audit`: 0 high/critical vulnerabilities in direct dependencies (some advisories in transitive Vite dev deps, documented in README)
- ✅ All dependency versions exactly pinned in package.json + lockfile committed

---

## Setup (3 commands)

```bash
npm ci
npx kendo-ui-license activate   # requires telerik-license.txt in project root
npm run dev                      # → http://localhost:5173
```

---

## What's Real vs. Simulated

```
┌───────────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│             Thing             │                                Reality                                 │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ Scoring engine                │ Real — pure math, exact counting                                       │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ Drag-and-drop scheduling      │ Real — KendoReact Scheduler with full DnD support                      │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ Preference conflict detection │ Real                                                                   │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ Room overflow calculation     │ Real                                                                   │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ Live scoring (<16ms)          │ Real — measured and verified                                           │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ Attendee data                 │ Synthetic — deterministic RNG seed 42, framed as "registration import" │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ Persona journeys              │ Fictional named delegates, hand-crafted prefs                          │
├───────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ Live event data               │ Not connected — demo uses static dataset                               │
└───────────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

## Roadmap (post-hackathon)

1. **Auto-suggest fixes** — greedy swap search (the engine already scores arbitrary candidate moves)
2. **Live event-day re-scheduling** — re-import updated registration CSV mid-conference
3. **Eventbrite / Sessionize API import** — replace synthetic seed with real data
4. **Attendee self-service view** — show each registrant their personal conflict report
5. **Export options** — PDF agenda, iCal feeds, integration with event platforms
6. **Multi-day support** — extend beyond single-day conferences
7. **Constraint configuration** — let organizers define custom rules (speaker availability, room setup times, etc.)
