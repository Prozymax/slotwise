# Slotwise — Submission

**Demand-aware conference agenda building. Drag a session, watch 1,200 attendees' schedules re-score live.**

## Framing the Problem

Every multi-track conference agenda is built the same way: a program chair, a spreadsheet, and a prayer. The scheduling decision — which session goes in which room at which time — is made completely blind, even though the registration system already captured exactly what every attendee wants to see.

The consequences land on event day, when it's too late to fix anything. The two most popular talks end up head-to-head in the same time slot, forcing hundreds of attendees to skip a session they registered to see. A talk that 289 people plan to attend gets assigned to an 80-seat room, and the overflow crowd is turned away at the door. Schedule clashes and room overflows are the #1 and #2 complaints on conference feedback forms — and they directly drive next year's ticket sales and sponsor renewals.

This affects two groups. **Organisers** — especially volunteer and small-budget program chairs running meetups, community conferences, and student events — who can't afford five-figure enterprise event platforms and have no tooling beyond Excel. And **attendees**, who pay with their time and money and then discover their three must-see talks are scheduled against each other.

The root cause is an infrastructure failure: there is a **broken pipe between registration data** (which knows demand) **and the scheduling decision** (which ignores it). Existing tools like Sched and Sessionize treat the agenda as a publishing problem — display it nicely. Nobody treats it as an optimisation problem.

## Idea Explanation

Slotwise closes that broken pipe. It's a demand-aware agenda builder: the organiser imports registration data, then drags session cards across a board of rooms and time slots. Every single drop instantly re-scores the entire agenda against all 1,200 attendee preference records — schedule clashes, room overflows, and speaker double-bookings recalculate live, in under 16 milliseconds.

The hero metric is one number: **attendees impacted by this layout**. In the demo, the imported spreadsheet-built agenda scores **729 impacted attendees**, 366 seats short, and 3 rooms over capacity. Three drags later — each one guided by the live warnings the app surfaces — the score collapses to **186 impacted**, 0 seats short, 0 overflows. Same sessions, same speakers, same rooms. **543 more people get the conference they registered for**, purely from better placement.

Slotwise also includes **Journey Mode**: five named delegates whose personal conference day is traced live against the agenda. When you fix a clash on the board, you watch a specific person's conflict disappear from their timeline in real time. The aggregate numbers prove the value; the journeys make it human.

The fix is deliberately not a black box. The engine is **exact counting, not machine learning** — every warning is explainable ("152 attendees want both of these talks"), instant, and trustworthy. The organiser stays in control; the tool makes the invisible visible.

## Implementation

Slotwise is a fully client-side React single-page application — no backend, no database, no auth. That's a deliberate architectural decision, not a shortcut: the entire dataset (20 sessions, 5 rooms, 8 slots, 1,200 attendees × 3 preferences) fits comfortably in memory, and keeping everything in the browser is what makes sub-16ms re-scoring on every drag possible. There are no network round-trips in the interaction loop at all.

The pieces fit together in three layers:

### The Engine

**`src/engine/clash.js`, `journey.js`** is pure, dependency-free JavaScript. `computeStats(assignments, data)` takes the current agenda layout and returns affected-attendee counts, seat shortfalls, overflow lists, clash pairs, and per-room utilization. `applyMove` performs immutable swaps — it never mutates state, which keeps React rendering predictable. Hot-path lookups use prebuilt Maps for O(1) access; attendee-level work is a single O(n) pass. **Measured: under 5ms per drag on the demo dataset.**

### The Data Layer

**`src/data/seed.js`** generates deterministic synthetic data from a seeded PRNG (mulberry32, seed 42) — identical numbers on every machine, every run, with zero runtime randomness. It's framed in the UI as a registration import, which is accurate: it represents exactly what you'd get from feeding an Eventbrite or Sessionize export into the engine. The initial agenda is a verified-good layout with three deliberate scheduling sins applied; the demo is undoing them.

### The UI Layer

React 18 + TypeScript + Vite, with **KendoReact carrying the heavy data-visualization work**:

- **Scheduler (DayView)** — The primary agenda board. Day-view timeline with rooms as vertical resource groups, 9:00 AM - 5:00 PM hourly slots. Full drag-and-drop with `editable={{ drag: true }}`. Custom event styling for track colors, overflow states (`ev-overflow`), and clash indicators (`ev-clash`). The `onDataChange` handler feeds every drag to the pure scoring engine.

- **TabStrip** — Four-view navigation (Agenda board / Room load / Sessions / Journey)

- **Grid** (used twice) — Sortable session breakdown with custom cells for status badges, demand stats, and clash indicators; plus room-by-room demand/utilization tables

- **Chart (Bar)** — Room utilization visualization with custom tooltips showing session details, capacity, and remaining seats

- **Notification** — Toast system that fires on every drag with the before/after delta ("moved session X — 162 fewer clashing attendees, 206 seats recovered")

A **fallback board** (`BoardFallback.tsx`) provides an alternative implementation using custom CSS-Grid calendar (rooms as columns, slots as rows) with native HTML5 drag-and-drop, featuring track-colored cards, capacity fill bars, and animated overflow/clash indicators. Used when deeper Scheduler customization isn't needed.

**State management:** Single React `useState` for assignments; `useMemo` re-runs the engine and all five persona journeys on every assignment change.

### Design System

**Professional light theme** with accessibility-first typography:

- Clean white backgrounds (#FFFFFF) on light gray base (#F8F9FC)
- Strong, readable fonts with bold weights (600-700) throughout
- High-contrast dark text (#1A1D29) for primary content
- Track-colored accents (AI=violet, Web=teal, Data=emerald, Career=amber)
- Status indicators: red for overflows, amber for clashes, green for good states
- Modern card designs with subtle shadows and clean borders
- Room capacity visualizations with color-coded pip indicators

### Quality Gates

**23 Vitest unit tests** cover the engine, including a demo-replay test that asserts the exact final numbers (186 / 0 / 0) so the demo is permanently locked in CI. A separate `verify-demo` script independently proves the drag path is strictly improving at every step. `npm run check` runs tests + verification + production build. Dependencies are exactly pinned, the license key is gitignored, all rendered text goes through React (no dangerouslySetInnerHTML, no eval), and `npm audit` shows zero high/critical issues in direct dependencies.

## Challenges

### The Scheduler Integration Evolution

The journey with KendoReact Scheduler taught me about incremental value delivery. Initially, I built a custom HTML5 drag-and-drop board (`BoardFallback.tsx`) to prove the core engine and get immediate drag-and-drop working. This gave me a working demo while I refined the more sophisticated Scheduler implementation.

The Scheduler integration (`SchedulerBoard.tsx`) required careful configuration: mapping my pure `(sessionId, roomId, slot)` event model to the Scheduler's `onDataChange` handler, configuring room-based resource grouping, customizing event rendering with track colors and status classes, and ensuring every drag fed clean data to my immutable scoring engine.

The **key insight**: I designed both components against an identical `onMove(sessionId, roomId, slot)` contract from day one. This meant the scoring engine, the state management, the notifications, and the Journey Mode recalculations were 100% reusable across both implementations. The "fallback" isn't really a fallback — it's an alternative UI for the same core functionality.

**Lesson learned:** Build the component contract first, then you can iterate on implementations without touching the rest of the system. And ship the simpler version first to prove the value, then upgrade the UX when you have time.

### Making the Demo Mathematically Safe

A live demo where dragging a card might accidentally make the score worse is a disaster waiting to happen. The solution was to **invert the data design**: construct a verified zero-overflow layout first, derive the broken initial agenda by applying three deliberate, independent "sins" (swaps), and make the demo the act of undoing them. A verification script replays the exact rehearsed sequence and asserts strict improvement at every step — so the dramatic collapse from 729 to 186 is provably guaranteed, not hoped for.

### Tuning Synthetic Data to Behave Like Reality

The first data generation produced demand so uniformly high that nothing fit the small rooms and clashes were mathematically unavoidable — the score couldn't collapse no matter what you dragged. Getting a believable demand curve required tuning **popularity skew, track clustering** (80% of each attendee's picks come from their primary track), preference counts, and room capacities together until a clean layout provably existed. It was a real lesson in how much the **shape of data, not just the volume**, determines whether a system can demonstrate its value.

## Accomplishments

The thing I'm proudest of: **every drag is real math, verified end-to-end**. This isn't a mockup with hardcoded numbers — it's a working constraint-visibility engine scoring 1,200 preference records live, with a 23-test suite and an independent verification script that lock the behavior in CI. The full quality gate (`npm run check`) is green, the build is reproducible from a clean clone in three commands, and the demo path is mathematically guaranteed to improve on every step.

I shipped this solo in under 24 hours, and learned a lot doing it:

- How to design a demo as a **provable artifact** rather than a rehearsed hope
- How to build **reusable contracts** that let you swap UI implementations without touching business logic
- How to time-box integration work with **incremental value delivery** — ship simple, then upgrade
- How to make synthetic data **deterministic and honest** at the same time
- How to keep a scoring engine **pure enough** that the UI, the tests, and the verification script all consume the same function with zero divergence

Beyond the engineering, the project validated the core product insight: **when you put demand data next to the scheduling decision, the fixes become obvious**. Nobody needs to be taught what a red 289/80 capacity bar means.

## Next Steps

### Auto-suggest fixes

The engine already scores arbitrary candidate moves, so a greedy swap search ("show me the single drag that helps most") is a small step — turning Slotwise from a visibility tool into a co-pilot.

### Real registration import

Replace the synthetic seed with Eventbrite and Sessionize API integrations — the data contract is already identical (sessions, capacities, per-attendee preferences).

### Live event-day re-scheduling

Re-import updated registration data mid-conference and surface "if you move this 2pm talk to the bigger room now, 140 more people get seats."

### Attendee self-service view

Every registrant gets a personal conflict report — Journey Mode, generalized from 5 personas to all 1,200 attendees.

### Constraint hardening

Speaker availability windows, room equipment requirements, and locked sessions as first-class constraints, moving toward the proper constraint-solver foundation that adjacent industries (university timetabling, shift scheduling) already use.

### Enhanced Scheduler capabilities

Now that the core engine is proven, I can invest in richer Scheduler customizations: time-zone support, multi-day views, recurring session patterns, and visual conflict indicators directly on the timeline.

---

**The long-term thesis:** Whoever owns the agenda sits at the centre of the event's data graph. Slotwise starts with the most painful, most neglected decision in event creation — and fixes it with three drags.
