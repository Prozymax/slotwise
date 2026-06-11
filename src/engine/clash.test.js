import { describe, it, expect } from "vitest";
import { computeDemand, computeStats, applyMove } from "./clash.js";
import {
  SESSIONS, ROOMS, SLOTS, INITIAL_ASSIGNMENTS, GOOD_ASSIGNMENTS,
  DEMO_MOVES, generateAttendees,
} from "../data/seed.js";

// ─── Mini fixtures ────────────────────────────────────────────
// A, B, C in two rooms and two slots.
// Speaker Alice is shared by sessions A and C (for double-booking tests).
const miniRooms    = [
  { id: "r1", name: "Big Room",   capacity: 100 },
  { id: "r2", name: "Small Room", capacity: 50  },
];
const miniSessions = [
  { id: "A", title: "Session A", speaker: "Alice", track: "Tech" },
  { id: "B", title: "Session B", speaker: "Bob",   track: "Tech" },
  { id: "C", title: "Session C", speaker: "Alice", track: "Web"  }, // same speaker as A
];
const miniSlots    = [{ label: "9:00", hour: 9 }, { label: "10:00", hour: 10 }];

function mkData(attendees) {
  const data = { sessions: miniSessions, rooms: miniRooms, slots: miniSlots, attendees };
  data.demand = computeDemand(attendees);
  return data;
}

// ─── computeDemand ────────────────────────────────────────────
describe("computeDemand", () => {
  it("counts each session correctly across attendees", () => {
    const demand = computeDemand([
      { id: "x1", prefs: ["A", "B"] },
      { id: "x2", prefs: ["A"] },
      { id: "x3", prefs: ["B", "C"] },
    ]);
    expect(demand.get("A")).toBe(2);
    expect(demand.get("B")).toBe(2);
    expect(demand.get("C")).toBe(1);
  });

  it("returns undefined (treated as 0) for a session no one picked", () => {
    const demand = computeDemand([{ id: "x1", prefs: ["A"] }]);
    expect(demand.get("UNKNOWN")).toBeUndefined();
  });

  it("returns an empty Map for no attendees", () => {
    expect(computeDemand([]).size).toBe(0);
  });
});

// ─── applyMove ────────────────────────────────────────────────
describe("applyMove — immutability", () => {
  it("does not mutate the original assignments object", () => {
    const original = { A: { roomId: "r1", slot: 0 } };
    const snapshot = JSON.stringify(original);
    applyMove(original, "A", "r2", 1);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it("does not mutate nested cell objects", () => {
    const original = { A: { roomId: "r1", slot: 0 } };
    const cellRef = original.A;
    applyMove(original, "A", "r2", 1);
    expect(original.A).toBe(cellRef); // same reference, untouched
  });
});

describe("applyMove — move into empty cell", () => {
  it("places the session in the target room and slot", () => {
    const next = applyMove({ A: { roomId: "r1", slot: 0 } }, "A", "r2", 1);
    expect(next.A).toEqual({ roomId: "r2", slot: 1 });
  });
});

describe("applyMove — swap when target is occupied", () => {
  it("moves the session to the target cell", () => {
    const next = applyMove(
      { A: { roomId: "r1", slot: 0 }, B: { roomId: "r2", slot: 1 } },
      "A", "r2", 1,
    );
    expect(next.A).toEqual({ roomId: "r2", slot: 1 });
  });

  it("moves the displaced session into the vacated cell", () => {
    const next = applyMove(
      { A: { roomId: "r1", slot: 0 }, B: { roomId: "r2", slot: 1 } },
      "A", "r2", 1,
    );
    expect(next.B).toEqual({ roomId: "r1", slot: 0 });
  });

  it("leaves both A and B original positions intact in the source object", () => {
    const src = { A: { roomId: "r1", slot: 0 }, B: { roomId: "r2", slot: 1 } };
    applyMove(src, "A", "r2", 1);
    expect(src.A).toEqual({ roomId: "r1", slot: 0 });
    expect(src.B).toEqual({ roomId: "r2", slot: 1 });
  });
});

// ─── computeStats: clash detection ────────────────────────────
describe("computeStats — schedule clashes", () => {
  it("counts one affected attendee when two of their picks clash", () => {
    const data = mkData([{ id: "x1", prefs: ["A", "B"] }]);
    const stats = computeStats(
      { A: { roomId: "r1", slot: 0 }, B: { roomId: "r2", slot: 0 } }, // same slot
      data,
    );
    expect(stats.affected).toBe(1);
  });

  it("counts zero affected when the same picks are in different slots", () => {
    const data = mkData([{ id: "x1", prefs: ["A", "B"] }]);
    const stats = computeStats(
      { A: { roomId: "r1", slot: 0 }, B: { roomId: "r2", slot: 1 } },
      data,
    );
    expect(stats.affected).toBe(0);
  });

  it("counts each clashing attendee only once even with 3-way clash", () => {
    // attendee picks A, B, C; all in slot 0 → still only 1 clashed attendee
    const data = mkData([{ id: "x1", prefs: ["A", "B", "C"] }]);
    const stats = computeStats(
      { A: { roomId: "r1", slot: 0 }, B: { roomId: "r2", slot: 0 }, C: { roomId: "r1", slot: 0 } },
      data,
    );
    expect(stats.affected).toBe(1);
  });
});

// ─── computeStats: room overflow ──────────────────────────────
describe("computeStats — room overflow", () => {
  it("detects overflow when expected attendance exceeds capacity", () => {
    // 100 picks → expected 80 → Small Room cap 50 → 30 seats short
    const data = mkData(
      Array.from({ length: 100 }, (_, i) => ({ id: `x${i}`, prefs: ["A"] })),
    );
    const stats = computeStats({ A: { roomId: "r2", slot: 0 } }, data);
    expect(stats.overflows.length).toBe(1);
    expect(stats.seatsShort).toBe(30);
  });

  it("reports zero overflow when expected fits within capacity", () => {
    // 50 picks → expected 40 → Small Room cap 50 → fits
    const data = mkData(
      Array.from({ length: 50 }, (_, i) => ({ id: `x${i}`, prefs: ["A"] })),
    );
    const stats = computeStats({ A: { roomId: "r2", slot: 0 } }, data);
    expect(stats.overflows.length).toBe(0);
    expect(stats.seatsShort).toBe(0);
  });
});

// ─── computeStats: speaker double-booking ─────────────────────
describe("computeStats — speaker conflicts", () => {
  it("flags when the same speaker is in two sessions at the same slot", () => {
    const data = mkData([]);
    const stats = computeStats(
      { A: { roomId: "r1", slot: 0 }, C: { roomId: "r2", slot: 0 } }, // Alice in both
      data,
    );
    expect(stats.speakerConflicts.length).toBe(1);
  });

  it("no conflict when the same speaker is in different slots", () => {
    const data = mkData([]);
    const stats = computeStats(
      { A: { roomId: "r1", slot: 0 }, C: { roomId: "r2", slot: 1 } },
      data,
    );
    expect(stats.speakerConflicts.length).toBe(0);
  });
});

// ─── computeStats: GOOD_ASSIGNMENTS baseline ──────────────────
describe("computeStats — GOOD_ASSIGNMENTS", () => {
  const attendees = generateAttendees();
  const DATA = {
    sessions: SESSIONS, rooms: ROOMS, slots: SLOTS, attendees,
    demand: computeDemand(attendees),
  };

  it("scores zero overflows on the verified good layout", () => {
    const stats = computeStats(GOOD_ASSIGNMENTS, DATA);
    expect(stats.overflows.length).toBe(0);
  });

  it("scores zero seats short on the verified good layout", () => {
    const stats = computeStats(GOOD_ASSIGNMENTS, DATA);
    expect(stats.seatsShort).toBe(0);
  });

  it("scores zero speaker conflicts on the verified good layout", () => {
    const stats = computeStats(GOOD_ASSIGNMENTS, DATA);
    expect(stats.speakerConflicts.length).toBe(0);
  });
});

// ─── Demo replay — locks the rehearsed arc in CI forever ──────
describe("DEMO_MOVES replay", () => {
  const attendees = generateAttendees();
  const DATA = {
    sessions: SESSIONS, rooms: ROOMS, slots: SLOTS, attendees,
    demand: computeDemand(attendees),
  };

  it("initial layout matches the known broken state: 363 affected, 366 seats short, 3 overflows", () => {
    const stats = computeStats(INITIAL_ASSIGNMENTS, DATA);
    expect(stats.affected).toBe(363);
    expect(stats.seatsShort).toBe(366);
    expect(stats.overflows.length).toBe(3);
  });

  it("each of the 3 demo moves strictly reduces the combined impact score", () => {
    let asgn = INITIAL_ASSIGNMENTS;
    let prev = computeStats(asgn, DATA);
    for (const move of DEMO_MOVES) {
      asgn = applyMove(asgn, move.sessionId, move.roomId, move.slot);
      const next = computeStats(asgn, DATA);
      expect(next.affected + next.seatsShort).toBeLessThan(prev.affected + prev.seatsShort);
      prev = next;
    }
  });

  it("final layout after all 3 drags: 186 affected, 0 seats short, 0 overflows", () => {
    let asgn = INITIAL_ASSIGNMENTS;
    for (const move of DEMO_MOVES) asgn = applyMove(asgn, move.sessionId, move.roomId, move.slot);
    const stats = computeStats(asgn, DATA);
    expect(stats.affected).toBe(186);
    expect(stats.seatsShort).toBe(0);
    expect(stats.overflows.length).toBe(0);
  });

  it("final layout is identical to GOOD_ASSIGNMENTS", () => {
    let asgn = INITIAL_ASSIGNMENTS;
    for (const move of DEMO_MOVES) asgn = applyMove(asgn, move.sessionId, move.roomId, move.slot);
    // Compare sorted entries so insertion order doesn't matter
    const got  = JSON.stringify(Object.entries(asgn).sort());
    const want = JSON.stringify(Object.entries(GOOD_ASSIGNMENTS).sort());
    expect(got).toBe(want);
  });
});
