// ─────────────────────────────────────────────────────────────
// Slotwise clash engine — pure functions, no framework imports.
// assignments: { [sessionId]: { roomId, slot } }  (slot = index into SLOTS)
// Verified by scripts/test_engine.mjs and scripts/find_demo_sequence.mjs
// ─────────────────────────────────────────────────────────────

/** Share of interested attendees who actually show up (free-event no-show reality). */
export const ATTENDANCE_RATE = 0.8;

/**
 * Demand per session = number of attendees who picked it.
 * @param {Array<{id:string, prefs:string[]}>} attendees
 * @returns {Map<string, number>}
 */
export function computeDemand(attendees) {
  const demand = new Map();
  for (const a of attendees) {
    for (const sid of a.prefs) demand.set(sid, (demand.get(sid) || 0) + 1);
  }
  return demand;
}

/**
 * Full stats for an agenda layout. This runs on every drag — keep it pure & fast.
 * @param {Object} assignments  sessionId -> {roomId, slot}
 * @param {Object} data { sessions, rooms, attendees, slots }
 */
export function computeStats(assignments, data) {
  const { sessions, rooms, attendees, slots } = data;
  const demand = data.demand || computeDemand(attendees);
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  // 1) Attendee clashes: an attendee with ≥2 preferred sessions in the same slot.
  let clashedAttendees = 0;
  let totalMissedSessions = 0; // prefs they cannot attend due to overlap
  const clashPairs = new Map(); // "sidA|sidB" -> count (for "worst clash" insights)
  for (const a of attendees) {
    const bySlot = new Map();
    for (const sid of a.prefs) {
      const asg = assignments[sid];
      if (!asg) continue;
      if (!bySlot.has(asg.slot)) bySlot.set(asg.slot, []);
      bySlot.get(asg.slot).push(sid);
    }
    let missed = 0;
    let hasClash = false;
    for (const sids of bySlot.values()) {
      if (sids.length > 1) {
        hasClash = true;
        missed += sids.length - 1;
        const sorted = [...sids].sort();
        for (let i = 0; i < sorted.length; i++)
          for (let j = i + 1; j < sorted.length; j++) {
            const key = sorted[i] + "|" + sorted[j];
            clashPairs.set(key, (clashPairs.get(key) || 0) + 1);
          }
      }
    }
    if (hasClash) clashedAttendees++;
    totalMissedSessions += missed;
  }

  // 2) Room overflow: expected attendance vs capacity, per placed session.
  const overflows = [];
  let seatsShort = 0;
  for (const s of sessions) {
    const asg = assignments[s.id];
    if (!asg) continue;
    const cap = roomById.get(asg.roomId)?.capacity ?? 0;
    const expected = Math.round((demand.get(s.id) || 0) * ATTENDANCE_RATE);
    if (expected > cap) {
      overflows.push({ sessionId: s.id, title: s.title, roomId: asg.roomId, slot: asg.slot, expected, capacity: cap, over: expected - cap });
      seatsShort += expected - cap;
    }
  }

  // 3) Speaker double-booking: same speaker, same slot.
  const speakerSlots = new Map();
  const speakerConflicts = [];
  for (const s of sessions) {
    const asg = assignments[s.id];
    if (!asg) continue;
    const key = s.speaker + "@" + asg.slot;
    if (speakerSlots.has(key)) speakerConflicts.push({ speaker: s.speaker, slot: asg.slot, sessions: [speakerSlots.get(key), s.id] });
    else speakerSlots.set(key, s.id);
  }

  // 4) Worst clash pair (the thing to drag first).
  let worstPair = null;
  for (const [key, count] of clashPairs) {
    if (!worstPair || count > worstPair.count) {
      const [a, b] = key.split("|");
      worstPair = { a, b, count, titles: [sessionById.get(a)?.title, sessionById.get(b)?.title] };
    }
  }

  // 5) Per-cell utilization for the chart: rows = rooms, cols = slots.
  const utilization = rooms.map((r) =>
    slots.map((_, slotIdx) => {
      const sid = Object.keys(assignments).find((id) => assignments[id].roomId === r.id && assignments[id].slot === slotIdx);
      if (!sid) return { sessionId: null, expected: 0, capacity: r.capacity, pct: 0 };
      const expected = Math.round((demand.get(sid) || 0) * ATTENDANCE_RATE);
      return { sessionId: sid, expected, capacity: r.capacity, pct: Math.round((expected / r.capacity) * 100) };
    })
  );

  // Headline score: people affected (clashed) + a weighted composite for ranking moves.
  const affected = clashedAttendees;
  const composite = totalMissedSessions * 2 + seatsShort + speakerConflicts.length * 500;

  return { affected, clashedAttendees, totalMissedSessions, overflows, seatsShort, speakerConflicts, worstPair, utilization, composite, demand };
}

/**
 * Apply a move: place session in (roomId, slot). If occupied, swap occupant into
 * the session's old cell. Returns a NEW assignments object (immutability for React).
 */
export function applyMove(assignments, sessionId, roomId, slot) {
  const next = { ...assignments };
  const from = next[sessionId];
  const occupantId = Object.keys(next).find((id) => id !== sessionId && next[id].roomId === roomId && next[id].slot === slot);
  next[sessionId] = { roomId, slot };
  if (occupantId) next[occupantId] = from ? { ...from } : undefined;
  return next;
}
