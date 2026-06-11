import { useMemo, useState } from "react";
import RoomCapacityPanel from "./RoomCapacityPanel";

export default function BoardFallback({ assignments, stats, data, onMove }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hover, setHover]   = useState<string | null>(null);

  const overflowIds = useMemo(
    () => new Set(stats.overflows.map((o) => o.sessionId)),
    [stats]
  );

  // Build per-session clash-partner lookup from the clashPairs map
  const clashPartners = useMemo(() => {
    const map = new Map<string, { partnerId: string; partnerTitle: string; count: number }[]>();
    if (!stats.clashPairs) return map;
    const sessionById = new Map<string, { id: string; title: string }>(
      data.sessions.map((s: { id: string; title: string }) => [s.id, s])
    );
    for (const [key, count] of stats.clashPairs as Map<string, number>) {
      const [a, b] = key.split("|");
      const titleA = sessionById.get(a)?.title ?? a;
      const titleB = sessionById.get(b)?.title ?? b;
      if (!map.has(a)) map.set(a, []);
      if (!map.has(b)) map.set(b, []);
      map.get(a)!.push({ partnerId: b, partnerTitle: titleB, count });
      map.get(b)!.push({ partnerId: a, partnerTitle: titleA, count });
    }
    for (const [, v] of map) v.sort((x, y) => y.count - x.count);
    return map;
  }, [stats.clashPairs, data.sessions]);

  const cellSession = (roomId: string, slot: number) =>
    data.sessions.find(
      (s) => assignments[s.id]?.roomId === roomId && assignments[s.id]?.slot === slot
    );

  return (
    <div className="fb-board">
      <RoomCapacityPanel
        rooms={data.rooms}
        slots={data.slots}
        utilization={stats.utilization}
      />

      <div
        className="fb-grid"
        style={{ gridTemplateColumns: `150px repeat(${data.slots.length}, 1fr)` }}
      >
        {/* Column headers */}
        <div className="fb-corner" />
        {data.slots.map((sl) => (
          <div key={sl.label} className="fb-slot-head">{sl.label}</div>
        ))}

        {/* Room rows */}
        {data.rooms.map((room, ri) => (
          <RoomRow
            key={room.id}
            room={room}
            slots={data.slots}
            cellSession={cellSession}
            demand={data.demand}
            overflowIds={overflowIds}
            clashPartners={clashPartners}
            utilization={stats.utilization[ri]}
            dragId={dragId}
            hover={hover}
            setDragId={setDragId}
            setHover={setHover}
            onMove={onMove}
          />
        ))}
      </div>

      <p className="board-hint">
        Drag a session card to any cell — drop on an occupied cell to swap. Scores update instantly.
      </p>
    </div>
  );
}

function RoomRow({
  room, slots, cellSession, demand, overflowIds, clashPartners,
  utilization, dragId, hover, setDragId, setHover, onMove,
}) {
  return (
    <>
      {/* Room header cell */}
      <div className="fb-room-head">
        <div className="fb-room-name">{room.name}</div>
        <div className="fb-room-cap">{room.capacity} seats</div>
      </div>

      {slots.map((_, slot) => {
        const s   = cellSession(room.id, slot);
        const key = `${room.id}:${slot}`;
        const util = utilization[slot]; // { expected, capacity, pct }
        const remaining = room.capacity - (util?.expected ?? 0);

        return (
          <div
            key={key}
            className={`fb-cell ${hover === key ? "fb-cell-hover" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setHover(key); }}
            onDragLeave={() => setHover((h) => (h === key ? null : h))}
            onDrop={(e) => {
              e.preventDefault();
              setHover(null);
              if (dragId) onMove(dragId, room.id, slot);
              setDragId(null);
            }}
          >
            {s ? (
              <SessionCard
                session={s}
                room={room}
                demand={demand}
                overflowIds={overflowIds}
                clashPartners={clashPartners}
                remaining={remaining}
                dragId={dragId}
                setDragId={setDragId}
                setHover={setHover}
              />
            ) : (
              <div className="fb-empty">
                <div className="fb-empty-cap">{room.capacity}</div>
                <div className="fb-empty-label">seats free</div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function SessionCard({ session: s, room, demand, overflowIds, clashPartners, remaining, dragId, setDragId, setHover }) {
  const reg      = demand.get(s.id) || 0;
  const expected = Math.round(reg * 0.8);
  const isOver   = overflowIds.has(s.id);
  const partners = clashPartners.get(s.id) ?? [];
  const topClash = partners[0] ?? null;

  return (
    <div
      className={`fb-card track-${s.track.toLowerCase()} ${isOver ? "fb-overflow" : ""} ${topClash ? "fb-clash" : ""} ${dragId === s.id ? "fb-dragging" : ""}`}
      draggable
      onDragStart={() => setDragId(s.id)}
      onDragEnd={() => { setDragId(null); setHover(null); }}
      title={`${s.title} — ${s.speaker}`}
    >
      <div className="fb-card-title">{s.title}</div>
      <div className="fb-card-meta">{s.speaker}</div>

      {/* Registered / expected counts */}
      <div className="fb-card-demand">
        <span className="fb-reg">{reg.toLocaleString()} registered</span>
        <span className={`fb-exp ${isOver ? "fb-exp-over" : ""}`}>{expected} expected</span>
      </div>

      {/* Remaining-seats bar */}
      <div className={`fb-cap-bar ${isOver ? "fb-cap-bar-over" : ""}`}>
        <div
          className="fb-cap-fill"
          style={{ width: `${Math.min(100, Math.round((expected / room.capacity) * 100))}%` }}
        />
      </div>
      <div className={`fb-rem ${isOver ? "fb-rem-over" : remaining < 20 ? "fb-rem-warn" : "fb-rem-ok"}`}>
        {isOver ? `⛔ ${-remaining} over capacity` : `${remaining} seats remaining`}
      </div>

      {/* Clash partner badge */}
      {topClash && (
        <div className="fb-flag fb-flag-clash">
          ⚡ Clashes with {topClash.partnerTitle.length > 22
            ? topClash.partnerTitle.substring(0, 22) + "…"
            : topClash.partnerTitle} ({topClash.count})
        </div>
      )}
      {isOver && !topClash && <div className="fb-flag">⛔ over capacity</div>}
    </div>
  );
}
