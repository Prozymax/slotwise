// Finds the exact 3-drag sequence for the demo: each move must cut the
// affected-attendee count, and the path must end near-green.
// Run: node scripts/find_demo_sequence.mjs
import { computeStats, applyMove, computeDemand } from "../src/engine/clash.js";
import { SESSIONS, ROOMS, SLOTS, INITIAL_ASSIGNMENTS, generateAttendees } from "../src/data/seed.js";

const attendees = generateAttendees();
const data = { sessions: SESSIONS, rooms: ROOMS, attendees, slots: SLOTS, demand: computeDemand(attendees) };
const sessionById = new Map(SESSIONS.map((s) => [s.id, s]));
const roomById = new Map(ROOMS.map((r) => [r.id, r]));

const start = computeStats(INITIAL_ASSIGNMENTS, data);
console.log("── INITIAL STATE ──");
console.log("Affected attendees:", start.affected, "/", attendees.length);
console.log("Missed sessions:", start.totalMissedSessions, "| Seats short:", start.seatsShort, "| Overflows:", start.overflows.length);
console.log("Worst clash:", start.worstPair?.titles?.join("  ⚡  "), `(${start.worstPair?.count} attendees)`);
for (const o of start.overflows) console.log(`  overflow: "${o.title}" in ${roomById.get(o.roomId).name} — ${o.expected} expected / ${o.capacity} seats`);

// Greedy beam search over single-session moves (to any cell, swaps allowed).
function bestMoves(assignments, topN = 5) {
  const results = [];
  for (const s of SESSIONS) {
    for (const r of ROOMS) {
      for (let slot = 0; slot < SLOTS.length; slot++) {
        const cur = assignments[s.id];
        if (cur && cur.roomId === r.id && cur.slot === slot) continue;
        const next = applyMove(assignments, s.id, r.id, slot);
        const st = computeStats(next, data);
        results.push({ move: { sessionId: s.id, roomId: r.id, slot }, st, next });
      }
    }
  }
  results.sort((a, b) => (a.st.affected - b.st.affected) || (a.st.composite - b.st.composite));
  return results.slice(0, topN);
}

console.log("\n── SEARCHING FOR THE 3-DRAG DEMO PATH ──");
let cur = INITIAL_ASSIGNMENTS;
let curStats = start;
const script = [];
for (let step = 1; step <= 3; step++) {
  const [best] = bestMoves(cur);
  const s = sessionById.get(best.move.sessionId);
  const occupant = Object.keys(cur).find((id) => id !== s.id && cur[id].roomId === best.move.roomId && cur[id].slot === best.move.slot);
  script.push({
    step,
    drag: `"${s.title}" → ${roomById.get(best.move.roomId).name} @ ${SLOTS[best.move.slot].label}` + (occupant ? `  (swaps with "${sessionById.get(occupant).title}")` : "  (empty cell)"),
    before: curStats.affected,
    after: best.st.affected,
    overflowsAfter: best.st.overflows.length,
  });
  cur = best.next;
  curStats = best.st;
}

for (const s of script) console.log(`DRAG ${s.step}: ${s.drag}\n   affected ${s.before} → ${s.after}   (overflows now: ${s.overflowsAfter})`);
console.log("\n── FINAL STATE ──");
console.log("Affected:", curStats.affected, "| Missed:", curStats.totalMissedSessions, "| Seats short:", curStats.seatsShort, "| Overflows:", curStats.overflows.length);
const monotonic = script.every((s) => s.after < s.before);
console.log(monotonic ? "✅ Monotonic decrease — demo path is SAFE to rehearse." : "❌ NOT monotonic — retune seed!");
