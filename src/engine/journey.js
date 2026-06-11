const ATTENDANCE_RATE = 0.8;

/**
 * Compute a named persona's conference journey against current assignments.
 * Pure function — re-runs on every drag, same as computeStats.
 */
export function computeJourney(persona, assignments, sessions, slots, demand, rooms) {
  const sessionById = new Map(sessions.map(s => [s.id, s]));
  const roomById    = new Map(rooms.map(r => [r.id, r]));

  // Resolve each preferred session into a rich pick object
  const picks = persona.prefs
    .map(sid => {
      const session = sessionById.get(sid);
      if (!session) return null;
      const asg     = assignments[sid] ?? null;
      const room    = asg ? (roomById.get(asg.roomId) ?? null) : null;
      const reg     = demand.get(sid) || 0;
      const expected = Math.round(reg * ATTENDANCE_RATE);
      return {
        sessionId: sid, session, asg,
        slot: asg != null ? asg.slot : null,
        slotLabel: asg != null ? (slots[asg.slot]?.label ?? "?") : "Unscheduled",
        room, reg, expected,
        isOverflow:  room != null && expected > room.capacity,
        hasConflict: false, // filled below
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.slot == null && b.slot == null) return 0;
      if (a.slot == null) return 1;
      if (b.slot == null) return -1;
      return a.slot - b.slot;
    });

  // Mark conflicts: multiple preferred sessions in the same slot
  const bySlot = new Map();
  for (const p of picks) {
    if (p.slot == null) continue;
    if (!bySlot.has(p.slot)) bySlot.set(p.slot, []);
    bySlot.get(p.slot).push(p);
  }
  const conflictSlots = new Set(
    [...bySlot.entries()].filter(([, g]) => g.length > 1).map(([s]) => s)
  );
  for (const p of picks) p.hasConflict = p.slot != null && conflictSlots.has(p.slot);

  // Fatigue: ≥3 consecutive slot indices without a gap
  const scheduled = picks.filter(p => p.slot != null);
  let fatiguePeak = scheduled.length > 0 ? 1 : 0;
  let streak = 1;
  for (let i = 1; i < scheduled.length; i++) {
    streak = scheduled[i].slot === scheduled[i - 1].slot + 1 ? streak + 1 : 1;
    fatiguePeak = Math.max(fatiguePeak, streak);
  }

  // Networking windows: ≥2 free slots between consecutive attended sessions
  const gaps = [];
  for (let i = 1; i < scheduled.length; i++) {
    const free = scheduled[i].slot - scheduled[i - 1].slot - 1;
    if (free >= 2) {
      gaps.push({ after: scheduled[i - 1], before: scheduled[i], freeSlots: free });
    }
  }

  // Build structured issues list (gaps are informational, not errors)
  const issues = [];
  if (conflictSlots.size > 0) {
    const times = [...conflictSlots].map(s => slots[s]?.label ?? s).join(", ");
    issues.push({
      type: "conflict",
      severity: "error",
      label: "Scheduling Conflict",
      msg: `Two preferred sessions clash at ${times} — can only attend one`,
    });
  }
  for (const p of picks.filter(pk => pk.isOverflow)) {
    issues.push({
      type: "overflow",
      severity: "error",
      label: "Room Overflow Risk",
      msg: `"${p.session.title}" — ${p.expected} expected vs ${p.room?.capacity} seats in ${p.room?.name}`,
    });
  }
  if (fatiguePeak >= 3) {
    issues.push({
      type: "fatigue",
      severity: "warn",
      label: "Session Fatigue",
      msg: `${fatiguePeak} back-to-back sessions with no break to process or connect`,
    });
  }
  for (const g of gaps) {
    issues.push({
      type: "gap",
      severity: "info",
      label: "Networking Window",
      msg: `${g.freeSlots} free slot${g.freeSlots > 1 ? "s" : ""} between ${g.after.slotLabel} and ${g.before.slotLabel} — great time to explore and connect`,
    });
  }

  return { picks, scheduled, conflictSlots, issues, fatiguePeak, gaps };
}
