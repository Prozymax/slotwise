// ─────────────────────────────────────────────────────────────
// Slotwise seed data — deterministic (seeded RNG) so the demo
// numbers are IDENTICAL on every machine, every run.
// Framed in the UI as "Imported from Eventbrite".
// ─────────────────────────────────────────────────────────────

// mulberry32 — tiny deterministic PRNG
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const EVENT = { name: "DevConf Lagos 2026", date: new Date(2026, 6, 18) };

export const SLOTS = [
  { label: "9:00", hour: 9 },
  { label: "10:00", hour: 10 },
  { label: "11:00", hour: 11 },
  { label: "13:00", hour: 13 }, // 12:00 = lunch, not schedulable
  { label: "14:00", hour: 14 },
  { label: "15:00", hour: 15 },
  { label: "16:00", hour: 16 },
];

export const ROOMS = [
  { id: "main", name: "Main Hall", capacity: 350, color: "#7c5cff" },
  { id: "beta", name: "Room Beta", capacity: 170, color: "#2aa7a0" },
  { id: "loft", name: "The Loft", capacity: 110, color: "#e8743b" },
];

// 20 sessions, 4 tracks. `pop` = popularity weight for preference sampling.
export const SESSIONS = [
  { id: "s01", title: "LLMs in Production: War Stories", speaker: "Amara Okafor", track: "AI", pop: 10 },
  { id: "s02", title: "Fine-Tuning on a Shoestring", speaker: "Dele Adeyemi", track: "AI", pop: 8 },
  { id: "s03", title: "RAG Beyond the Hype", speaker: "Chiamaka Eze", track: "AI", pop: 6 },
  { id: "s04", title: "Agents That Don't Embarrass You", speaker: "Tunde Bakare", track: "AI", pop: 5 },
  { id: "s05", title: "Prompt Injection: Red Team Live", speaker: "Ngozi Achebe", track: "AI", pop: 3 },
  { id: "s06", title: "React Server Components, Finally Clear", speaker: "Femi Alade", track: "Web", pop: 8 },
  { id: "s07", title: "CSS You Can't Believe Exists", speaker: "Zainab Suleiman", track: "Web", pop: 5 },
  { id: "s08", title: "Edge Rendering on African Networks", speaker: "Kofi Mensah", track: "Web", pop: 6 },
  { id: "s09", title: "Accessibility Is a Feature", speaker: "Ifeoma Nwosu", track: "Web", pop: 2 },
  { id: "s10", title: "TypeScript at 1M Lines", speaker: "Segun Adebayo", track: "Web", pop: 4 },
  { id: "s11", title: "Postgres Is All You Need", speaker: "Hauwa Ibrahim", track: "Data", pop: 7 },
  { id: "s12", title: "Streaming Pipelines Without Tears", speaker: "Emeka Obi", track: "Data", pop: 4 },
  { id: "s13", title: "DuckDB and the Death of the Cluster", speaker: "Funke Akindele", track: "Data", pop: 5 },
  { id: "s14", title: "Data Contracts in the Real World", speaker: "Yusuf Garba", track: "Data", pop: 2 },
  { id: "s15", title: "Dashboards People Actually Read", speaker: "Adaeze Iwu", track: "Data", pop: 3 },
  { id: "s16", title: "From Dev to CTO in 5 Years", speaker: "Bola Tinuke", track: "Career", pop: 8 },
  { id: "s17", title: "Negotiating Your Worth", speaker: "Kemi Oyedepo", track: "Career", pop: 5 },
  { id: "s18", title: "Open Source as a Career Engine", speaker: "Obi Nwankwo", track: "Career", pop: 3 },
  { id: "s19", title: "Burnout-Proof Engineering Teams", speaker: "Sade Balogun", track: "Career", pop: 4 },
  { id: "s20", title: "Side Projects That Print Money", speaker: "Uche Eke", track: "Career", pop: 7 },
];

const TRACKS = ["AI", "Web", "Data", "Career"];
const TRACK_WEIGHTS = { AI: 0.38, Web: 0.26, Data: 0.18, Career: 0.18 };

const FIRST = ["Ada","Bayo","Chidi","Dami","Efe","Folu","Gbenga","Halima","Ike","Jide","Kainene","Lanre","Maro","Nneka","Osa","Pelumi","Quadri","Rume","Sola","Tari","Uzo","Wale","Yemi","Zik"];
const LAST = ["Adeniyi","Balogun","Chukwu","Danjuma","Egbe","Falana","Gowon","Hassan","Igwe","John","Kalu","Lawal","Musa","Nnamdi","Ojo","Peters","Salami","Taiwo","Umeh","Yakubu"];

function weightedPick(rand, items, weightFn) {
  const total = items.reduce((s, it) => s + weightFn(it), 0);
  let roll = rand() * total;
  for (const it of items) { roll -= weightFn(it); if (roll <= 0) return it; }
  return items[items.length - 1];
}

/** 900 attendees; ~72% of each person's picks come from their primary track. */
export function generateAttendees(count = 1200, seed = 20260718) {
  const rand = rng(seed);
  const attendees = [];
  for (let i = 0; i < count; i++) {
    const primary = weightedPick(rand, TRACKS, (t) => TRACK_WEIGHTS[t]);
    const nPrefs = 3; // exactly 3 picks — keeps the clash floor low so fixes show
    const prefs = new Set();
    let guard = 0;
    while (prefs.size < nPrefs && guard++ < 60) {
      const inTrack = rand() < 0.8;
      const pool = SESSIONS.filter((s) => (inTrack ? s.track === primary : s.track !== primary));
      prefs.add(weightedPick(rand, pool, (s) => s.pop).id);
    }
    attendees.push({
      id: "a" + (i + 1),
      name: FIRST[Math.floor(rand() * FIRST.length)] + " " + LAST[Math.floor(rand() * LAST.length)],
      primary,
      prefs: [...prefs],
    });
  }
  return attendees;
}

// ── Layouts ──────────────────────────────────────────────────
// GOOD_ASSIGNMENTS: a verified zero-overflow, zero-same-track-clash layout.
// INITIAL_ASSIGNMENTS = GOOD + three deliberate "sins" (independent swaps):
//   Sin A: s01 (top talk, exp 289) banished to The Loft (110) @16:00 — and clashing with s05
//   Sin B: s02 dragged to 16:00 — head-to-head with s01, AND overflowing Room Beta
//   Sin C: s06 (exp 224) in The Loft @11:00 — overflow + Web-track clash with s10
// The demo = undoing the sins, one drag each. See DEMO_MOVES.
export const GOOD_ASSIGNMENTS = {
  s01: { roomId: "main", slot: 0 }, s11: { roomId: "beta", slot: 0 }, s19: { roomId: "loft", slot: 0 },
  s02: { roomId: "main", slot: 1 }, s20: { roomId: "beta", slot: 1 }, s12: { roomId: "loft", slot: 1 },
  s03: { roomId: "main", slot: 2 }, s10: { roomId: "beta", slot: 2 }, s18: { roomId: "loft", slot: 2 },
  s06: { roomId: "main", slot: 3 }, s04: { roomId: "beta", slot: 3 }, s15: { roomId: "loft", slot: 3 },
  s08: { roomId: "main", slot: 4 }, s17: { roomId: "beta", slot: 4 }, s14: { roomId: "loft", slot: 4 },
  s07: { roomId: "main", slot: 5 }, s13: { roomId: "beta", slot: 5 },
  s16: { roomId: "main", slot: 6 }, s05: { roomId: "beta", slot: 6 }, s09: { roomId: "loft", slot: 6 },
};

export const INITIAL_ASSIGNMENTS = {
  s09: { roomId: "main", slot: 0 }, s11: { roomId: "beta", slot: 0 }, s19: { roomId: "loft", slot: 0 },
  s05: { roomId: "main", slot: 1 }, s20: { roomId: "beta", slot: 1 }, s12: { roomId: "loft", slot: 1 },
  s03: { roomId: "main", slot: 2 }, s10: { roomId: "beta", slot: 2 }, s06: { roomId: "loft", slot: 2 },
  s18: { roomId: "main", slot: 3 }, s04: { roomId: "beta", slot: 3 }, s15: { roomId: "loft", slot: 3 },
  s08: { roomId: "main", slot: 4 }, s17: { roomId: "beta", slot: 4 }, s14: { roomId: "loft", slot: 4 },
  s07: { roomId: "main", slot: 5 }, s13: { roomId: "beta", slot: 5 },
  s16: { roomId: "main", slot: 6 }, s02: { roomId: "beta", slot: 6 }, s01: { roomId: "loft", slot: 6 },
};

/** The rehearsed demo drags, in order. Each is one drag-and-drop (a swap). */
export const DEMO_MOVES = [
  { sessionId: "s02", roomId: "main", slot: 1, say: "Fine-Tuning is head-to-head with our top talk AND overflowing Beta — drag it to Main @ 10:00" },
  { sessionId: "s01", roomId: "main", slot: 0, say: "Our most popular talk is in the smallest room — drag it to Main Hall @ 9:00" },
  { sessionId: "s06", roomId: "main", slot: 3, say: "React Server Components is overflowing The Loft — drag it to Main @ 13:00" },
];
