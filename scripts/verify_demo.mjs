// Verifies the EXACT rehearsed demo path. Run: node scripts/verify_demo.mjs
import { computeStats, applyMove, computeDemand } from "../src/engine/clash.js";
import { SESSIONS, ROOMS, SLOTS, INITIAL_ASSIGNMENTS, GOOD_ASSIGNMENTS, DEMO_MOVES, generateAttendees } from "../src/data/seed.js";

const attendees = generateAttendees();
const data = { sessions: SESSIONS, rooms: ROOMS, attendees, slots: SLOTS, demand: computeDemand(attendees) };
const fmt = (st) => `affected=${st.affected}/${attendees.length}  missed=${st.totalMissedSessions}  seatsShort=${st.seatsShort}  overflows=${st.overflows.length}  speakerConflicts=${st.speakerConflicts.length}`;

let cur = INITIAL_ASSIGNMENTS;
let st = computeStats(cur, data);
console.log("START   ", fmt(st));
console.log("  worst clash:", st.worstPair?.titles?.join(" ⚡ "), `(${st.worstPair?.count} ppl)`);
for (const o of st.overflows) console.log(`  overflow: ${o.title} — ${o.expected}/${o.capacity} (+${o.over})`);

const path = [st.affected + st.seatsShort];
DEMO_MOVES.forEach((m, i) => {
  cur = applyMove(cur, m.sessionId, m.roomId, m.slot);
  st = computeStats(cur, data);
  console.log(`DRAG ${i + 1}  `, fmt(st), ` ← ${m.say}`);
  path.push(st.affected + st.seatsShort);
});

const good = computeStats(GOOD_ASSIGNMENTS, data);
console.log("GOOD ref", fmt(good));
const matchesGood = JSON.stringify(Object.entries(cur).sort()) === JSON.stringify(Object.entries(GOOD_ASSIGNMENTS).sort());
const monotonic = path.every((v, i) => i === 0 || v < path[i - 1]);
console.log(matchesGood ? "✅ Demo ends exactly at the GOOD layout" : "❌ Demo does NOT end at GOOD layout");
console.log(monotonic ? "✅ Strictly improving on every drag — SAFE to rehearse" : "❌ A drag does not improve — retune!");
